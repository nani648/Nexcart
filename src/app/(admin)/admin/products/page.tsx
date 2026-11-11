export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import type { Metadata } from "next";
import { requireAdminPage, requireAdminAction } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "All Products" };

export default async function AdminProductsPage() {
  await requireAdminPage();

  const products = await db.product.findMany({
    include: {
      seller: { select: { storeName: true, sellerId: true } },
      category: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Products</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{products.length} products</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/50">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Product</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Seller</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Price</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Stock</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Sales</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Added</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {p.images[0] && <Image src={p.images[0]} alt="" fill className="object-cover" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium line-clamp-1">{p.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{p.productId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="text-xs text-muted-foreground">{p.seller.storeName}</div>
                </td>
                <td className="px-4 py-3 text-sm font-medium">{formatPrice(p.price)}</td>
                <td className="px-4 py-3 hidden md:table-cell text-sm text-muted-foreground">{p.stock}</td>
                <td className="px-4 py-3 hidden md:table-cell text-sm text-muted-foreground">{p.salesCount}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{formatDate(p.createdAt)}</td>
                <td className="px-4 py-3">
                  <Badge variant={p.isActive ? "default" : "secondary"} className="text-[10px]">
                    {p.isActive ? "Active" : "Hidden"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <ToggleProductForm productId={p.id} isActive={p.isActive} />
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

function ToggleProductForm({ productId, isActive }: { productId: string; isActive: boolean }) {
  return (
    <form action={async () => {
      "use server";
      await requireAdminAction();
      await db.product.update({ where: { id: productId }, data: { isActive: !isActive } });
    }}>
      <button
        type="submit"
        className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
      >
        {isActive ? "Hide" : "Show"}
      </button>
    </form>
  );
}
