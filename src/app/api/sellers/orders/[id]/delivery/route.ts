import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { maybePromptBankDetails } from "@/lib/seller-onboarding";
import { computeCommission } from "@/lib/commission";

const schema = z.object({
  deliveryMethod: z.enum(["SELF", "COURIER"]).optional(),
  deliveryStatus: z
    .enum(["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"])
    .optional(),
  estimatedDelivery: z.string().optional(),
  estimatedArrival: z.string().optional(),
  selfDeliveryEnabled: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid },
    include: { seller: true },
  });
  if (!user?.seller)
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const order = await db.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          product: { select: { category: { select: { slug: true } } } },
          seller: { select: { createdAt: true } },
        },
      },
    },
  });
  if (!order)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const isSellersOrder = order.items.some(
    (item) => item.sellerId === user.seller!.id
  );
  if (!isSellersOrder)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const {
    deliveryMethod,
    deliveryStatus,
    estimatedDelivery,
    estimatedArrival,
    selfDeliveryEnabled,
  } = parsed.data;

  // Map deliveryStatus -> order status for customer visibility
  let orderStatus: string | undefined;
  if (deliveryStatus === "OUT_FOR_DELIVERY") orderStatus = "SHIPPED";
  if (deliveryStatus === "DELIVERED")        orderStatus = "DELIVERED";
  if (deliveryStatus === "PREPARING")        orderStatus = "PROCESSING";
  if (deliveryStatus === "FAILED")           orderStatus = "CANCELLED";

  // Generate 6-digit OTP for COD orders going OUT_FOR_DELIVERY
  let codOtp: string | undefined;
  if (deliveryStatus === "OUT_FOR_DELIVERY" && order.isCOD) {
    codOtp = Math.floor(100000 + Math.random() * 900000).toString();
  }

  // For seller-confirmed DELIVERED on COD (no agent assigned or agent assigned but seller overrides)
  // Only credit if cash not already confirmed
  const markCodCollected =
    deliveryStatus === "DELIVERED" &&
    order.isCOD &&
    !order.codCollectedAt;

  const isNowDelivered = deliveryStatus === "DELIVERED" && order.deliveryStatus !== "DELIVERED";

  let updated = await db.order.update({
    where: { id: params.id },
    data: {
      ...(deliveryMethod  && { deliveryMethod }),
      ...(deliveryStatus  && { deliveryStatus }),
      ...(orderStatus     && { status: orderStatus as never }),
      ...(selfDeliveryEnabled !== undefined && { selfDeliveryEnabled }),
      ...(estimatedDelivery && { estimatedDelivery: new Date(estimatedDelivery) }),
      ...(estimatedArrival  && { estimatedArrival: new Date(estimatedArrival) }),
      ...(codOtp            && { codOtp }),
      // Return window is measured from the real delivery time.
      ...(isNowDelivered    && { deliveredAt: new Date() }),
    },
  });

  // Credit seller wallet when seller marks COD as DELIVERED and cash not already tracked.
  //
  // The check above read `codCollectedAt` BEFORE this point, so two concurrent
  // requests (this seller override racing the delivery agent's OTP confirm, or
  // a double-click) could both see it empty. The conditional updateMany below
  // is the real guard: only ONE request can flip codCollectedAt from null, and
  // only that request credits the wallet — in the same transaction, so the
  // claim and the credit either both happen or neither does.
  const creditedSellerIds: string[] = [];
  if (markCodCollected) {
    const sellerAmounts = new Map<string, number>();
    const sellerCommission = new Map<string, number>();
    for (const item of order.items) {
      const lineTotal = item.price * item.quantity;
      const { netAmount, commission } = computeCommission(
        lineTotal,
        item.product?.category?.slug,
        item.seller?.createdAt
      );
      sellerAmounts.set(
        item.sellerId,
        Math.round(((sellerAmounts.get(item.sellerId) ?? 0) + netAmount) * 100) / 100
      );
      sellerCommission.set(
        item.sellerId,
        Math.round(((sellerCommission.get(item.sellerId) ?? 0) + commission) * 100) / 100
      );
    }

    try {
      await db.$transaction(async (tx) => {
        const claim = await tx.order.updateMany({
          where: { id: order.id, codCollectedAt: null },
          data: { codCollectedAt: new Date(), codOtp: null },
        });
        if (claim.count === 0) return; // someone else already collected & credited

        for (const [sellerId, amount] of sellerAmounts) {
          const commission = sellerCommission.get(sellerId) ?? 0;
          await tx.seller.update({
            where: { id: sellerId },
            data: { walletBalance: { increment: amount } },
          });
          await tx.sellerTransaction.create({
            data: {
              sellerId,
              type: "ORDER_CREDIT",
              amount,
              description: `COD collected for Order #${order.orderId.slice(-8).toUpperCase()}${commission > 0 ? ` (₹${commission.toFixed(2)} platform commission deducted)` : ""}`,
              orderId: order.id,
            },
          });
          creditedSellerIds.push(sellerId);
        }
      });
    } catch (e) {
      console.error("[COD wallet credit]", e);
      creditedSellerIds.length = 0;
    }

    // Re-read so the response reflects codCollectedAt.
    updated = (await db.order.findUnique({ where: { id: order.id } })) ?? updated;

    for (const sellerId of creditedSellerIds) {
      void maybePromptBankDetails(sellerId);
    }
  }

  // Notify customer with OTP when order goes out for delivery (COD only)
  if (codOtp) {
    void createNotification({
      userId: order.userId,
      type: "COD_OTP",
      title: "Your Delivery OTP",
      body: `Your order is out for delivery. Share OTP ${codOtp} with the delivery person to confirm receipt and complete payment.`,
      link: `/orders/${order.id}`,
    });
  }

  return NextResponse.json({ success: true, order: updated });
}
