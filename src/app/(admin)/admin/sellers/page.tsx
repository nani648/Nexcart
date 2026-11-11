export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AdminBannerUpload } from "@/components/admin/AdminBannerUpload";
import type { Metadata } from "next";
import { requireAdminPage, requireAdminAction } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Manage Sellers" };

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  REJECTED: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
};

export default async function AdminSellersPage() {
  await requireAdminPage();

  const sellers = await db.seller.findMany({
    select: {
      id: true,
      sellerId: true,
      storeName: true,
      status: true,
      banner: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      _count: { select: { products: true, orderItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Sellers</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{sellers.length} registered sellers</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/50">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Seller</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Products</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Orders</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Banner</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((seller) => (
              <tr key={seller.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{seller.storeName}</div>
                    <div className="text-xs text-muted-foreground">{seller.user.email}</div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="font-mono text-xs text-muted-foreground">{seller.sellerId}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                  {seller._count.products}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                  {seller._count.orderItems}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground">{formatDate(seller.createdAt)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[seller.status]}`}>
                    {seller.status}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <AdminBannerUpload sellerId={seller.id} currentBanner={seller.banner ?? null} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {seller.status === "PENDING" && (
                      <>
                        <ApproveButton sellerId={seller.id} />
                        <RejectButton sellerId={seller.id} />
                      </>
                    )}
                    {seller.status === "APPROVED" && <SuspendButton sellerId={seller.id} />}
                    {seller.status === "SUSPENDED" && <ApproveButton sellerId={seller.id} />}
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

function ApproveButton({ sellerId }: { sellerId: string }) {
  return (
    <form action={async () => {
      "use server";
      await requireAdminAction();
      await db.seller.update({ where: { id: sellerId }, data: { status: "APPROVED" } });
    }}>
      <button type="submit" className="rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background hover:opacity-80">
        Approve
      </button>
    </form>
  );
}

function RejectButton({ sellerId }: { sellerId: string }) {
  return (
    <form action={async () => {
      "use server";
      await requireAdminAction();
      await db.seller.update({ where: { id: sellerId }, data: { status: "REJECTED" } });
    }}>
      <button type="submit" className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted">
        Reject
      </button>
    </form>
  );
}

function SuspendButton({ sellerId }: { sellerId: string }) {
  return (
    <form action={async () => {
      "use server";
      await requireAdminAction();
      await db.seller.update({ where: { id: sellerId }, data: { status: "SUSPENDED" } });
    }}>
      <button type="submit" className="rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:border-red-800/30 dark:text-red-400 dark:hover:bg-red-900/20">
        Suspend
      </button>
    </form>
  );
}
