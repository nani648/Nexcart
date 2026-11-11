"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Images, Store } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface GalleryProduct {
  id: string; productId: string; name: string; price: number;
  comparePrice?: number | null; images: string[]; stock: number;
  variants: Array<{ id: string; value: string; price?: number | null }>;
}

interface Props {
  seller: { sellerId: string; storeName: string; logo?: string | null; galleryProductIds: string[] };
  products: GalleryProduct[];
}

function parseVariantLabel(value: string): string {
  try {
    const p = JSON.parse(value);
    if (typeof p === "object" && p !== null) return Object.values(p).filter(Boolean).join(" · ");
  } catch { /* not JSON */ }
  return value;
}

export function GalleryClient({ seller, products }: Props) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [active, setActive] = useState<GalleryProduct | null>(products[0] ?? null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef(0);
  const scrollStart = useRef(0);

  const checkScroll = () => {
    const el = sliderRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [products.length]);

  const slide = (dir: "left" | "right") => {
    const el = sliderRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 240 : -240, behavior: "smooth" });
  };

  // Mouse drag to scroll
  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = e.clientX;
    scrollStart.current = sliderRef.current?.scrollLeft ?? 0;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;
    sliderRef.current.scrollLeft = scrollStart.current - (e.clientX - dragStart.current);
  };
  const onMouseUp = () => setIsDragging(false);

  const disc = active && active.comparePrice && active.comparePrice > active.price
    ? Math.round(((active.comparePrice - active.price) / active.comparePrice) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {seller.logo ? (
              <img src={seller.logo} alt={seller.storeName} className="h-9 w-9 rounded-xl object-cover border border-border/40" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground border border-border/40">
                {seller.storeName[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[13px] font-bold text-foreground">{seller.storeName}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Images className="h-3 w-3" /> Gallery · {products.length} items
              </p>
            </div>
          </div>
          <Link href={`/store/${seller.sellerId}`} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Store className="h-3.5 w-3.5" /> Visit Store
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">

        {/* ── Active product spotlight ── */}
        {active && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm">
            {/* Image */}
            <div className="relative aspect-square bg-muted/30">
              {active.images[0] ? (
                <Image src={active.images[0]} alt={active.name} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
              ) : (
                <div className="flex h-full w-full items-center justify-center"><Images className="h-16 w-16 text-muted-foreground/20" /></div>
              )}
              {disc > 0 && (
                <span className="absolute top-4 left-4 rounded-xl bg-red-500 px-3 py-1 text-[12px] font-black text-white shadow-lg">-{disc}%</span>
              )}
            </div>
            {/* Info */}
            <div className="flex flex-col justify-center p-6 sm:p-8 gap-4">
              <div>
                <h2 className="text-[22px] sm:text-[26px] font-black text-foreground leading-snug">{active.name}</h2>
                <div className="flex items-baseline gap-2.5 mt-2">
                  <span className="text-[28px] sm:text-[34px] font-black text-foreground">{formatPrice(active.price)}</span>
                  {active.comparePrice && (
                    <span className="text-[16px] line-through text-muted-foreground">{formatPrice(active.comparePrice)}</span>
                  )}
                  {disc > 0 && <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[12px] font-bold">{disc}% off</span>}
                </div>
              </div>

              {/* Variants */}
              {active.variants.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Variants</p>
                  <div className="flex flex-wrap gap-2">
                    {active.variants.slice(0, 8).map(v => (
                      <span key={v.id} className="rounded-lg border border-border/60 bg-muted/40 px-3 py-1 text-[12px] font-medium text-foreground">
                        {parseVariantLabel(v.value)}
                        {v.price ? ` · ${formatPrice(v.price)}` : ""}
                      </span>
                    ))}
                    {active.variants.length > 8 && (
                      <span className="rounded-lg border border-border/40 px-3 py-1 text-[12px] text-muted-foreground">+{active.variants.length - 8} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* Stock */}
              <p className={`text-[13px] font-semibold ${active.stock === 0 ? "text-red-500" : active.stock < 5 ? "text-amber-600" : "text-emerald-600"}`}>
                {active.stock === 0 ? "Out of stock" : active.stock < 5 ? `Only ${active.stock} left!` : "In stock"}
              </p>

              <Link
                href={`/product/${active.productId}`}
                className="flex items-center justify-center rounded-2xl py-4 text-[15px] font-black text-white hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #09090b, #27272a)" }}
              >
                View Product →
              </Link>
            </div>
          </div>
        )}

        {/* ── Horizontal slider ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-foreground">All Items</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => slide("left")} disabled={!canLeft} className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted transition-colors disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => slide("right")} disabled={!canRight} className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted transition-colors disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={sliderRef}
            className={`flex gap-3 overflow-x-auto pb-2 ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {products.map(p => {
              const isActive = active?.id === p.id;
              const d = p.comparePrice && p.comparePrice > p.price
                ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0;
              return (
                <button
                  key={p.id}
                  onClick={() => setActive(p)}
                  className={`flex-shrink-0 text-left transition-all duration-200 active:scale-95 rounded-2xl overflow-hidden border-2 ${isActive ? "border-foreground shadow-lg scale-[1.02]" : "border-transparent hover:border-border/60"}`}
                >
                  {/* Square image */}
                  <div className="relative h-[160px] w-[160px] bg-muted/30">
                    {p.images[0] ? (
                      <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="160px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Images className="h-8 w-8 text-muted-foreground/30" /></div>
                    )}
                    {d > 0 && <span className="absolute top-2 left-2 rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">-{d}%</span>}
                  </div>
                  {/* Info */}
                  <div className="bg-card px-3 py-2.5 w-[160px]">
                    <p className="text-[11px] font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[12px] font-black text-foreground mt-0.5">{formatPrice(p.price)}</p>
                    {p.variants.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">{p.variants.length} variant{p.variants.length !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
