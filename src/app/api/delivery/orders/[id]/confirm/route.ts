import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { maybePromptBankDetails } from "@/lib/seller-onboarding";
import { sendOrderDeliveredEmail } from "@/lib/email";
import { checkRateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { computeCommission } from "@/lib/commission";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { firebaseUid },
      select: { id: true, role: true },
    });
    if (!user || user.role !== "DELIVERY_AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const agent = await db.deliveryAgent.findUnique({
      where: { userId: user.id },
      select: { id: true, isActive: true },
    });
    if (!agent || !agent.isActive) {
      return NextResponse.json({ error: "Agent profile not found or inactive" }, { status: 404 });
    }

    const body = await req.json();
    const otp = typeof body?.otp === "string" ? body.otp.trim() : null;
    if (!otp) return NextResponse.json({ error: "OTP is required" }, { status: 400 });

    const order = await db.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: { select: { category: { select: { slug: true } } } },
            seller: { select: { createdAt: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.deliveryAgentId !== agent.id) {
      return NextResponse.json({ error: "Order not assigned to you" }, { status: 403 });
    }
    if (order.deliveryStatus !== "OUT_FOR_DELIVERY") {
      return NextResponse.json({ error: "Order is not out for delivery" }, { status: 400 });
    }
    if (order.codCollectedAt) {
      return NextResponse.json({ error: "Cash already confirmed for this order" }, { status: 400 });
    }

    // Brute-force guard: cap OTP guesses against THIS order, regardless of
    // who's guessing or from where. A 6-digit OTP only has 1,000,000 possible
    // values, so without this an agent (or anyone holding a stolen/guessed
    // agent session) could grind through guesses until one lands.
    const otpLimit = await checkRateLimit(`order:${order.id}`, RATE_LIMITS.codOtp);
    if (!otpLimit.success) {
      return NextResponse.json(
        {
          error: "Too many incorrect attempts for this order. Please wait before trying again.",
          retryAfter: Math.ceil((otpLimit.resetAt - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    // Verify OTP
    if (!order.codOtp || order.codOtp !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP. Ask the customer for the 6-digit code sent to their account." },
        { status: 400 }
      );
    }

    // Compute seller amounts from order items, net of category-based
    // platform commission (see lib/commission.ts) — same deduction applied
    // to online orders in /api/orders/route.ts.
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

    // Atomically: mark delivered + credit COD wallet (only if isCOD)
    //
    // The `codCollectedAt` check above ran BEFORE this transaction, so it can't
    // stop a concurrent request (e.g. the seller marking the order delivered
    // at the same moment) from also passing it. This conditional update is
    // the real guard: only one request can claim the order, and only the one
    // that claims it credits the wallet.
    let claimed = true;
    await db.$transaction(async (tx) => {
      const now = new Date();
      const claim = await tx.order.updateMany({
        where: { id: order.id, codCollectedAt: null, deliveryStatus: "OUT_FOR_DELIVERY" },
        data: {
          status: "DELIVERED",
          deliveryStatus: "DELIVERED",
          codCollectedAt: now,
          deliveredAt: now,
          codOtp: null,
        },
      });
      if (claim.count === 0) {
        claimed = false;
        return;
      }

      if (order.isCOD) {
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
        }
      }
    });

    if (!claimed) {
      return NextResponse.json(
        { error: "This order has already been confirmed as delivered" },
        { status: 409 }
      );
    }

    // First-sale bank-details nudge — fire-and-forget, after wallet credit committed
    if (order.isCOD) {
      for (const [sellerId] of sellerAmounts) {
        void maybePromptBankDetails(sellerId);
      }
    }

    // Notify customer: delivered
    void createNotification({
      userId: order.user.id,
      type: "ORDER_DELIVERED",
      title: "Order Delivered",
      body: `Your order #${order.orderId.slice(-8).toUpperCase()} has been delivered.`,
      link: `/orders/${order.id}`,
    });

    // Notify sellers: COD collected
    if (order.isCOD) {
      for (const [sellerId] of sellerAmounts) {
        const seller = await db.seller.findUnique({ where: { id: sellerId }, select: { userId: true } });
        if (seller) {
          void createNotification({
            userId: seller.userId,
            type: "COD_COLLECTED",
            title: "COD Cash Collected",
            body: `Cash collected for Order #${order.orderId.slice(-8).toUpperCase()}. Amount added to your wallet.`,
            link: `/dashboard/orders`,
          });
        }
      }
    }

    // Fire-and-forget delivery email
    if (order.user.email) {
      sendOrderDeliveredEmail({
        customerEmail: order.user.email,
        customerName: order.user.name ?? "",
        orderId: order.orderId,
        items: order.items.map((i) => ({ name: "", quantity: i.quantity, price: i.price })),
        totalAmount: order.totalAmount,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[delivery confirm]", err);
    return NextResponse.json({ error: "Failed to confirm delivery" }, { status: 500 });
  }
}
