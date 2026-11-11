import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seller = await db.seller.findFirst({
    where: { user: { firebaseUid } },
    select: { id: true },
  });
  if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status") || undefined;
  const skip = (page - 1) * limit;

  const [payouts, total] = await Promise.all([
    db.payout.findMany({
      where: {
        sellerId: seller.id,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        order: { select: { orderId: true, totalAmount: true, createdAt: true } },
      },
      orderBy: { initiatedAt: "desc" },
      skip,
      take: limit,
    }),
    db.payout.count({
      where: {
        sellerId: seller.id,
        ...(status ? { status: status as never } : {}),
      },
    }),
  ]);

  // Summary stats
  const stats = await db.payout.aggregate({
    where: { sellerId: seller.id },
    _sum: { amount: true, netAmount: true, platformFee: true },
  });

  const processed = await db.payout.aggregate({
    where: { sellerId: seller.id, status: "PROCESSED" },
    _sum: { netAmount: true },
  });

  const pending = await db.payout.aggregate({
    where: { sellerId: seller.id, status: { in: ["PENDING", "PROCESSING"] } },
    _sum: { netAmount: true },
  });

  return NextResponse.json({
    payouts,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    summary: {
      totalEarned: stats._sum.amount || 0,
      totalPaidOut: processed._sum.netAmount || 0,
      pendingAmount: pending._sum.netAmount || 0,
      totalPlatformFee: stats._sum.platformFee || 0,
    },
  });
}

/** POST — seller manually requests payout (manual flow for early stage) */
export async function POST(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seller = await db.seller.findFirst({
    where: { user: { firebaseUid } },
    select: { id: true, gstin: true },
  });
  if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

  // Check bank account is saved
  const bankAccount = await db.sellerBankAccount.findUnique({
    where: { sellerId: seller.id },
  });
  if (!bankAccount) {
    return NextResponse.json(
      { error: "Please add your bank account details before requesting a payout" },
      { status: 400 }
    );
  }

  // Check GSTIN is saved
  if (!seller.gstin) {
    return NextResponse.json(
      { error: "Please add your GSTIN in store settings before requesting a payout" },
      { status: 400 }
    );
  }

  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  // Verify order belongs to this seller and is DELIVERED
  const order = await db.order.findFirst({
    where: {
      orderId,
      items: { some: { sellerId: seller.id } },
      status: "DELIVERED",
    },
    include: {
      items: { where: { sellerId: seller.id }, select: { price: true, quantity: true } },
    },
  });
  if (!order) {
    return NextResponse.json(
      { error: "Order not found, not delivered, or does not belong to your store" },
      { status: 404 }
    );
  }

  // Check no payout already exists for this order
  const existing = await db.payout.findFirst({ where: { orderId: order.id, sellerId: seller.id } });
  if (existing) {
    return NextResponse.json({ error: "Payout already exists for this order" }, { status: 400 });
  }

  const orderAmount = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || "0");
  const platformFee = (orderAmount * platformFeePercent) / 100;
  const netAmount = orderAmount - platformFee;

  const payout = await db.payout.create({
    data: {
      sellerId: seller.id,
      orderId: order.id,
      amount: orderAmount,
      platformFee,
      netAmount,
      narration: `NexCart payout for order ${orderId}`,
      status: "PENDING",
    },
  });

  return NextResponse.json({ success: true, payout });
}
