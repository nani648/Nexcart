"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { ScrollingDesignOverlay } from "@/components/seller/ScrollingDesignOverlay";
import Link from "next/link";
import { ArrowLeft, Zap, Search, X } from "lucide-react";

interface Product {
  id: string;
  productId: string;
  name: string;
  description?: string | null;
  price: number;
  comparePrice: number | null;
  images: string[];
  rating: number;
  reviewCount: number;
  stock: number;
  isFeatured: boolean;
  condition: string | null;
  deliveryInfo?: string | null;
  variants: Array<{ id: string; name: string; value: string; price: number | null; stock: number }>;
}

interface Props {
  products: Product[];
  sellerId: string;
  storeName: string;
  color: string;
  scrollingDesign?: { enabled?: boolean; effect?: string | null } | null;
}

export function FlashSaleClient({ products, sellerId, storeName, color, scrollingDesign }: Props) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase().trim()))
    : products;

  return (
    <>
      <ScrollingDesignOverlay design={scrollingDesign} />
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex flex-col gap-2 px-4 py-3 backdrop-blur-sm" style={{ background: `${color}ee` }}>
        <div className="flex items-center gap-3">
          <Link href={`/store/${sellerId}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <Zap className="h-5 w-5 shrink-0 fill-yellow-300 text-yellow-300" />
            <span className="font-black text-[16px] text-white">Flash Sale</span>
          </div>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white shrink-0">{filtered.length} items</span>
        </div>
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search flash sale products..."
            className="w-full rounded-xl bg-white/15 pl-9 pr-8 py-2 text-[13px] text-white placeholder:text-white/50 outline-none border border-white/20 focus:border-white/50 focus:bg-white/20 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Products grid */}
      <div className="px-3 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <Zap className="h-14 w-14 text-muted-foreground/30" />
            <p className="font-bold text-foreground">
              {search ? `No results for "${search}"` : "No flash sale products right now"}
            </p>
            {search ? (
              <button onClick={() => setSearch("")} className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-white" style={{ background: color }}>
                Clear Search
              </button>
            ) : (
              <Link href={`/store/${sellerId}`} className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-white" style={{ background: color }}>
                Back to Store
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map(p => (
              <ProductCard
                key={p.id}
                id={p.id}
                productId={p.productId}
                name={p.name}
                description={p.description}
                price={p.price}
                comparePrice={p.comparePrice}
                image={p.images[0]}
                images={p.images}
                rating={p.rating}
                reviewCount={p.reviewCount}
                sellerId={sellerId}
                sellerName={storeName}
                stock={p.stock}
                isFeatured={p.isFeatured}
                deliveryInfo={p.deliveryInfo ?? undefined}
                condition={p.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"}
                variants={p.variants}
                buyNowGradient={`linear-gradient(135deg, ${color}, ${color}cc)`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
