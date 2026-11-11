import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getVerifiedUid } from "@/lib/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { maybePromptBankDetails } from "@/lib/seller-onboarding";
import { computeEffectivePrice, computeFreeUnits, offersForProduct } from "@/lib/offer-pricing";
import { computeCommission } from "@/lib/commission";

const COD_MAX_ORDER_VALUE = 2000; // COD only allowed for orders ≤ ₹2,000

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string().optional(),
      quantity: z.number().int().positive().max(100),
    })
  ).min(1).max(50),
  addressId: z.string().cuid().optional(),
  couponCode: z.string().optional(),
  isPickup: z.boolean().optional().default(false),
  pickupPayment: z.enum(["COD", "ONLINE"]).optional(),
  isCOD: z.boolean().optional().default(false),
});

function generatePickupCode(storeName: string): string {
  const letters = storeName.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
  const prefix = letters.length >= 2 ? letters : ("PK" + letters).slice(0, 2);
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${num}`;
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 orders per minute per IP
  const limited = await rateLimit(req, RATE_LIMITS.orders);
  if (limited) return limited;

  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await db.user.findUnique({ where: { firebaseUid }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { items, addressId, couponCode, isPickup, pickupPayment, isCOD } = parsed.data;

  // For normal delivery, address is required
  let address = null;
  if (!isPickup) {
    if (!addressId) return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });
    address = await db.address.findFirst({ where: { id: addressId, userId: user.id } });
    if (!address) return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  // Fetch all products
  const productIds = items.map((i) => i.productId);
  const products = await db.product.findMany({
    where: { productId: { in: productIds }, isActive: true },
    include: {
      seller: { select: { id: true, sellerId: true, storeName: true, status: true, isLocalStore: true, createdAt: true } },
      category: { select: { slug: true } },
    },
  });

  if (products.length !== items.length) {
    return NextResponse.json({ error: "Some products were not found or are no longer available" }, { status: 400 });
  }

  // Validate sellers are approved
  for (const product of products) {
    if (product.seller.status !== "APPROVED") {
      return NextResponse.json({ error: `Product "${product.name}" is from an unapproved seller` }, { status: 400 });
    }
  }

  // Check stock
  for (const item of items) {
    const product = products.find((p) => p.productId === item.productId)!;
    if (product.stock < item.quantity) {
      return NextResponse.json({ error: `"${product.name}" has only ${product.stock} units left` }, { status: 400 });
    }
  }

  // ── Fold each seller's active Offers (% Discount / Flat Amount Off /
  // Buy X Get Y — see OffersManager.tsx) into the REAL price charged here,
  // not just a display badge. % / flat offers stack additively on top of
  // the product's own price/comparePrice discount (see offer-pricing.ts for
  // the exact math); Buy X Get Y gives some of the purchased units for
  // free once enough quantity is in the order. Free Shipping, Custom text
  // offers, Deals of the Day and Flash Sale carry no numeric value on the
  // offer itself, so there's nothing to fold into a price for those.
  const sellerIds = Array.from(new Set(products.map((p) => p.seller.id)));
  const activeOffers = sellerIds.length
    ? await db.sellerOffer.findMany({
        where: { sellerId: { in: sellerIds }, isActive: true },
        select: { sellerId: true, offerType: true, discountVal: true, buyQty: true, getQty: true, linkedProductId: true, isActive: true },
      })
    : [];

  // Per-item pricing, computed once and reused for the total, the stored
  // OrderItem price, and the seller wallet credit below — all three must
  // agree on the exact same numbers.
  const itemPricing = items.map((item) => {
    const product = products.find((p) => p.productId === item.productId)!;
    const productOffers = offersForProduct(
      activeOffers.filter((o) => o.sellerId === product.seller.id),
      product.id
    );

    const percentFlatOffers = productOffers.filter(
      (o) => o.offerType === "PERCENT_OFF" || o.offerType === "FLAT_OFF"
    );
    const pricing = computeEffectivePrice(product.price, product.comparePrice, percentFlatOffers);

    const buyXGetYOffers = productOffers.filter((o) => o.offerType === "BUY_X_GET_Y");
    const freeUnits = buyXGetYOffers.reduce(
      (sum, o) => sum + computeFreeUnits(item.quantity, o),
      0
    );
    const paidUnits = Math.max(0, item.quantity - freeUnits);

    const lineTotal = Math.round(pricing.price * paidUnits * 100) / 100;
    // Stored per-unit — averaged across free + paid units so every existing
    // downstream consumer (invoices, refunds, payouts, delivery, emails —
    // they all just do price * quantity) keeps working unmodified and still
    // lands on the correct line total.
    const unitPrice = item.quantity > 0 ? Math.round((lineTotal / item.quantity) * 100) / 100 : 0;

    return { lineTotal, unitPrice };
  });

  // Calculate total
  let totalAmount = itemPricing.reduce((acc, p) => acc + p.lineTotal, 0);

  let discountAmount = 0;
  let appliedCoupon: Awaited<ReturnType<typeof db.coupon.findFirst>> = null;
  if (couponCode) {
    const coupon = await db.coupon.findFirst({
      where: { code: couponCode, isActive: true, expiresAt: { gt: new Date() } },
    });
    const isCouponUsable = !!coupon && !(coupon.maxUses != null && coupon.usedCount >= coupon.maxUses);
    if (isCouponUsable && coupon && totalAmount >= (coupon.minOrder ?? 0)) {
      discountAmount =
        coupon.discountType === "percentage"
          ? (totalAmount * coupon.discount) / 100
          : coupon.discount;
      totalAmount = Math.max(0, totalAmount - discountAmount);
      appliedCoupon = coupon;
    }
  }

  // Validate COD order value limit
  if (isCOD && !isPickup && totalAmount > COD_MAX_ORDER_VALUE) {
    return NextResponse.json(
      { error: `COD is only available for orders up to ₹${COD_MAX_ORDER_VALUE}. Please pay online.` },
      { status: 400 }
    );
  }

  // For pickup orders, generate a pickup code from the seller's store name
  const pickupCode = isPickup
    ? generatePickupCode(products[0]?.seller?.storeName ?? "Store")
    : null;

  try {
    const order = await db.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          userId: user.id,
          addressId: isPickup ? null : (addressId ?? null),
          totalAmount,
          discountAmount,
          couponCode: couponCode ?? null,
          status: "PENDING",
          deliveryMethod: isPickup ? "PICKUP" : null,
          pickupCode: pickupCode ?? null,
          pickupPayment: isPickup ? (pickupPayment ?? "COD") : null,
          isCOD: !isPickup && (isCOD ?? false),
          items: {
            create: items.map((item, idx) => {
              const product = products.find((p) => p.productId === item.productId)!;
              return {
                productId: product.id,
                sellerId: product.seller.id,
                variantId: item.variantId ?? null,
                quantity: item.quantity,
                price: itemPricing[idx].unitPrice,
              };
            }),
          },
        },
        include: { items: true, address: true },
      });

      // Decrement stock atomically — conditional on sufficient stock still being
      // available, to prevent overselling under concurrent orders. If another
      // order consumed the remaining stock between our initial check and now,
      // updateMany affects 0 rows and we abort the whole transaction.
      for (const item of items) {
        const product = products.find((p) => p.productId === item.productId)!;
        const result = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new Error(`OUT_OF_STOCK:${product.name}`);
        }
      }

      // Increment coupon usage count if a coupon was applied
      if (appliedCoupon) {
        await tx.coupon.update({
          where: { id: appliedCoupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return o;
    });

    // Send confirmation email — fire-and-forget, never blocks response
    const fullUser = await db.user.findUnique({ where: { id: user.id }, select: { email: true, name: true } });
    if (fullUser?.email) {
      sendOrderConfirmationEmail({
        orderId: order.orderId,
        customerName: fullUser.name || "",
        customerEmail: fullUser.email,
        items: order.items.map((item) => {
          const product = products.find((p) => p.id === item.productId)!;
          return { name: product.name, quantity: item.quantity, price: item.price };
        }),
        totalAmount: order.totalAmount,
        discountAmount: order.discountAmount ?? 0,
        address: order.address
          ? {
              line1: order.address.line1,
              city: order.address.city,
              state: order.address.state,
              pincode: order.address.pincode,
            }
          : { line1: "", city: "", state: "", pincode: "" },
      });
    }

    // Create ORDER_PLACED notification
    createNotification({
      userId: user.id,
      type: "ORDER_PLACED",
      title: "Order Placed Successfully",
      body: `Your order #${order.orderId} has been placed. Track your order in the orders section.`,
      link: `/orders/${order.id}`,
    });

    // Credit each seller's wallet for ONLINE orders only — fire-and-forget
    // COD orders: wallet credited when delivery is confirmed (cash in hand)
    if (!isCOD) {
      // Commission is category-based (see lib/commission.ts) — sellers are
      // credited lineTotal minus NexCart's cut, not the full amount the
      // customer paid. Customer-facing pricing (OrderItem.price / totalAmount
      // above) is untouched; only the internal wallet credit is reduced.
      const sellerAmounts = new Map<string, number>();
      const sellerCommission = new Map<string, number>();
      items.forEach((item, idx) => {
        const product = products.find((p) => p.productId === item.productId)!;
        const { netAmount, commission } = computeCommission(
          itemPricing[idx].lineTotal,
          product.category?.slug,
          product.seller.createdAt
        );
        const existingNet = sellerAmounts.get(product.seller.id) ?? 0;
        sellerAmounts.set(product.seller.id, Math.round((existingNet + netAmount) * 100) / 100);
        const existingCommission = sellerCommission.get(product.seller.id) ?? 0;
        sellerCommission.set(product.seller.id, Math.round((existingCommission + commission) * 100) / 100);
      });
      for (const [sellerId, amount] of sellerAmounts) {
        const commission = sellerCommission.get(sellerId) ?? 0;
        db.seller.update({ where: { id: sellerId }, data: { walletBalance: { increment: amount } } })
          .then(() => db.sellerTransaction.create({
            data: {
              sellerId,
              type: "ORDER_CREDIT",
              amount,
              description: `Order #${order.orderId.slice(-8).toUpperCase()} placed${commission > 0 ? ` (₹${commission.toFixed(2)} platform commission deducted)` : ""}`,
              orderId: order.id,
            },
          }))
          .then(() => {
            return maybePromptBankDetails(sellerId);
          })
          .catch((e) => console.error("[wallet] credit error:", e));
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    console.error("[POST /api/orders]", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("OUT_OF_STOCK:")) {
      const productName = msg.slice("OUT_OF_STOCK:".length);
      return NextResponse.json(
        { error: `"${productName}" just went out of stock. Please update your cart and try again.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create order. Please try again." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await db.user.findUnique({ where: { firebaseUid }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(20, parseInt(searchParams.get("limit") || "10"));

  try {
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where: { userId: user.id },
        include: {
          items: {
            include: {
              product: { select: { name: true, images: true, productId: true } },
              seller: { select: { storeName: true, sellerId: true } },
            },
          },
          address: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      db.order.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({ orders, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[GET /api/orders]", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
