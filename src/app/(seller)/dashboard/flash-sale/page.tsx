"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import { Zap, Home, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

function getUid() {
  return auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
}

interface FSProduct {
  id: string; productId: string; name: string; price: number;
  comparePrice?: number | null; images: string[]; stock: number; isFlashSale: boolean;
}

export default function FlashSalePage() {
  const [products, setProducts] = useState<FSProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const uid = getUid();
    if (!uid) { setLoading(false); return; }
    fetch("/api/sellers/flash-sale", { headers: { Authorization: `Bearer ${uid}` } })
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []))
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoading(false));
  }, []);

  const toggleFlashSale = async (product: FSProduct) => {
    const uid = getUid();
    if (!uid) return;
    setToggling(product.id);
    const next = !product.isFlashSale;
    // Optimistic update
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFlashSale: next } : p));
    try {
      const res = await fetch("/api/sellers/flash-sale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${uid}` },
        body: JSON.stringify({ productId: product.id, isFlashSale: next }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(next ? `"${product.name}" added to Flash Sale!` : `"${product.name}" removed from Flash Sale`);
    } catch {
      // Rollback
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isFlashSale: !next } : p));
      toast.error("Failed to update. Try again.");
    } finally {
      setToggling(null);
    }
  };

  const flashCount = products.filter(p => p.isFlashSale).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" /><span>Home</span>
            </Link>
            <span className="text-muted-foreground/50 text-[12px]">/</span>
            <span className="text-[12px] text-foreground font-medium">Flash Sale</span>
          </div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" /> Flash Sale
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Toggle which products appear in the Flash Sale section on the homepage and your store page.
          </p>
        </div>
        <Link href="/flash-sale" target="_blank">
          <button className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm">
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">View Flash Sale Page</span>
          </button>
        </Link>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15">
            <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">
              {flashCount} product{flashCount !== 1 ? "s" : ""} in Flash Sale
            </p>
            <p className="text-[11px] text-muted-foreground">
              These appear on the public Flash Sale page and your store page with a ⚡ badge
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <Zap className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <p className="font-medium">No active products</p>
            <p className="text-sm text-muted-foreground mt-1">Add products first, then come back to enable Flash Sale</p>
          </div>
          <Link href="/dashboard/products/new">
            <button className="rounded-xl bg-foreground text-background px-5 py-2.5 text-[13px] font-semibold hover:opacity-90">
              Add Products
            </button>
          </Link>
        </div>
      )}

      {/* Product list */}
      {!loading && products.length > 0 && (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Price</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Stock</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Flash Sale</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const disc = product.comparePrice && product.comparePrice > product.price
                    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) : 0;
                  return (
                    <tr key={product.id} className={`border-b border-border/40 last:border-0 transition-colors ${product.isFlashSale ? "bg-amber-50/40 dark:bg-amber-900/5" : "hover:bg-muted/20"}`}>
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {product.images[0] && (
                              <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="40px" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                            {disc > 0 && (
                              <span className="text-[10px] font-bold text-emerald-600">-{disc}% off</span>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Price */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
                        {product.comparePrice && (
                          <span className="ml-1.5 text-xs line-through text-muted-foreground">{formatPrice(product.comparePrice)}</span>
                        )}
                      </td>
                      {/* Stock */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs font-medium ${product.stock === 0 ? "text-red-500" : product.stock < 5 ? "text-amber-600" : "text-emerald-600"}`}>
                          {product.stock === 0 ? "Out of stock" : `${product.stock} left`}
                        </span>
                      </td>
                      {/* Toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleFlashSale(product)}
                          disabled={toggling === product.id || product.stock === 0}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${product.isFlashSale ? "bg-amber-500" : "bg-muted-foreground/25"}`}
                        >
                          {toggling === product.id ? (
                            <Loader2 className="absolute left-1/2 -translate-x-1/2 h-3.5 w-3.5 animate-spin text-white" />
                          ) : (
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${product.isFlashSale ? "translate-x-6" : "translate-x-1"}`} />
                          )}
                        </button>
                        {product.isFlashSale && (
                          <div className="mt-1 flex items-center justify-center gap-0.5">
                            <Zap className="h-3 w-3 text-amber-500" />
                            <span className="text-[9px] font-bold text-amber-600">LIVE</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
