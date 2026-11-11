import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { getWalletSummary } from "@/lib/wallet";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const MIN_PAYOUT = 500;

const payoutSchema = z.object({
  amount: z.number().min(MIN_PAYOUT),
});

/** Thrown inside the payout transaction below to carry the checked balance
 * back out to the response — never exposed past this file. */
class InsufficientBalanceError extends Error {
  constructor(public available: number) {
    super("Insufficient balance");
  }
}

export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid },
    include: { seller: true },
  });
  if (!user?.seller)
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const payouts = await db.payout.findMany({
    where: { sellerId: user.seller.id },
    orderBy: { initiatedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ payouts });
}

export async function POST(req: NextRequest) {
  // checkRevoked: this moves real money out of the seller's wallet — same
  // "sensitive financial action" bar as the bank-account routes.
  const firebaseUid = await getVerifiedUid(req, { checkRevoked: true });
  if (!firebaseUid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid },
    include: { seller: { include: { bankAccount: true } } },
  });
  if (!user?.seller)
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  if (!user.seller.bankAccount)
    return NextResponse.json({ error: "Add your bank account before requesting a payout" }, { status: 400 });

  if (!user.seller.gstin)
    return NextResponse.json({ error: "Add your GSTIN in store settings before requesting a payout" }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = payoutSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: `Minimum payout is ₹${MIN_PAYOUT}` }, { status: 400 });

  const { amount } = parsed.data;
  const sellerId = user.seller.id;

  try {
    // The balance check (read) and the payout creation (write) must be
    // atomic — otherwise two concurrent payout requests for the same
    // seller can both read the same "available balance" before either
    // request's new PENDING payout is committed, and both pass the check,
    // jointly over-drawing the wallet. `SELECT ... FOR UPDATE` takes a
    // row lock on this seller for the life of the transaction, so a second
    // concurrent request blocks here until the first commits — at which
    // point it re-reads an availableBalance that already reflects the
    // first request's new pending payout.
    const payout = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`SELECT id FROM "Seller" WHERE id = ${sellerId} FOR UPDATE`;

      // availableBalance = walletBalance - pendingPayouts - heldForReturns
      // (see lib/wallet.ts), read inside this same transaction/lock.
      const { availableBalance: available } = await getWalletSummary(sellerId, tx);
      if (amount > available) {
        throw new InsufficientBalanceError(available);
      }

      // Create payout request only — wallet is NOT decremented here.
      // walletBalance is decremented when admin marks payout as PROCESSED.
      return tx.payout.create({
        data: {
          sellerId,
          amount,
          netAmount: amount,
          platformFee: 0,
          status: "PENDING",
          narration: `Payout request – ${user.seller!.storeName}`,
        },
      });
    });

    return NextResponse.json({ success: true, payout }, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ₹${err.available.toFixed(2)}` },
        { status: 400 }
      );
    }
    console.error("[sellers/payout] Error:", err);
    return NextResponse.json({ error: "Failed to create payout request" }, { status: 500 });
  }
}
