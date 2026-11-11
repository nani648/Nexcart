import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { getRazorpay, isRazorpayConfigured, verifyPaymentSignature } from "@/lib/razorpay";
import { z } from "zod";

const createSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive().max(1000000),
});

const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  paymentId: z.string().min(1),
});

// Razorpay keys missing → online payments are switched off; COD still works.
const paymentsUnavailable = () =>
  NextResponse.json(
    { error: "Online payments are temporarily unavailable. Please use Cash on Delivery." },
    { status: 503 }
  );

/** Create a Razorpay order for an existing, unpaid NexCart order. */
export async function POST(req: NextRequest) {
  // Rate limit: 5 payment initiations per minute per IP
  const limited = await rateLimit(req, RATE_LIMITS.payments);
  if (limited) return limited;

  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await db.user.findUnique({ where: { firebaseUid }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isRazorpayConfigured()) return paymentsUnavailable();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { orderId, amount } = parsed.data;

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, totalAmount: true, status: true, isCOD: true },
  });
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.isCOD) {
    return NextResponse.json({ error: "This is a Cash on Delivery order" }, { status: 400 });
  }
  if (order.status !== "PENDING") {
    return NextResponse.json({ error: "This order is not awaiting payment" }, { status: 409 });
  }
  // Never trust the client's amount — it must match the server-side total.
  if (Math.abs(amount - order.totalAmount) >= 0.01) {
    return NextResponse.json({ error: "Amount does not match order total" }, { status: 400 });
  }

  try {
    const razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(order.totalAmount * 100), // paise, from the DB total
      currency: "INR",
      receipt: orderId.slice(0, 40),
      notes: { orderId, userId: user.id },
    });

    const payment = await db.payment.create({
      data: {
        userId: user.id,
        orderId,
        razorpayOrderId: razorpayOrder.id,
        amount: order.totalAmount,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      paymentId: payment.id,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[POST /api/payments]", err);
    return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
  }
}

/** Verify the payment signature returned by Razorpay Checkout. */
export async function PUT(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await db.user.findUnique({ where: { firebaseUid }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isRazorpayConfigured()) return paymentsUnavailable();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = parsed.data;

  // The payment must belong to this user...
  const payment = await db.payment.findFirst({ where: { id: paymentId, userId: user.id } });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  // ...and the signature must be for THIS payment's Razorpay order. Without
  // this, a valid signature from a cheap order could be replayed against the
  // paymentId of an expensive one and mark it paid.
  if (!payment.razorpayOrderId || payment.razorpayOrderId !== razorpayOrderId) {
    return NextResponse.json({ error: "Payment does not match this order" }, { status: 400 });
  }

  if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    console.error("[PUT /api/payments] Signature mismatch for paymentId:", paymentId);
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  // The Razorpay webhook (payment.captured) may already have marked this
  // payment SUCCESS before the browser got here. The signature is valid, so
  // that is still a successful payment — answer success, don't show an error.
  if (payment.status === "SUCCESS") {
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { id: paymentId, status: { not: "SUCCESS" } },
        data: { razorpayPaymentId, razorpaySignature, status: "SUCCESS" },
      });
      // Only move a still-PENDING order forward; never roll back an order
      // that has already progressed (e.g. PROCESSING/SHIPPED).
      if (payment.orderId) {
        await tx.order.updateMany({
          where: { id: payment.orderId, status: "PENDING" },
          data: { status: "CONFIRMED" },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/payments]", err);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
