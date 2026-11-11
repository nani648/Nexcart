import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { initiatePayout } from "@/lib/razorpay-route";

export const dynamic = "force-dynamic";

/**
 * Constant-time secret comparison — matches the pattern already used for
 * Razorpay webhook/payment signature checks (see api/webhooks/razorpay,
 * api/payments). A plain `!==` string compare leaks how many leading
 * characters matched via response timing, letting an attacker recover the
 * secret byte-by-byte over many requests. Buffer lengths are checked first
 * (timingSafeEqual throws, rather than returning false, on a length
 * mismatch), and that length check itself leaks nothing secret-dependent
 * since CRON_SECRET's length isn't sensitive the way its contents are.
 */
function isValidCronSecret(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  return providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf);
}

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!process.env.CRON_SECRET || !isValidCronSecret(cronSecret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only run if Razorpay Route is configured
  if (!process.env.RAZORPAY_ROUTE_ACCOUNT_NUMBER) {
    return NextResponse.json({ message: "Razorpay Route not configured — skipping auto payouts" });
  }

  // Find PENDING payouts where order is DELIVERED and seller has fund account
  const pendingPayouts = await db.payout.findMany({
    where: {
      status: "PENDING",
      order: { status: "DELIVERED" },
      seller: {
        bankAccount: {
          razorpayFundAccountId: { not: null },
        },
      },
    },
    include: {
      seller: { include: { bankAccount: true } },
    },
    take: 50, // Process max 50 per run
  });

  const results = { processed: 0, failed: 0, errors: [] as string[] };

  for (const payout of pendingPayouts) {
    const bankAccount = payout.seller.bankAccount;
    if (!bankAccount?.razorpayFundAccountId) continue;

    try {
      await db.payout.update({
        where: { id: payout.id },
        data: { status: "PROCESSING" },
      });

      const amountInPaise = Math.round(payout.netAmount * 100);
      const rzpPayout = await initiatePayout(
        bankAccount.razorpayFundAccountId,
        amountInPaise,
        payout.narration || `NexCart payout ${payout.payoutId}`
      );

      if (rzpPayout.status === "processed") {
        await db.$transaction([
          db.payout.update({
            where: { id: payout.id },
            data: {
              status: "PROCESSED",
              razorpayPayoutId: rzpPayout.id,
              processedAt: new Date(),
            },
          }),
          db.seller.update({
            where: { id: payout.sellerId },
            data: { walletBalance: { decrement: payout.netAmount } },
          }),
          db.sellerTransaction.create({
            data: {
              sellerId: payout.sellerId,
              type: "PAYOUT_DEBIT",
              amount: payout.netAmount,
              description: `Payout of ₹${payout.netAmount.toFixed(0)} processed`,
            },
          }),
        ]);
      } else {
        await db.payout.update({
          where: { id: payout.id },
          data: { status: "PROCESSING", razorpayPayoutId: rzpPayout.id },
        });
      }

      results.processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await db.payout.update({
        where: { id: payout.id },
        data: { status: "FAILED", failureReason: message },
      });
      results.failed++;
      results.errors.push(`${payout.payoutId}: ${message}`);
    }
  }

  console.log("[cron/process-payouts]", results);
  return NextResponse.json({ success: true, ...results });
}
