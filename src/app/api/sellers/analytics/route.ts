import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid },
    include: { seller: true },
  });
  if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const sellerId = user.seller.id;

  // ── Date boundaries ─────────────────────────────────────────────────────────
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Daily: last 30 days
  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // inclusive of today = 30 days

  // Weekly: last 12 weeks
  const twelveWeeksAgo = new Date(todayStart);
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 83); // 12*7=84 days back

  const [
    lifetimeRevenueAgg,
    lifetimeOrders,
    totalProducts,
    ratingAgg,
    recentOrderItems,
    topProductsRaw,
    viewsCount,
  ] = await Promise.all([
    // Lifetime revenue
    db.orderItem.aggregate({
      where: { sellerId, order: { status: { not: "CANCELLED" } } },
      _sum: { price: true },
    }),
    // Lifetime orders (distinct orders containing this seller).
    // Previously this loaded one row per distinct order into memory purely to
    // read `.length` — it grew linearly with the seller's order history. The
    // equivalent count is now done entirely in the database.
    db.order.count({
      where: { status: { not: "CANCELLED" }, items: { some: { sellerId } } },
    }),
    // Total active products
    db.product.count({ where: { sellerId, isActive: true } }),
    // Average rating
    db.product.aggregate({
      where: { sellerId },
      _avg: { rating: true },
    }),
    // Order items from last 30 days for daily/weekly charts. Only `price` and
    // the order's `createdAt` are read below, so the row is narrowed to those
    // instead of selecting every OrderItem column.
    db.orderItem.findMany({
      where: {
        sellerId,
        order: {
          status: { not: "CANCELLED" },
          createdAt: { gte: thirtyDaysAgo },
        },
      },
      select: {
        price: true,
        order: { select: { createdAt: true } },
      },
    }),
    // Top 5 products by revenue
    db.orderItem.groupBy({
      by: ["productId"],
      where: { sellerId, order: { status: { not: "CANCELLED" } } },
      _sum: { price: true },
      _count: { id: true },
      orderBy: { _sum: { price: "desc" } },
      take: 5,
    }),
    // Total product views (salesCount used as proxy; replace with a proper views table if available)
    db.product.aggregate({
      where: { sellerId },
      _sum: { salesCount: true },
    }),
  ]);

  // ── Build daily chart (last 30 days) ────────────────────────────────────────
  const dailyMap = new Map<string, number>();
  for (let d = 0; d < 30; d++) {
    const date = new Date(thirtyDaysAgo);
    date.setDate(date.getDate() + d);
    dailyMap.set(date.toISOString().slice(0, 10), 0);
  }
  for (const item of recentOrderItems) {
    const key = new Date(item.order.createdAt).toISOString().slice(0, 10);
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + item.price);
    }
  }
  const dailyRevenue = Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }));

  // ── Build weekly chart (last 12 weeks) ──────────────────────────────────────
  const weeklyMap = new Map<string, number>();
  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - w * 7 - weekStart.getDay()); // align to week start (Sun)
    weeklyMap.set(weekStart.toISOString().slice(0, 10), 0);
  }
  const weekKeys = Array.from(weeklyMap.keys()).sort();
  for (const item of recentOrderItems) {
    const itemDate = new Date(item.order.createdAt);
    const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
    // Find which week bucket this belongs to
    for (let i = weekKeys.length - 1; i >= 0; i--) {
      const wStart = new Date(weekKeys[i]);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 7);
      if (itemDay >= wStart && itemDay < wEnd) {
        weeklyMap.set(weekKeys[i], (weeklyMap.get(weekKeys[i]) ?? 0) + item.price);
        break;
      }
    }
  }
  const weeklyRevenue = weekKeys.map((weekStart) => ({ weekStart, revenue: weeklyMap.get(weekStart) ?? 0 }));

  // ── Top 5 products with names ────────────────────────────────────────────────
  const productIds = topProductsRaw.map((r) => r.productId);
  const productDetails = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, images: true },
  });
  const productNameMap = new Map<string, { name: string; image: string | null }>(productDetails.map((p) => [p.id, { name: p.name, image: p.images[0] ?? null }]));
  const topProducts = topProductsRaw.map((r) => ({
    productId: r.productId,
    name: productNameMap.get(r.productId)?.name ?? "Unknown",
    image: productNameMap.get(r.productId)?.image ?? null,
    revenue: r._sum.price ?? 0,
    orders: r._count.id,
  }));

  // ── Conversion rate (orders / product views) ──────────────────────────────
  const totalOrdersCount = lifetimeOrders;
  const totalViews = viewsCount._sum.salesCount ?? 0; // proxy — swap for real view tracking if added
  const conversionRate = totalViews > 0 ? (totalOrdersCount / totalViews) * 100 : null;

  // ── Average order value ───────────────────────────────────────────────────
  const lifetimeRevenue = lifetimeRevenueAgg._sum.price ?? 0;
  const avgOrderValue = totalOrdersCount > 0 ? lifetimeRevenue / totalOrdersCount : 0;

  return NextResponse.json(
    {
      // Summary stats
      revenue: lifetimeRevenue,
      orders: totalOrdersCount,
      products: totalProducts,
      avgRating: ratingAgg._avg.rating ?? 0,
      avgOrderValue,
      conversionRate, // percentage or null if no view data
      // Charts
      dailyRevenue,   // [{ date: "YYYY-MM-DD", revenue }] last 30 days
      weeklyRevenue,  // [{ weekStart: "YYYY-MM-DD", revenue }] last 12 weeks
      // Top products
      topProducts,    // [{ productId, name, image, revenue, orders }]
    },
    { headers: { "Cache-Control": "private, max-age=0, stale-while-revalidate=30" } }
  );
}
