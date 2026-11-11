export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { requireAdminPage } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Delivery Agents" };

export default async function AdminDeliveryAgentsPage() {
  await requireAdminPage();

  const agents = await db.deliveryAgent.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
      seller: { select: { storeName: true, sellerId: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground">
          <Users className="h-4 w-4 text-background" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Delivery Agents</h1>
          <p className="text-sm text-muted-foreground">{agents.length} agent{agents.length !== 1 ? "s" : ""} across all sellers</p>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <Users className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No delivery agents yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Sellers add agents from their dashboard</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/50">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                {["Agent", "Email", "Phone", "Seller", "Orders", "Status", "Joined"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{agent.user.name || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{agent.user.email}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{agent.user.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{agent.seller.storeName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{agent.seller.sellerId}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{agent._count.orders}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      agent.isActive
                        ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800/40 dark:bg-green-900/20 dark:text-green-400"
                        : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900/20"
                    )}>
                      {agent.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(agent.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
