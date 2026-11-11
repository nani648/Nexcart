import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { getWalletSummary } from "@/lib/wallet";

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

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 20;

  const [summary, transactions, total] = await Promise.all([
    getWalletSummary(user.seller.id),
    db.sellerTransaction.findMany({
      where: { sellerId: user.seller.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    db.sellerTransaction.count({ where: { sellerId: user.seller.id } }),
  ]);

  return NextResponse.json({
    walletBalance: summary.walletBalance,
    pendingPayouts: summary.pendingPayouts,
    heldForReturns: summary.heldForReturns,
    activeReturnsCount: summary.activeReturnsCount,
    availableBalance: summary.availableBalance,
    transactions,
    total,
    pages: Math.ceil(total / limit),
  });
}
