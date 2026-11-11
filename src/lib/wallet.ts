import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// Keep in sync with RETURN_SHIPPING_COST in:
//   src/app/api/admin/returns/route.ts
//   src/app/api/sellers/returns/[id]/confirm/route.ts
export const RETURN_SHIPPING_COST = 70;

// Payout statuses that represent money already earmarked for transfer
// (PROCESSING means a transfer is in flight; PROCESSED already deducted
// from walletBalance so it's excluded here).
const PENDING_PAYOUT_STATUSES = ["PENDING", "PROCESSING"] as const;

// Return statuses where the refund hasn't been settled yet, so the
// corresponding amount is still "at risk" of being deducted from the
// seller's wallet.
const ACTIVE_RETURN_STATUSES = ["REQUESTED", "APPROVED"] as const;

export interface WalletSummary {
  walletBalance: number;
  pendingPayouts: number;
  heldForReturns: number;
  activeReturnsCount: number;
  availableBalance: number;
}

/**
 * Computes a seller's wallet breakdown:
 *  - walletBalance: raw running balance (Seller.walletBalance)
 *  - pendingPayouts: sum of PENDING/PROCESSING payout requests
 *  - heldForReturns: sum of refund amounts (+ return shipping, if seller-fault)
 *    for returns that are REQUESTED or APPROVED but not yet REFUNDED/REJECTED
 *  - availableBalance: walletBalance - pendingPayouts - heldForReturns (floored at 0)
 *
 * Accepts an optional Prisma transaction client — callers that need to make
 * an atomic "check balance, then create a payout" decision (see
 * /api/sellers/payout) should pass their `tx` here so this read participates
 * in the same transaction/row-lock instead of a separate, racy connection.
 */
export async function getWalletSummary(
  sellerId: string,
  client: Prisma.TransactionClient = db
): Promise<WalletSummary> {
  const [seller, pendingPayoutsAgg, activeReturns] = await Promise.all([
    client.seller.findUnique({
      where: { id: sellerId },
      select: { walletBalance: true },
    }),
    client.payout.aggregate({
      where: { sellerId, status: { in: [...PENDING_PAYOUT_STATUSES] } },
      _sum: { amount: true },
    }),
    client.return.findMany({
      where: { sellerId, status: { in: [...ACTIVE_RETURN_STATUSES] } },
      select: { refundAmount: true, shippingChargedTo: true },
    }),
  ]);

  const walletBalance = seller?.walletBalance ?? 0;
  const pendingPayouts = pendingPayoutsAgg._sum.amount ?? 0;

  const heldForReturns = activeReturns.reduce((sum, r) => {
    const refund = r.refundAmount ?? 0;
    const shipping = r.shippingChargedTo === "SELLER" ? RETURN_SHIPPING_COST : 0;
    return sum + refund + shipping;
  }, 0);

  const availableBalance = Math.max(0, walletBalance - pendingPayouts - heldForReturns);

  return {
    walletBalance,
    pendingPayouts,
    heldForReturns,
    activeReturnsCount: activeReturns.length,
    availableBalance,
  };
}
