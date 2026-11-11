import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Razorpay is created LAZILY, on first use, never at module load.
 *
 * `new Razorpay({ key_id: undefined })` throws immediately. When that ran at
 * import time, simply importing this file from a route crashed `next build`
 * on Vercel whenever the Razorpay keys weren't set (see commits
 * "Disable Razorpay until configured" / "Fix Razorpay initialization during
 * Vercel build"). Routes must call `isRazorpayConfigured()` first and return
 * a 503 when it is false, then call `getRazorpay()`.
 */
export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

const globalForRazorpay = globalThis as unknown as { razorpay: Razorpay | undefined };

export function getRazorpay(): Razorpay {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing)");
  }
  if (!globalForRazorpay.razorpay) {
    globalForRazorpay.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return globalForRazorpay.razorpay;
}

/**
 * Verify the signature Razorpay Checkout returns to the browser.
 * Uses a timing-safe comparison.
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signature, "hex");
  return expectedBuf.length === receivedBuf.length && timingSafeEqual(expectedBuf, receivedBuf);
}
