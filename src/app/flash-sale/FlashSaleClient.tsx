"use client";

import { useState, useMemo } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { Search, X, Zap, Store } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string; productId: string; name: string; description?: string | null; price: number;
  comparePrice?: number | null; images: string[]; stock: number;
  rating: number; reviewCount: number; condition: string; isFeatured: boolean;
  deliveryInfo?: string | null;
  seller: { sellerId: string; storeName: string };
  variants: Array<{ id: string; name: string; value: string; price?: number | null; stock: number }>;
}

export function FlashSaleClient({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.seller.storeName.toLowerCase().includes(q) ||
      p.seller.sellerId.toLowerCase().includes(q)
    );
  }, [products, query]);

  // Unique stores from results
  const storeCount = useMemo(() => new Set(filtered.map(p => p.seller.sellerId)).size, [filtered]);

  return (
    <>
      {/* Search bar */}
      <div className="mx-auto max-w-2xl px-4 sm:px-6 -mt-5 mb-6 relative z-10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400/70" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by store name or ID"
            className="w-full rounded-2xl border border-amber-500/30 bg-amber-950/40 pl-11 pr-10 py-3.5 text-[14px] text-white placeholder-amber-400/40 focus:outline-none focus:border-amber-400/60 focus:bg-amber-950/60 transition-all backdrop-blur-sm"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/60 hover:text-amber-300 transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {query && (
          <p className="mt-2 text-[12px] text-amber-400/60 text-center">
            {filtered.length} deal{filtered.length !== 1 ? "s" : ""} from {storeCount} store{storeCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Products */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-amber-900/30 bg-amber-950/10 py-16 text-center">
            <Store className="h-12 w-12 text-amber-900/50" />
            <p className="text-[16px] font-bold text-white/70">No stores found for &quot;{query}&quot;</p>
            <p className="text-[13px] text-white/40">Try a different store name or ID</p>
            <button onClick={() => setQuery("")} className="rounded-xl bg-amber-500/20 border border-amber-500/30 px-4 py-2 text-[13px] font-semibold text-amber-300 hover:bg-amber-500/30 transition-colors">
              Show all {products.length} deals
            </button>
          </div>
        ) : (
          <>
            {/* Store filter chips when searching */}
            {query && storeCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {[...new Set(filtered.map(p => p.seller))].slice(0, 6).map(s => (
                  <Link key={s.sellerId} href={`/store/${s.sellerId}`}
                    className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors">
                    <Store className="h-3 w-3" />{s.storeName}
                  </Link>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map(p => (
                <ProductCard
                  key={p.id} id={p.id} productId={p.productId} name={p.name} description={p.description}
                  price={p.price} comparePrice={p.comparePrice}
                  image={p.images[0]} images={p.images} rating={p.rating}
                  reviewCount={p.reviewCount} sellerId={p.seller.sellerId}
                  sellerName={p.seller.storeName} stock={p.stock}
                  isFeatured={p.isFeatured}
                  deliveryInfo={p.deliveryInfo ?? undefined}
                  condition={p.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"}
                  variants={p.variants}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
