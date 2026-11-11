"use client";

import Image from "next/image";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Heart, Share2, ChevronLeft, ChevronRight, Check, Search } from "lucide-react";
import { useWishlistStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const ANGLE_LABELS = ["Front", "Back"] as const;

const SWATCHES: Record<string, string> = {
  black:"#111827", white:"#e5e7eb", red:"#ef4444", blue:"#3b82f6",
  green:"#22c55e", yellow:"#eab308", purple:"#a855f7", pink:"#ec4899",
  orange:"#f97316", gray:"#6b7280", grey:"#6b7280", gold:"#f59e0b",
  silver:"#94a3b8", navy:"#1e3a5f", brown:"#92400e", teal:"#14b8a6",
  cyan:"#06b6d4", rose:"#f43f5e", violet:"#7c3aed", indigo:"#6366f1",
  midnight:"#0f172a", titanium:"#9ca3af", beige:"#d4c5a9", cream:"#fffdd0",
  maroon:"#7f1d1d", lime:"#84cc16", sky:"#0ea5e9", coral:"#ff7f7f",
};
function swatchColor(v: string): string {
  const lv = v.toLowerCase();
  for (const [k, c] of Object.entries(SWATCHES)) if (lv.includes(k)) return c;
  return "#888";
}

type ColorImages = { front?: string; back?: string } | string;
interface GalleryVariant { id: string; name: string; value: string; combo?: Record<string, string> | null; stock: number; }
interface ImageGalleryProps {
  images: string[];
  productName: string;
  productId: string;
  price: number;
  sellerId: string;
  variants?: GalleryVariant[];
  variantImages?: Record<string, ColorImages>;
}

export function ImageGallery({ images, productName, productId, price, sellerId, variants = [], variantImages = {} }: ImageGalleryProps) {
  const baseImages = useMemo(() => images.length > 0 ? images : ["/placeholder-product.jpg"], [images]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const colorVariants = useMemo(() => {
    const seen = new Set<string>(); const colors: string[] = [];
    for (const v of variants) {
      if (!v.combo) continue;
      for (const [key, val] of Object.entries(v.combo))
        if (/colou?r/i.test(key) && !seen.has(val)) { seen.add(val); colors.push(val); }
    }
    return colors;
  }, [variants]);

  const displayImages = useMemo(() => {
    if (!selectedColor) return baseImages;
    const ci = variantImages[selectedColor] ?? variantImages[selectedColor.toLowerCase()];
    if (!ci) return baseImages;
    if (typeof ci === "string") return [ci, baseImages[1] || ci];
    const front = ci.front || baseImages[0] || "";
    const back  = ci.back  || baseImages[1] || front;
    return [front, back].filter(Boolean);
  }, [selectedColor, variantImages, baseImages]);

  const allImages = displayImages;
  const safeIdx = Math.min(activeIdx, Math.max(0, allImages.length - 1));

  useEffect(() => { setActiveIdx(i => Math.min(i, Math.max(0, displayImages.length - 1))); }, [displayImages]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { color } = (e as CustomEvent<{ color: string }>).detail;
      if (color && colorVariants.includes(color)) { setSelectedColor(color); setActiveIdx(0); }
    };
    window.addEventListener("nxc:variantColor", handler);
    return () => window.removeEventListener("nxc:variantColor", handler);
  }, [colorVariants]);

  const [zoom, setZoom]   = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [wishPop, setWishPop] = useState(false);
  const imgRef    = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const { addItem, removeItem, hasItem } = useWishlistStore();
  const wishlisted = mounted ? hasItem(productId) : false;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setZoom({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  }, []);

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: productName, url: window.location.href });
    else { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }
  };

  const handleWish = () => {
    setWishPop(true); setTimeout(() => setWishPop(false), 500);
    if (wishlisted) { removeItem(productId); toast("Removed from wishlist"); }
    else { addItem({ productId, productName, productImage: allImages[0], price, sellerId }); toast.success("Saved to wishlist ♥"); }
  };

  const prev = () => setActiveIdx(p => Math.max(0, p - 1));
  const next = () => setActiveIdx(p => Math.min(allImages.length - 1, p + 1));
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { if (diff > 0) next(); else prev(); }
    touchStart.current = null;
  };

  const hasAngles = allImages.length >= 2;

  return (
    /* Root — fills entire left panel. Flex row so the thumbnail column
       (Flipkart-style) sits as a real layout column beside the image, not
       floating on top of it like it used to. */
    <div className="relative w-full h-full bg-[#f8f8f8] dark:bg-[hsl(220_17%_7%)] overflow-hidden flex" style={{ minHeight: 480 }}>

      {/* ── Vertical thumbnail column — desktop only, own width, never
          overlaps the photo (matches Flipkart's product gallery layout) ── */}
      {allImages.length > 1 && (
        <div
          className="hidden lg:flex flex-col gap-2 w-[76px] shrink-0 py-4 px-2 overflow-y-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {allImages.slice(0, 7).map((img, i) => (
            <motion.button
              key={i}
              onClick={() => setActiveIdx(i)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className={cn(
                "relative w-[60px] h-[60px] rounded-xl overflow-hidden bg-white transition-all duration-200 shrink-0",
                safeIdx === i
                  ? "ring-2 ring-gray-800 dark:ring-white shadow-lg"
                  : "ring-1 ring-black/10 dark:ring-white/10 opacity-55 hover:opacity-100 hover:shadow-md"
              )}
            >
              <Image src={img} alt={`View ${i + 1}`} fill className="object-contain p-1.5" sizes="60px" />
              {safeIdx === i && (
                <div className="absolute bottom-1 inset-x-0 flex justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-800 dark:bg-white" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* ── IMAGE AREA — main photo plus all its overlays, confined to the
          remaining width so it never fights the thumbnail column above ── */}
      <div className="relative flex-1 h-full">

        {/* MAIN IMAGE */}
        <div
          ref={imgRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setZoom(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={safeIdx}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute inset-0"
            >
              <Image
                src={allImages[safeIdx]}
                alt={productName}
                fill
                className="object-contain"
                style={{ padding: "clamp(20px, 5%, 60px)" }}
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Image counter badge — top center ── */}
        {allImages.length > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md px-3 py-1 border border-white/15">
            <span className="text-[11px] font-bold text-white">{safeIdx + 1}</span>
            <span className="text-[9px] text-white/40 font-medium">/</span>
            <span className="text-[11px] text-white/60">{allImages.length}</span>
          </div>
        )}

        {/* ── Action buttons — top right ── */}
        <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
          <motion.button onClick={handleShare} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm shadow-lg border border-black/8 dark:border-white/15 text-gray-600 dark:text-white/80 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Share2 className="h-4 w-4" />
          </motion.button>
          <motion.button onClick={handleWish}
            animate={wishPop ? { scale: [1, 1.5, 0.85, 1.15, 1] } : {}}
            transition={{ duration: 0.45 }}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm shadow-lg border transition-all",
              wishlisted ? "bg-red-500 border-red-400 shadow-red-400/40" : "bg-white/90 dark:bg-black/60 border-black/8 dark:border-white/15 text-gray-600 dark:text-white/80"
            )}>
            <Heart className={cn("h-4 w-4", wishlisted ? "fill-white text-white" : "")} />
          </motion.button>
        </div>

        {/* ── Zoom hint icon — bottom left ── */}
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute bottom-24 left-4 z-40 hidden md:flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md px-2.5 py-1.5 border border-white/15"
          >
            <Search className="h-3 w-3 text-white/80" />
            <span className="text-[10px] font-semibold text-white/70">Zooming</span>
          </motion.div>
        )}

        {/* ── Nav arrows — now flush with the image area's own edges, since
            the thumbnail column is a separate flex sibling and never
            overlaps this area (no more dodge-offset needed) ── */}
        {allImages.length > 1 && (
          <>
            <motion.button onClick={prev} whileTap={{ scale: 0.88 }}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm shadow-xl border border-black/8 dark:border-white/15 text-gray-700 dark:text-white transition-all duration-200",
                activeIdx === 0 ? "opacity-0 pointer-events-none" : "opacity-80 hover:opacity-100"
              )}
              disabled={activeIdx === 0}>
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
            <motion.button onClick={next} whileTap={{ scale: 0.88 }}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm shadow-xl border border-black/8 dark:border-white/15 text-gray-700 dark:text-white transition-all duration-200",
                activeIdx === allImages.length - 1 ? "opacity-0 pointer-events-none" : "opacity-80 hover:opacity-100"
              )}
              disabled={activeIdx === allImages.length - 1}>
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          </>
        )}

        {/* ── Bottom control bar — gradient overlay ── */}
        <div className="absolute bottom-0 inset-x-0 z-40 px-4 pb-4 pt-10"
          style={{ background: "linear-gradient(to top, rgba(248,248,248,0.97) 0%, rgba(248,248,248,0.85) 60%, transparent 100%)" }}>

          {/* Mobile horizontal thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto lg:hidden mb-3" style={{ scrollbarWidth: "none" }}>
              {allImages.slice(0, 8).map((img, i) => (
                <button key={i} onClick={() => setActiveIdx(i)}
                  className={cn(
                    "w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-white border-2 transition-all",
                    safeIdx === i ? "border-gray-800 shadow-md" : "border-transparent opacity-55 hover:opacity-90"
                  )}>
                  <div className="relative w-full h-full">
                    <Image src={img} alt="" fill className="object-contain p-1" sizes="56px" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Colour swatches */}
          {colorVariants.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 shrink-0">Colour</span>
              {colorVariants.map(color => {
                const col = swatchColor(color);
                const isSel = selectedColor === color;
                const lum = (() => { const rgb = parseInt(col.replace("#",""), 16); return 0.299*((rgb>>16)&0xff)+0.587*((rgb>>8)&0xff)+0.114*(rgb&0xff); })();
                return (
                  <motion.button key={color}
                    onClick={() => { setSelectedColor(isSel ? null : color); setActiveIdx(0); }}
                    whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                    title={color}
                    className="relative flex flex-col items-center gap-1"
                  >
                    <span
                      className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200",
                        isSel ? "border-gray-900 scale-115 shadow-md" : "border-white shadow-sm hover:border-gray-400")}
                      style={{ background: col }}
                    >
                      {isSel && <Check className="h-3.5 w-3.5 drop-shadow" style={{ color: lum < 128 ? "#fff" : "#000" }} strokeWidth={3} />}
                    </span>
                    <span className={cn("text-[9px] font-semibold leading-none max-w-[36px] text-center truncate", isSel ? "text-gray-900" : "text-gray-400")}>{color}</span>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Angle tabs + dot nav */}
          <div className="flex items-center justify-between gap-3">
            {hasAngles ? (
              <div className="flex p-0.5 rounded-full gap-0.5 bg-black/8">
                {ANGLE_LABELS.map((label, idx) => (
                  <button key={label} onClick={() => setActiveIdx(idx)}
                    className={cn("relative px-5 py-1.5 rounded-full text-[12px] font-bold transition-all duration-200",
                      safeIdx === idx ? "text-gray-900" : "text-gray-400 hover:text-gray-600")}>
                    {safeIdx === idx && (
                      <motion.div layoutId="angle-pill" className="absolute inset-0 rounded-full bg-white shadow-sm -z-10"
                        transition={{ type: "spring", stiffness: 420, damping: 30 }} />
                    )}
                    {label}
                  </button>
                ))}
              </div>
            ) : <div />}

            {/* Dot indicators */}
            {allImages.length > 1 && (
              <div className="flex gap-1.5 items-center">
                {allImages.slice(0, 8).map((_, i) => (
                  <button key={i} onClick={() => setActiveIdx(i)}
                    className="rounded-full transition-all duration-300"
                    style={{ height: 4, width: safeIdx === i ? 22 : 6, background: safeIdx === i ? "#1f2937" : "#d1d5db" }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Zoom magnifier panel — right edge of the image area, xl screens ── */}
        <AnimatePresence>
          {zoom && allImages[safeIdx] && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-0 bottom-0 z-50 hidden xl:flex flex-col overflow-hidden"
              style={{ width: 240, background: "#fff", borderLeft: "1px solid rgba(0,0,0,0.08)", boxShadow: "-8px 0 32px rgba(0,0,0,0.08)" }}
            >
              <div className="flex-1"
                style={{
                  backgroundImage: `url(${allImages[safeIdx]})`,
                  backgroundSize: "350%",
                  backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                  backgroundRepeat: "no-repeat",
                }}
              />
              <div className="flex items-center justify-center gap-1.5 py-2.5 border-t border-black/6">
                <Search className="h-3 w-3 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zoom View</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
