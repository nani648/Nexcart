import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { captureError } from "@/lib/logger";

/**
 * Razorpay Webhook Handler
 *
 * Setup in Razorpay Dashboard:
 * Settings → Webhooks → Add new webhook
 * URL: https://yourapp.vercel.app/api/webhooks/razorpay
 * Events: payment.captured, payment.failed, refund.processed
 *
 * Add RAZORPAY_WEBHOOK_SECRET to your .env from the webhook settings page.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Always verify webhook signature — reject if secret not configured
  if (!webhookSecret) {
    console.error("[webhook/razorpay] RAZORPAY_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  if (!signature) {
    console.warn("[webhook/razorpay] Missing x-razorpay-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Cryptographic verification with timing-safe comparison
  const expectedSig = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const expectedBuf = Buffer.from(expectedSig, "hex");
  const receivedBuf = Buffer.from(signature, "hex");

  const isValid =
    expectedBuf.length === receivedBuf.length &&
    timingSafeEqual(expectedBuf, receivedBuf);

  if (!isValid) {
    console.warn("[webhook/razorpay] Signature verification FAILED");
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let event: { event: string; payload: Record<string, { entity: Record<string, string> }> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { event: eventName, payload } = event;

  try {
    switch (eventName) {
      case "payment.captured": {
        const payment = payload.payment?.entity;
        if (!payment?.order_id) break;
        await db.payment.updateMany({
          where: { razorpayOrderId: payment.order_id, status: { not: "SUCCESS" } },
          data: { razorpayPaymentId: payment.id, status: "SUCCESS" },
        });
        // Also confirm the order
        const dbPayment = await db.payment.findFirst({ where: { razorpayOrderId: payment.order_id } });
        if (dbPayment?.orderId) {
          // Only move a still-PENDING order forward. Webhooks can arrive late
          // or be retried; never reset an order that has already progressed
          // (PROCESSING/SHIPPED/DELIVERED) back to CONFIRMED.
          await db.order.updateMany({
            where: { id: dbPayment.orderId, status: "PENDING" },
            data: { status: "CONFIRMED" },
          });

          // Create pending payout record for each seller in the order
          const orderItems = await db.orderItem.findMany({
            where: { orderId: dbPayment.orderId },
            select: { sellerId: true, price: true, quantity: true },
          });
          const sellerTotals = new Map<string, number>();
          for (const item of orderItems) {
            const current = sellerTotals.get(item.sellerId) || 0;
            sellerTotals.set(item.sellerId, current + item.price * item.quantity);
          }
          const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || "0");
          for (const [sellerId, amount] of sellerTotals.entries()) {
            const platformFee = (amount * platformFeePercent) / 100;
            const netAmount = amount - platformFee;
            await db.payout.create({
              data: {
                sellerId,
                orderId: dbPayment.orderId,
                amount,
                platformFee,
                netAmount,
                narration: `NexCart order payout`,
                status: "PENDING",
              },
            }).catch(() => { /* ignore duplicate */ });
          }
        }
        break;
      }

      case "payment.failed": {
        const payment = payload.payment?.entity;
        if (!payment?.order_id) break;
        await db.payment.updateMany({
          where: { razorpayOrderId: payment.order_id, status: "PENDING" },
          data: { status: "FAILED" },
        });
        break;
      }

      case "refund.processed": {
        const refund = payload.refund?.entity;
        if (!refund?.payment_id) break;
        await db.payment.updateMany({
          where: { razorpayPaymentId: refund.payment_id },
          data: { status: "REFUNDED" },
        });
        break;
      }

      default:
        // Unknown event — ignore
    }
  } catch (err) {
    captureError("webhook/razorpay", err, { eventName });
    // Return 200 so Razorpay doesn't retry indefinitely
    return NextResponse.json({ received: true, error: "DB processing error" });
  }

  return NextResponse.json({ received: true });
}
