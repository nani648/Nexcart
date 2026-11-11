import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { autoShipOrder, type CreateShipmentInput } from "@/lib/shiprocket";
import { createNotification } from "@/lib/notifications";
import { sendOrderShippedEmail } from "@/lib/email";

/**
 * POST /api/sellers/orders/[id]/ship
 *
 * Body (all optional — defaults are used when not provided):
 * {
 *   pickup_location?: string;   // Shiprocket pickup location name (default: "Primary")
 *   length?: number;            // cm
 *   breadth?: number;           // cm
 *   height?: number;            // cm
 *   weight?: number;            // kg
 *   payment_method?: "Prepaid" | "COD";
 * }
 *
 * What it does:
 *  1. Validates seller owns this order
 *  2. Builds Shiprocket payload from DB data
 *  3. Calls autoShipOrder (create → assign AWB → pickup → label)
 *  4. Saves trackingId, courierName, shippingLabel, deliveryMethod=COURIER
 *     and advances orderStatus to SHIPPED in Prisma
 *  5. Returns full shipment details
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid },
    include: { seller: true },
  });
  if (!user?.seller)
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  // ── Fetch order with all needed relations ─────────────────────────────────
  const order = await db.order.findUnique({
    where: { id: params.id },
    include: {
      address: true,
      items: {
        include: {
          product: {
            select: { name: true, productId: true, price: true },
          },
          seller: {
            include: {
              user: { select: { phone: true, name: true } },
            },
          },
          variant: { select: { name: true, value: true } },
        },
      },
    },
  });

  if (!order)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Only allow seller who has items in this order
  const isSellersOrder = order.items.some(
    (item) => item.sellerId === user.seller!.id
  );
  if (!isSellersOrder)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Guard: already shipped via courier
  if (order.deliveryMethod === "COURIER" && order.trackingId) {
    return NextResponse.json(
      {
        error: "Order already has a Shiprocket shipment",
        trackingId: order.trackingId,
        courierName: order.courierName,
      },
      { status: 409 }
    );
  }

  if (!order.address) {
    return NextResponse.json(
      { error: "Order has no delivery address" },
      { status: 400 }
    );
  }

  // ── Parse request body ────────────────────────────────────────────────────
  let body: {
    pickup_location?: string;
    length?: number;
    breadth?: number;
    height?: number;
    weight?: number;
    payment_method?: "Prepaid" | "COD";
  } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — we use defaults
  }

  const pickup_location = body.pickup_location ?? "Primary";
  const length = body.length ?? 20;
  const breadth = body.breadth ?? 15;
  const height = body.height ?? 10;
  const weight = body.weight ?? 0.5;
  // Auto-detect COD from order if not explicitly overridden
  const payment_method = body.payment_method ?? ((order as Record<string, unknown>).isCOD ? "COD" : "Prepaid");

  // ── Build Shiprocket payload ──────────────────────────────────────────────
  const addr = order.address;

  // Billing = seller's store info (Shiprocket needs it)
  const sellerItem = order.items.find((i) => i.sellerId === user.seller!.id);
  const seller = sellerItem?.seller;

  const billing: CreateShipmentInput["billing"] = {
    name: seller?.storeName ?? user.seller.storeName,
    phone: seller?.user?.phone ?? "9999999999",
    address: "NexCart Marketplace",
    city: addr.city,
    state: addr.state,
    pin_code: addr.pincode,
    country: addr.country ?? "India",
  };

  const shipping: CreateShipmentInput["shipping"] = {
    name: addr.name,
    phone: addr.phone,
    address: addr.line1,
    address2: addr.line2 ?? undefined,
    city: addr.city,
    state: addr.state,
    pin_code: addr.pincode,
    country: addr.country ?? "India",
  };

  const order_items: CreateShipmentInput["order_items"] = order.items
    .filter((i) => i.sellerId === user.seller!.id)
    .map((item) => ({
      name: item.product.name,
      sku: item.product.productId,
      units: item.quantity,
      selling_price: item.price,
    }));

  const sub_total = order_items.reduce(
    (acc, i) => acc + i.selling_price * i.units,
    0
  );

  const shipmentInput: CreateShipmentInput = {
    order_id: `NEXCART-${order.orderId.slice(-8).toUpperCase()}`,
    order_date: order.createdAt.toISOString(),
    pickup_location,
    billing,
    shipping,
    order_items,
    payment_method,
    sub_total,
    length,
    breadth,
    height,
    weight,
  };

  // ── Call Shiprocket ───────────────────────────────────────────────────────
  let shipResult;
  try {
    shipResult = await autoShipOrder(shipmentInput);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Shiprocket error";
    // Log the real courier-API error server-side only — returning it
    // verbatim to the seller can leak upstream account/internal details.
    console.error("[Shiprocket] autoShipOrder failed:", message);
    return NextResponse.json(
      { error: "Could not create the shipment with our courier partner. Please try again or contact support." },
      { status: 502 }
    );
  }

  // ── Save to Prisma ────────────────────────────────────────────────────────
  const DELIVERY_FEE = 54; // NexCart charges seller ₹54; Shiprocket actual cost paid from NexCart wallet

  const updatedOrder = await db.order.update({
    where: { id: params.id },
    data: {
      deliveryMethod: "COURIER",
      deliveryStatus: "PREPARING",
      status: "SHIPPED",
      trackingId: shipResult.awb_code,
      courierName: shipResult.courier_name,
      shippingLabel: shipResult.label_url,
      deliveryFeeCharged: DELIVERY_FEE,
      estimatedDelivery: new Date(
        Date.now() + 5 * 24 * 60 * 60 * 1000 // 5 days from now as default ETA
      ),
    },
  });

  // Deduct delivery fee from seller wallet — fire-and-forget
  db.seller.update({
    where: { id: user.seller!.id },
    data: { walletBalance: { decrement: DELIVERY_FEE } },
  }).then(() => db.sellerTransaction.create({
    data: {
      sellerId: user.seller!.id,
      type: "DELIVERY_DEBIT",
      amount: DELIVERY_FEE,
      description: `Delivery fee – Order #${order.orderId.slice(-8).toUpperCase()}`,
      orderId: params.id,
    },
  })).catch((e) => console.error("[wallet] delivery debit error:", e));

  // Create ORDER_SHIPPED notification for buyer
  createNotification({
    userId: updatedOrder.userId,
    type: "ORDER_SHIPPED",
    title: "Your Order is On the Way",
    body: `Your order #${updatedOrder.orderId.slice(-8)} has been shipped. Tracking: ${shipResult.awb_code}`,
    link: `/orders/${updatedOrder.id}/tracking`,
  });

  // Fire-and-forget shipped email to customer
  const buyer = await db.user.findUnique({
    where: { id: updatedOrder.userId },
    select: { email: true, name: true },
  });
  if (buyer) {
    sendOrderShippedEmail({
      customerEmail: buyer.email,
      customerName: buyer.name ?? "",
      orderId: updatedOrder.orderId,
      trackingId: shipResult.awb_code,
      courierName: shipResult.courier_name,
      trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/orders/${updatedOrder.id}/tracking`,
      estimatedDelivery: updatedOrder.estimatedDelivery
        ? updatedOrder.estimatedDelivery.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : undefined,
    }).catch((e) => console.error("[email] ship email error:", e));
  }

  return NextResponse.json({
    success: true,
    shipment: {
      shiprocket_order_id: shipResult.shiprocket_order_id,
      shipment_id: shipResult.shipment_id,
      awb_code: shipResult.awb_code,
      courier_name: shipResult.courier_name,
      label_url: shipResult.label_url,
      pickup_scheduled_date: shipResult.pickup_scheduled_date,
    },
    order: {
      id: updatedOrder.id,
      status: updatedOrder.status,
      deliveryStatus: updatedOrder.deliveryStatus,
      trackingId: updatedOrder.trackingId,
      courierName: updatedOrder.courierName,
      shippingLabel: updatedOrder.shippingLabel,
      estimatedDelivery: updatedOrder.estimatedDelivery,
    },
  });
}
