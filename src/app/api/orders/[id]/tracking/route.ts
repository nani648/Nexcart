import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trackByAWB } from "@/lib/shiprocket";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ownership is enforced by the nested `user` filter, so the separate User
  // lookup is gone (2 queries -> 1). The seller relation is narrowed to the two
  // fields actually rendered — it previously pulled the entire Seller row,
  // including its large JSON storefront-config columns.
  const order = await db.order.findFirst({
    where: { id: params.id, user: { firebaseUid } },
    include: {
      address: true,
      items: {
        include: {
          product: { select: { name: true, images: true, productId: true } },
          seller: {
            select: {
              storeName: true,
              user: { select: { phone: true, name: true } },
            },
          },
        },
        take: 5,
      },
    },
  });

  if (!order)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const seller = order.items[0]?.seller;

  // ── Live Shiprocket tracking (only for COURIER orders with an AWB) ─────────
  let courierTracking: Record<string, unknown> | null = null;
  if (order.deliveryMethod === "COURIER" && order.trackingId) {
    try {
      const td = await trackByAWB(order.trackingId);
      courierTracking = {
        awb: td.awb,
        current_status: td.current_status,
        current_status_id: td.current_status_id,
        delivered_date: td.delivered_date,
        eta: td.eta,
        courier: td.courier,
        origin: td.origin,
        destination: td.destination,
        shipment_track_activities: td.shipment_track_activities,
      };
    } catch (err) {
      // Non-fatal: return order data without live tracking
      console.warn("[tracking] Shiprocket track failed:", err instanceof Error ? err.message : err);
      courierTracking = null;
    }
  }

  return NextResponse.json({
    orderId: order.orderId,
    status: order.status,
    deliveryMethod: order.deliveryMethod,
    deliveryStatus: order.deliveryStatus,
    trackingId: order.trackingId,
    courierName: order.courierName,
    shippingLabel: order.shippingLabel,
    estimatedDelivery: order.estimatedDelivery,
    estimatedArrival: order.estimatedArrival,
    selfDeliveryEnabled: order.selfDeliveryEnabled,
    sellerLatitude: order.sellerLatitude,
    sellerLongitude: order.sellerLongitude,
    mapsRoute: order.mapsRoute,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    address: order.address,
    seller: seller
      ? { storeName: seller.storeName, phone: seller.user?.phone ?? null }
      : null,
    items: order.items.map((i) => ({
      name: i.product.name,
      image: i.product.images[0] ?? null,
      quantity: i.quantity,
      price: i.price,
    })),
    // live Shiprocket data (null if self-delivery or not yet assigned)
    courierTracking,
  });
}
