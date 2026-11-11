export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { formatDate, formatPrice, ORDER_STATUS_COLORS } from "@/lib/utils";
import type { Metadata } from "next";
import { requireAdminPage, requireAdminAction } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "All Orders" };

export default async function AdminOrdersPage() {
  await requireAdminPage();

  const orders = await db.order.findMany({
    include: {
      user: { select: { name: true, email: true } },
      items: { select: { quantity: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Orders</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{orders.length} orders</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/50">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Order ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Items</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Update</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs">#{order.orderId.slice(-8).toUpperCase()}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="text-sm">{order.user.name || order.user.email}</div>
                </td>
                <td className="px-4 py-3 text-sm font-medium">{formatPrice(order.totalAmount)}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-sm text-muted-foreground">
                  {order.items.reduce((a, i) => a + i.quantity, 0)} items
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                  {formatDate(order.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <UpdateOrderStatus orderId={order.id} currentStatus={order.status} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UpdateOrderStatus({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const next: Record<string, string> = {
    PENDING: "CONFIRMED",
    CONFIRMED: "PROCESSING",
    PROCESSING: "SHIPPED",
    SHIPPED: "DELIVERED",
  };
  const nextStatus = next[currentStatus];
  if (!nextStatus) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <form action={async () => {
      "use server";
      await requireAdminAction();
      await db.order.update({
        where: { id: orderId },
        data: { status: nextStatus as "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" },
      });
    }}>
      <button
        type="submit"
        className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
      >
        → {nextStatus}
      </button>
    </form>
  );
}
