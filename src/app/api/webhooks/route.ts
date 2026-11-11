/**
 * Legacy webhook URL — kept only for backward compatibility in case a
 * Razorpay dashboard is still pointed at /api/webhooks instead of the
 * current /api/webhooks/razorpay.
 *
 * This used to be a second, independent copy of the signature-verification
 * and event-handling logic. Two copies drift: this one compared signatures
 * with a plain `!==` (a timing side-channel) instead of a timing-safe
 * comparison, and it never created seller payout records on
 * payment.captured — so if Razorpay ever actually delivered events here,
 * payouts would silently never be created for those orders.
 *
 * Delegating to the real handler makes that divergence structurally
 * impossible: whichever URL Razorpay hits, the exact same code runs.
 */
export { POST } from "./razorpay/route";
