export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { formatPrice, formatDate, ORDER_STATUS_COLORS } from "@/lib/utils";
import { Users, Package, ShoppingBag, DollarSign, Store } from "lucide-react";
import type { Metadata } from "next";
import { requireAdminPage, requireAdminAction } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminPage() {
  // Also gated by the (admin)/admin/layout.tsx wrapper, but every page
  // re-checks independently — the same "never trust a shared gate alone"
  // pattern already used across the API layer.
  await requireAdminPage();

  const [users, sellers, pendingSellers, products, orders, revenue, recentOrders, pendingSellerList] = await Promise.all([
    db.user.count(),
    db.seller.count({ where: { status: "APPROVED" } }),
    db.seller.count({ where: { status: "PENDING" } }),
    db.product.count({ where: { isActive: true } }),
    db.order.count(),
    db.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
    db.order.findMany({ include: { user: { select: { name: true, email: true } }, items: { select: { quantity: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.seller.findMany({ where: { status: "PENDING" }, include: { user: { select: { email: true } } }, take: 5, orderBy: { createdAt: "desc" } }),
  ]);

  const stats = [
    { label: "Total Revenue", value: formatPrice(revenue._sum.amount || 0), icon: DollarSign },
    { label: "Total Users", value: users.toLocaleString(), icon: Users },
    { label: "Active Sellers", value: `${sellers} (+${pendingSellers})`, icon: Store },
    { label: "Active Products", value: products.toLocaleString(), icon: Package },
    { label: "Total Orders", value: orders.toLocaleString(), icon: ShoppingBag },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Platform Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage the entire NexCart marketplace from here.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3 text-2xl font-semibold">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Sellers */}
        <div className="rounded-xl border border-border/50">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
            <h2 className="font-semibold">Pending Approvals</h2>
            {pendingSellers > 0 && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                {pendingSellers}
              </span>
            )}
          </div>
          {pendingSellerList.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">All clear! No pending approvals.</div>
          ) : (
            <div className="divide-y divide-border/50">
              {pendingSellerList.map((seller) => (
                <div key={seller.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium">{seller.storeName}</div>
                    <div className="text-xs text-muted-foreground">{seller.user.email} · {seller.sellerId}</div>
                  </div>
                  <div className="flex gap-2">
                    <form action={async () => { "use server"; await requireAdminAction(); await db.seller.update({ where: { id: seller.id }, data: { status: "APPROVED" } }); }}>
                      <button type="submit" className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background hover:opacity-80">Approve</button>
                    </form>
                    <form action={async () => { "use server"; await requireAdminAction(); await db.seller.update({ where: { id: seller.id }, data: { status: "REJECTED" } }); }}>
                      <button type="submit" className="rounded-md border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">Reject</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="rounded-xl border border-border/50">
          <div className="border-b border-border/50 px-5 py-4">
            <h2 className="font-semibold">Recent Orders</h2>
          </div>
          {recentOrders.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">No orders yet</div>
          ) : (
            <div className="divide-y divide-border/50">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium">{order.user.name || order.user.email}</div>
                    <div className="text-xs text-muted-foreground">
                      #{order.orderId.slice(-6).toUpperCase()} · {formatDate(order.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{formatPrice(order.totalAmount)}</div>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
