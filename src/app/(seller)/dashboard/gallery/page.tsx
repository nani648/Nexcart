"use client";

import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import { Images, Home, ChevronLeft, ChevronRight, Plus, Minus, Loader2, ExternalLink, Eye } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

function getUid() {
  return auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
}

interface GalleryProduct {
  id: string; productId: string; name: string; price: number;
  comparePrice?: number | null; images: string[]; stock: number;
  variants: Array<{ id: string; value: string; price?: number | null }>;
}

export default function GalleryPage() {
  const [allProducts, setAllProducts] = useState<GalleryProduct[]>([]);
  const [galleryIds, setGalleryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const galleryProducts = allProducts.filter(p => galleryIds.includes(p.id));
  const uid = getUid();

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    fetch("/api/sellers/gallery", { headers: { Authorization: `Bearer ${uid}` } })
      .then(r => r.json())
      .then(d => {
        setAllProducts(d.products ?? []);
        setGalleryIds(d.galleryProductIds ?? []);
      })
      .catch(() => toast.error("Failed to load gallery"))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const checkScroll = () => {
    const el = sliderRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [galleryProducts.length]);

  const slide = (dir: "left" | "right") => {
    const el = sliderRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 220 : -220, behavior: "smooth" });
  };

  const toggle = (productId: string) => {
    setGalleryIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const save = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sellers/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${uid}` },
        body: JSON.stringify({ galleryProductIds: galleryIds }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Gallery saved!");
    } catch {
      toast.error("Failed to save gallery");
    } finally {
      setSaving(false);
    }
  };

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
            <span className="text-[12px] text-foreground font-medium">Gallery</span>
          </div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Images className="h-5 w-5 text-violet-500" /> Store Gallery
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Pick products to feature in your public gallery — displayed as a beautiful square image grid.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {galleryIds.length > 0 && (
            <Link href={`/gallery/preview?ids=${galleryIds.join(",")}`} target="_blank">
              <button className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm">
                <Eye className="h-4 w-4" /> Preview
              </button>
            </Link>
          )}
          <button
            onClick={save}
            disabled={saving || loading}
            className="flex items-center gap-1.5 rounded-xl bg-foreground text-background px-4 py-2.5 text-[13px] font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Images className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Gallery"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* ── Gallery Slider Preview ── */}
          <div className="mb-6 rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div>
                <h2 className="font-semibold text-[14px]">Gallery Preview</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {galleryProducts.length} product{galleryProducts.length !== 1 ? "s" : ""} in gallery
                </p>
              </div>
              {galleryProducts.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => slide("left")}
                    disabled={!canScrollLeft}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted transition-colors disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => slide("right")}
                    disabled={!canScrollRight}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted transition-colors disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {galleryProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <div className="flex gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 w-20 rounded-xl bg-muted/40 border border-border/40 border-dashed" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">No products in gallery yet — pick from below</p>
              </div>
            ) : (
              <div className="px-5 py-5">
                <div
                  ref={sliderRef}
                  className="flex gap-3 overflow-x-auto pb-1"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {galleryProducts.map(p => {
                    const disc = p.comparePrice && p.comparePrice > p.price
                      ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0;
                    return (
                      <div key={p.id} className="flex-shrink-0 group">
                        {/* Square image */}
                        <div className="relative h-[200px] w-[200px] overflow-hidden rounded-2xl bg-muted border border-border/40">
                          {p.images[0] ? (
                            <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="200px" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Images className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                          )}
                          {disc > 0 && (
                            <span className="absolute top-2 left-2 rounded-lg bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                              -{disc}%
                            </span>
                          )}
                          {/* Remove overlay */}
                          <button
                            onClick={() => toggle(p.id)}
                            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {/* Info */}
                        <div className="mt-2 w-[200px]">
                          <p className="text-[12px] font-semibold text-foreground truncate">{p.name}</p>
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-[13px] font-black text-foreground">{formatPrice(p.price)}</span>
                            {p.comparePrice && <span className="text-[10px] line-through text-muted-foreground">{formatPrice(p.comparePrice)}</span>}
                          </div>
                          {p.variants.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{p.variants.length} variant{p.variants.length !== 1 ? "s" : ""}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Product Picker ── */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40">
              <h2 className="font-semibold text-[14px]">Add Products to Gallery</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Click the + button to add a product, click − to remove it</p>
            </div>

            {allProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <Images className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No active products yet</p>
                <Link href="/dashboard/products/new">
                  <button className="rounded-xl bg-foreground text-background px-4 py-2 text-[13px] font-semibold hover:opacity-90">
                    Add Products First
                  </button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {allProducts.map(p => {
                  const inGallery = galleryIds.includes(p.id);
                  return (
                    <div key={p.id} className={`flex items-center gap-4 px-5 py-3 transition-colors ${inGallery ? "bg-violet-50/50 dark:bg-violet-950/10" : "hover:bg-muted/20"}`}>
                      {/* Thumb */}
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted border border-border/40">
                        {p.images[0] ? (
                          <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="56px" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Images className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[12px] font-bold text-foreground">{formatPrice(p.price)}</span>
                          {p.comparePrice && <span className="text-[11px] line-through text-muted-foreground">{formatPrice(p.comparePrice)}</span>}
                          {p.variants.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{p.variants.length} variants</span>
                          )}
                        </div>
                      </div>
                      {/* Toggle */}
                      <button
                        onClick={() => toggle(p.id)}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
                          inGallery
                            ? "bg-violet-500 text-white hover:bg-violet-600 shadow-md"
                            : "border-2 border-border/60 text-muted-foreground hover:border-violet-400 hover:text-violet-500"
                        }`}
                      >
                        {inGallery ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
