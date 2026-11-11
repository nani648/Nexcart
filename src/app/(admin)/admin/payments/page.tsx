export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Payments" };

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  SUCCESS: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  REFUNDED: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
};

export default async function AdminPaymentsPage() {
  await requireAdminPage();

  const payments = await db.payment.findMany({
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const total = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Payments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{payments.length} transactions</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Total Revenue</div>
          <div className="text-xl font-semibold">{formatPrice(total)}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/50">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Payment ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.razorpayPaymentId?.slice(-10) || p.id.slice(-10)}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="text-sm">{p.user.name || p.user.email}</div>
                </td>
                <td className="px-4 py-3 text-sm font-medium">{formatPrice(p.amount)}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Badge variant="secondary" className="text-[10px]">
                    {p.orderId ? "Order" : "Other"}
                  </Badge>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                  {formatDate(p.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
