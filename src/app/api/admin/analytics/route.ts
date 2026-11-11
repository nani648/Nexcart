import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Mirrors the requireAdmin() helper duplicated across the other admin/*
// routes (admin/sellers, admin/returns, admin/payouts) — this route needs
// its own copy because it previously had NONE at all: it only checked for a
// logged-in user, not an admin, so any signed-in customer or seller could
// GET full platform revenue/order data. The client-side layout
// role check is not a security boundary — it runs after this handler's
// response has already been sent.
async function requireAdmin(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return null;
  const user = await db.user.findUnique({ where: { firebaseUid } });
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [
    totalUsers,
    totalSellers,
    approvedSellers,
    pendingSellers,
    totalProducts,
    activeProducts,
    totalOrders,
    completedOrders,
    totalRevenue,
  ] = await Promise.all([
    db.user.count(),
    db.seller.count(),
    db.seller.count({ where: { status: "APPROVED" } }),
    db.seller.count({ where: { status: "PENDING" } }),
    db.product.count(),
    db.product.count({ where: { isActive: true } }),
    db.order.count(),
    db.order.count({ where: { status: "DELIVERED" } }),
    db.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
  ]);

  // Monthly revenue last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyRevenue = await db.payment.findMany({
    where: { status: "SUCCESS", createdAt: { gte: sixMonthsAgo } },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by month
  const revenueByMonth: Record<string, number> = {};
  monthlyRevenue.forEach((p) => {
    const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
    revenueByMonth[key] = (revenueByMonth[key] || 0) + p.amount;
  });

  return NextResponse.json({
    users: { total: totalUsers },
    sellers: { total: totalSellers, approved: approvedSellers, pending: pendingSellers },
    products: { total: totalProducts, active: activeProducts },
    orders: { total: totalOrders, completed: completedOrders },
    revenue: { total: totalRevenue._sum.amount || 0, byMonth: revenueByMonth },
  });
}
