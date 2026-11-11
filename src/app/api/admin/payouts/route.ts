import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { initiatePayout } from "@/lib/razorpay-route";

async function verifyAdmin(req: NextRequest, checkRevoked = false) {
  const firebaseUid = await getVerifiedUid(req, { checkRevoked });
  if (!firebaseUid) return null;
  const user = await db.user.findFirst({ where: { firebaseUid, role: "ADMIN" } });
  return user;
}

/** GET — all payouts across all sellers, includes bank account details */
export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status") || undefined;
  const skip = (page - 1) * limit;

  const where = status ? { status: status as never } : {};

  const [payouts, total, pending] = await Promise.all([
    db.payout.findMany({
      where,
      include: {
        seller: {
          select: {
            storeName: true,
            sellerId: true,
            walletBalance: true,
            user: { select: { name: true, email: true } },
            bankAccount: {
              select: {
                accountHolderName: true,
                accountNumber: true,
                ifscCode: true,
                bankName: true,
                accountType: true,
              },
            },
          },
        },
        order: { select: { orderId: true, totalAmount: true } },
      },
      orderBy: { initiatedAt: "desc" },
      skip,
      take: limit,
    }),
    db.payout.count({ where }),
    db.payout.aggregate({
      where: { status: "PENDING" },
      _sum: { netAmount: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    payouts,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    pendingSummary: {
      count: pending._count,
      totalAmount: pending._sum.netAmount ?? 0,
    },
  });
}

/**
 * POST — admin processes a payout
 * Body: { payoutId: string, action?: "process" | "fail", failureReason?: string }
 * - "process" (default): transfers money, marks PROCESSED, decrements seller wallet
 * - "fail": marks FAILED with reason, no wallet change
 */
export async function POST(req: NextRequest) {
  // checkRevoked: an admin actually moving money to a seller's bank account
  // — the highest-stakes action in the app — warrants the extra revocation
  // check; the GET listing above stays fast/unchecked since it's read-only.
  const admin = await verifyAdmin(req, true);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { payoutId, action = "process", failureReason } = body as {
    payoutId: string;
    action?: "process" | "fail";
    failureReason?: string;
  };
  if (!payoutId) return NextResponse.json({ error: "payoutId is required" }, { status: 400 });

  const payout = await db.payout.findUnique({
    where: { payoutId },
    include: { seller: { include: { bankAccount: true } } },
  });

  if (!payout) return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  if (payout.status !== "PENDING") {
    return NextResponse.json({ error: `Payout is already ${payout.status}` }, { status: 400 });
  }

  // ── Mark as FAILED ────────────────────────────────────────────────────────
  if (action === "fail") {
    await db.payout.update({
      where: { payoutId },
      data: { status: "FAILED", failureReason: failureReason || "Marked failed by admin" },
    });
    return NextResponse.json({ success: true, mode: "failed" });
  }

  // ── Process payout ────────────────────────────────────────────────────────
  const bankAccount = payout.seller.bankAccount;
  if (!bankAccount) {
    return NextResponse.json({ error: "Seller has no bank account on file" }, { status: 400 });
  }

  // Mark as PROCESSING first
  await db.payout.update({ where: { payoutId }, data: { status: "PROCESSING" } });

  // Helper: finalize payout in DB (decrement wallet + PAYOUT_DEBIT + mark PROCESSED)
  const finalizeProcessed = async (razorpayPayoutId?: string) => {
    await db.$transaction([
      db.payout.update({
        where: { payoutId },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          ...(razorpayPayoutId ? { razorpayPayoutId } : {}),
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
  };

  // ── Auto mode (Razorpay Payouts API) ─────────────────────────────────────
  if (bankAccount.razorpayFundAccountId && process.env.RAZORPAY_ROUTE_ACCOUNT_NUMBER) {
    try {
      const amountInPaise = Math.round(payout.netAmount * 100);
      const rzpPayout = await initiatePayout(
        bankAccount.razorpayFundAccountId,
        amountInPaise,
        payout.narration || `NexCart payout ${payout.payoutId}`
      );

      if (rzpPayout.status === "processed") {
        await finalizeProcessed(rzpPayout.id);
      } else {
        // Still in-flight — Razorpay will webhook when done
        await db.payout.update({
          where: { payoutId },
          data: { razorpayPayoutId: rzpPayout.id },
        });
      }

      return NextResponse.json({ success: true, mode: "automatic", rzpPayout });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payout failed";
      console.error("[admin/payouts] Razorpay payout failed:", message);
      // Keep the real reason in the Payout record itself (admin-only data,
      // useful for support/debugging) but never echo the raw gateway error
      // straight back in the API response, even to an admin caller.
      await db.payout.update({
        where: { payoutId },
        data: { status: "FAILED", failureReason: message },
      });
      return NextResponse.json({ error: "Payout could not be processed. See the payout record for details." }, { status: 500 });
    }
  }

  // ── Manual mode (no Razorpay Payouts configured) ──────────────────────────
  // Admin manually transfers via UPI/NEFT — we just record it as PROCESSED
  await finalizeProcessed();
  return NextResponse.json({ success: true, mode: "manual" });
}
