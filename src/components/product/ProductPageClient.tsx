"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { ShoppingCart, Zap, Check, Minus, Plus, Compass } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store";
import { formatPrice, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PincodeChecker } from "@/components/product/PincodeChecker";

/* ─── size finder helper ──────────────────────────────────────────── */
const SIZE_ORDER = ["XXS","XS","S","M","L","XL","XXL","XXXL","3XL","4XL"];
function recommendSize(
  sizes: string[],
  height: number,
  weight: number,
  fit: "slim" | "regular" | "relaxed"
): string | null {
  if (!sizes.length) return null;
  const available = sizes.filter(s => SIZE_ORDER.includes(s.toUpperCase()));
  if (!available.length) return sizes[0];
  const sorted = [...available].sort((a, b) => SIZE_ORDER.indexOf(a.toUpperCase()) - SIZE_ORDER.indexOf(b.toUpperCase()));
  const score = height * 0.4 + weight * 0.6;
  let idx: number;
  if (score < 100)       idx = 0;
  else if (score < 112)  idx = 1;
  else if (score < 124)  idx = 2;
  else if (score < 136)  idx = 3;
  else if (score < 148)  idx = 4;
  else                   idx = 5;
  idx = Math.min(idx, sorted.length - 1);
  if (fit === "slim"    && idx > 0)                   idx -= 1;
  if (fit === "relaxed" && idx < sorted.length - 1)   idx += 1;
  return sorted[idx];
}

function calcDiscount(price: number, comparePrice?: number | null) {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

export interface VariantOption {
  id: string;
  name: string;
  value: string;
  combo?: Record<string, string> | null;
  price?: number | null;
  comparePrice?: number | null;
  stock: number;
}

interface Props {
  productId: string;
  productName: string;
  productImage: string;
  sellerId: string;
  sellerName: string;
  price: number;
  comparePrice?: number | null;
  stock: number;
  variants?: VariantOption[];
  variantImages?: Record<string, string | { front?: string; back?: string }>;
}

/* ─── colour swatch map ────────────────────────────────────────── */
const SWATCHES: Record<string, string> = {
  black:"#111827", white:"#f9fafb", red:"#ef4444", blue:"#3b82f6",
  green:"#22c55e", yellow:"#eab308", purple:"#a855f7", pink:"#ec4899",
  orange:"#f97316", gray:"#6b7280", grey:"#6b7280", gold:"#f59e0b",
  silver:"#94a3b8", navy:"#1e3a5f", brown:"#92400e", teal:"#14b8a6",
  cyan:"#06b6d4", rose:"#f43f5e", violet:"#7c3aed", indigo:"#6366f1",
  midnight:"#0f172a", titanium:"#9ca3af", beige:"#d4c5a9", cream:"#fffdd0",
  maroon:"#7f1d1d", lime:"#84cc16", sky:"#0ea5e9", coral:"#ff7f7f",
};
function swatch(v: string) {
  const lv = v.toLowerCase();
  for (const [k, c] of Object.entries(SWATCHES)) if (lv.includes(k)) return c;
  return null;
}

/* ─── attribute helpers ────────────────────────────────────────── */
function attrKeys(variants: VariantOption[]) {
  const keys: string[] = []; const seen = new Set<string>();
  for (const v of variants) if (v.combo) for (const k of Object.keys(v.combo)) if (!seen.has(k)) { seen.add(k); keys.push(k); }
  return keys;
}
function findVariant(variants: VariantOption[], sel: Record<string, string>) {
  return variants.find(v => v.combo && Object.entries(sel).every(([k, val]) => v.combo![k] === val)) ?? null;
}
function attrValues(variants: VariantOption[], key: string, sel: Record<string, string>) {
  const seen = new Set<string>(); const vals: string[] = [];
  for (const v of variants) { const val = v.combo?.[key]; if (val && !seen.has(val)) { seen.add(val); vals.push(val); } }
  return vals.map(val => {
    const m = variants.filter(v => v.combo && Object.entries({ ...sel, [key]: val }).every(([k, sv]) => v.combo![k] === sv));
    const totalStock = m.reduce((sum, v) => sum + v.stock, 0);
    return { value: val, available: m.length > 0, inStock: m.some(v => v.stock > 0), totalStock };
  });
}

/* ─── component ────────────────────────────────────────────────── */
export function ProductPageClient({ productId, productName, productImage, sellerId, sellerName, price, comparePrice, stock, variants = [], variantImages = {} }: Props) {
  const [qty, setQty]         = useState(1);
  const [cartFlash, setCartFlash] = useState(false);
  const addItem = useCartStore(s => s.addItem);

  // Sticky mobile buy bar (Flipkart-style) — appears once the main CTA row
  // scrolls out of view, so the shopper always has Add to Cart / Buy Now
  // within reach without needing to scroll back up. Desktop keeps the
  // regular in-flow buttons only (lg:hidden below), since the buy box
  // there sits in a normal-width column, not full-width like on mobile.
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Size Finder
  const [showFinder, setShowFinder] = useState(false);
  const [height, setHeight]         = useState(170);
  const [weight, setWeight]         = useState(68);
  const [fitPref, setFitPref]       = useState<"slim" | "regular" | "relaxed">("regular");

  const keys    = useMemo(() => attrKeys(variants), [variants]);
  const hasCombo = keys.length > 0;
  const sizeKey  = useMemo(() => keys.find(k => /size/i.test(k)) ?? null, [keys]);

  const initSel = useMemo(() => {
    if (!hasCombo) return {};
    const first = variants.find(v => v.stock > 0) ?? variants[0];
    return first?.combo ? { ...first.combo } : {};
  }, [variants, hasCombo]);

  const [sel, setSel] = useState<Record<string, string>>(initSel);
  const [simpleSel, setSimpleSel] = useState<VariantOption | null>(!hasCombo && variants.length > 0 ? variants[0] : null);

  const selVar   = useMemo(() => hasCombo ? (Object.keys(sel).length < keys.length ? null : findVariant(variants, sel)) : simpleSel, [sel, variants, keys, hasCombo, simpleSel]);
  const activePrice  = selVar?.price ?? price;
  const activeCmp    = selVar?.comparePrice ?? comparePrice;
  const activeStock  = selVar?.stock ?? stock;
  const disc         = calcDiscount(activePrice, activeCmp);
  const saved        = activeCmp && activeCmp > activePrice ? activeCmp - activePrice : 0;

  const label = (v: VariantOption) => v.combo && Object.keys(v.combo).length > 0 ? Object.values(v.combo).join(" / ") : v.value;

  const doAdd = () => {
    if (!activeStock) return;
    if (variants.length > 0 && !selVar) { toast.error("Please select all options"); return; }
    addItem({ productId, productName: selVar ? `${productName} — ${label(selVar)}` : productName, productImage, sellerId, sellerName, price: activePrice, quantity: qty, variantId: selVar?.id, variantName: selVar ? label(selVar) : undefined, stock: activeStock });
    setCartFlash(true); setTimeout(() => setCartFlash(false), 1600);
    toast.success("Added to cart", { description: `${qty} × ${productName}`, duration: 2000 });
  };
  const doBuy = () => { if (!activeStock) return; doAdd(); window.location.href = "/cart"; };

  return (
    <>
    <div className="flex flex-col gap-5">

      {/* ══════════════ PRICE CARD ══════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f1117] via-[#1a1f2e] to-[#0d1117] p-6 shadow-2xl">
        {/* Glow orbs */}
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {activeCmp && activeCmp > activePrice ? (
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">✦ Special Price</p>
            ) : (
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-400">Price</p>
            )}

            <AnimatePresence mode="wait">
              <motion.p
                key={activePrice}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="text-[3rem] font-black text-white leading-none tracking-tight tabular-nums"
              >
                {formatPrice(activePrice)}
              </motion.p>
            </AnimatePresence>

            {activeCmp && activeCmp > activePrice && (
              <p className="mt-1 text-[14px] text-white/40 line-through tabular-nums font-medium">
                MRP {formatPrice(activeCmp)}
              </p>
            )}

            {saved > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1"
              >
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-[12px] font-bold text-emerald-400">
                  You save {formatPrice(saved)} on this order
                </span>
              </motion.div>
            )}

            <p className="mt-2 text-[11px] text-white/30 font-medium">Inclusive of all taxes</p>
          </div>

          {/* Discount circle */}
          {disc >= 5 && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="relative shrink-0 flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/40"
            >
              <span className="text-white text-[9px] font-black uppercase tracking-widest leading-none">SAVE</span>
              <span className="text-white text-[26px] font-black leading-tight tabular-nums">{disc}%</span>
              <span className="text-white/70 text-[8px] font-bold leading-none">OFF</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* ══════════════ VARIANTS ══════════════ */}
      {variants.length > 0 && (
        <div className="space-y-5">
          {hasCombo ? keys.map(key => {
            const vals   = attrValues(variants, key, sel);
            const curVal = sel[key];
            const isColor = /colou?r/i.test(key);

            return (
              <div key={key} className="space-y-3">
                {/* Label */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">{key}</span>
                    {curVal && (
                      <motion.span
                        key={curVal}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[13px] font-bold text-foreground"
                      >
                        — {curVal}
                      </motion.span>
                    )}
                  </div>
                  {key === sizeKey && (
                    <button
                      onClick={() => setShowFinder(v => !v)}
                      className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors underline underline-offset-2 shrink-0"
                    >
                      <Compass className="h-3 w-3" />
                      Find My Size
                    </button>
                  )}
                </div>

                {/* ── Size Finder Drawer ── */}
                {key === sizeKey && (
                  <AnimatePresence>
                    {showFinder && (() => {
                      const allSizes = attrValues(variants, key, sel).map(v => v.value);
                      const inStockSizes = attrValues(variants, key, sel).filter(v => v.inStock).map(v => v.value);
                      const recommended = recommendSize(inStockSizes.length ? inStockSizes : allSizes, height, weight, fitPref);
                      return (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-2xl border border-border/50 bg-muted/20 dark:bg-[hsl(220_17%_8%)] p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[12px] font-black uppercase tracking-[0.14em] text-foreground flex items-center gap-1.5">
                                <Compass className="h-3.5 w-3.5 text-primary animate-spin" style={{ animationDuration: "8s" }} />
                                Smart Size Finder
                              </h4>
                              <button onClick={() => setShowFinder(false)} className="text-[11px] text-muted-foreground hover:text-foreground">
                                Minimize ✕
                              </button>
                            </div>

                            {/* Height slider */}
                            <div>
                              <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                                <span>Your Height</span>
                                <span className="font-mono font-bold text-foreground">{height} cm ({Math.round(height / 2.54)}&quot;)</span>
                              </div>
                              <input
                                type="range" min={145} max={210} value={height}
                                onChange={e => setHeight(Number(e.target.value))}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-primary"
                              />
                            </div>

                            {/* Weight slider */}
                            <div>
                              <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                                <span>Your Weight</span>
                                <span className="font-mono font-bold text-foreground">{weight} kg ({Math.round(weight * 2.205)} lbs)</span>
                              </div>
                              <input
                                type="range" min={40} max={130} value={weight}
                                onChange={e => setWeight(Number(e.target.value))}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-primary"
                              />
                            </div>

                            {/* Fit preference */}
                            <div>
                              <p className="text-[11px] text-muted-foreground mb-2">Fit Preference</p>
                              <div className="grid grid-cols-3 gap-2">
                                {(["slim","regular","relaxed"] as const).map(f => (
                                  <button
                                    key={f}
                                    onClick={() => setFitPref(f)}
                                    className={cn(
                                      "py-2 rounded-xl border text-[11px] font-bold capitalize transition-all",
                                      fitPref === f ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40"
                                    )}
                                  >
                                    {f} fit
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Result */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/40">
                              <div>
                                <p className="text-[10px] text-muted-foreground">Recommended size</p>
                                <p className="text-[28px] font-black text-foreground leading-none mt-0.5">{recommended ?? "—"}</p>
                              </div>
                              {recommended && (
                                <motion.button
                                  whileTap={{ scale: 0.94 }}
                                  onClick={() => {
                                    setSel(p => ({ ...p, [key]: recommended }));
                                    setShowFinder(false);
                                    toast.success(`Size ${recommended} selected`);
                                  }}
                                  className="px-4 py-2 rounded-xl bg-primary text-white text-[12px] font-black hover:bg-primary/90 transition-colors"
                                >
                                  Apply {recommended}
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>
                )}

                {/* ── COLOR row ── */}
                {isColor ? (
                  <div className="flex flex-wrap gap-3">
                    {vals.map(({ value, available, inStock }) => {
                      const col       = swatch(value) ?? "#888";
                      const isSelected = curVal === value;
                      const isOOS     = available && !inStock;
                      return (
                        <motion.button
                          key={value}
                          onClick={() => {
                            if (!available) return;
                            setSel(p => ({ ...p, [key]: value }));
                            // Notify gallery to switch to this colour's images
                            window.dispatchEvent(new CustomEvent("nxc:variantColor", { detail: { color: value } }));
                          }}
                          disabled={!available}
                          whileHover={available ? { scale: 1.08 } : {}}
                          whileTap={available ? { scale: 0.92 } : {}}
                          className="relative flex flex-col items-center gap-1.5 group"
                        >
                          {/* Swatch circle */}
                          <span
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-full border-[3px] shadow-md transition-all duration-200",
                              isSelected
                                ? "border-primary scale-110 shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]"
                                : "border-transparent hover:border-foreground/30",
                              !available && "opacity-30"
                            )}
                            style={{ background: col }}
                          >
                            {isSelected && (
                              <Check className="h-4 w-4 drop-shadow" style={{ color: parseInt(col.slice(1), 16) > 0xaaaaaa ? "#000" : "#fff" }} strokeWidth={3} />
                            )}
                          </span>
                          {/* Label */}
                          <span className={cn(
                            "text-[10px] font-semibold leading-none transition-colors",
                            isSelected ? "text-primary" : "text-muted-foreground",
                            !available && "line-through"
                          )}>
                            {value}
                          </span>
                          {isOOS && <span className="text-[9px] text-red-500 font-bold leading-none">OOS</span>}
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  /* ── OTHER ATTRIBUTES (Size, Storage, RAM…) ── */
                  <div className={cn("flex flex-wrap gap-2", key === sizeKey && "grid grid-cols-5 sm:grid-cols-6")}>
                    {vals.map(({ value, available, inStock, totalStock }) => {
                      const isSelected = curVal === value;
                      const isOOS      = available && !inStock;
                      const isLowStock = inStock && totalStock > 0 && totalStock <= 4;
                      return (
                        <motion.button
                          key={value}
                          onClick={() => available && setSel(p => ({ ...p, [key]: value }))}
                          disabled={!available}
                          whileTap={available ? { scale: 0.92 } : {}}
                          className={cn(
                            "relative flex flex-col items-center justify-center rounded-xl border-2 text-[13px] font-bold transition-all duration-150 select-none",
                            key === sizeKey ? "py-3 min-h-[52px]" : "px-4 py-2 min-h-[40px]",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
                              : !available
                              ? "border-border/25 text-muted-foreground/35 cursor-not-allowed line-through"
                              : isOOS
                              ? "border-border/40 text-muted-foreground/60 hover:border-border/70"
                              : "border-border/60 hover:border-primary/50 hover:bg-primary/5 text-foreground"
                          )}
                        >
                          {isSelected && (
                            <motion.span
                              layoutId={`size-ring-${key}`}
                              className="absolute inset-[-1px] rounded-xl border-2 border-primary pointer-events-none"
                              transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            />
                          )}
                          <span>{value}</span>
                          {key === sizeKey && isLowStock && (
                            <span className="text-[8px] font-bold text-amber-500 leading-none mt-0.5">{totalStock} left</span>
                          )}
                          {key === sizeKey && isOOS && (
                            <span className="text-[8px] font-bold text-muted-foreground/50 leading-none mt-0.5 uppercase">Out</span>
                          )}
                          {!key.match(/size/i) && isSelected && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                              <Check className="h-2.5 w-2.5 text-white stroke-[3]" />
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }) : (
            /* ── SIMPLE VARIANT LIST ── */
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">Style</span>
                {simpleSel && <span className="text-[13px] font-bold text-foreground">— {label(simpleSel)}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {variants.map(v => {
                  const isSel = simpleSel?.id === v.id;
                  const isOOS = v.stock === 0;
                  return (
                    <motion.button
                      key={v.id}
                      onClick={() => !isOOS && setSimpleSel(v)}
                      disabled={isOOS}
                      whileTap={!isOOS ? { scale: 0.93 } : {}}
                      className={cn(
                        "relative flex flex-col items-start rounded-2xl border-2 px-3.5 py-2.5 min-w-[90px] transition-all",
                        isSel ? "border-primary bg-primary/8 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]" :
                        isOOS ? "border-border/25 opacity-40 cursor-not-allowed" :
                        "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      {isSel && <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary"><Check className="h-2.5 w-2.5 text-white stroke-[3]" /></span>}
                      <span className={cn("text-[12px] font-bold", isSel ? "text-primary" : isOOS ? "text-muted-foreground line-through" : "text-foreground")}>{label(v)}</span>
                      <span className="text-[14px] font-black mt-0.5 tabular-nums">{formatPrice(v.price ?? price)}</span>
                      {isOOS && <span className="text-[9px] font-black text-red-400 mt-0.5 uppercase tracking-wide">Out of stock</span>}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Incomplete selection warning */}
      {hasCombo && Object.keys(sel).length < keys.length && (
        <p className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 text-[12px] font-semibold text-amber-700 dark:text-amber-400">
          ⚠ Please select {keys.filter(k => !sel[k]).join(", ")}
        </p>
      )}

      {/* Stock urgency */}
      {activeStock > 0 && activeStock <= 10 && (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
          <span className="text-[12px] font-bold text-orange-600 dark:text-orange-400">Only {activeStock} left — order soon!</span>
        </div>
      )}
      {activeStock === 0 && (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
          <span className="text-[12px] font-bold text-red-500">Currently out of stock</span>
        </div>
      )}

      {/* ══════════════ QUANTITY ══════════════ */}
      <div className="flex items-center gap-4">
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground shrink-0">Qty</span>
        <div className="flex items-center rounded-2xl border-2 border-border/60 overflow-hidden bg-background shadow-sm">
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}
            className="flex h-11 w-11 items-center justify-center text-foreground/60 hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <Minus className="h-4 w-4" />
          </motion.button>
          <span className="flex h-11 w-12 items-center justify-center text-[16px] font-black tabular-nums border-x-2 border-border/60">{qty}</span>
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => setQty(q => Math.min(activeStock, q + 1))} disabled={qty >= activeStock}
            className="flex h-11 w-11 items-center justify-center text-foreground/60 hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <Plus className="h-4 w-4" />
          </motion.button>
        </div>
        {activeStock > 0 && <span className="text-[11px] text-muted-foreground/55 font-medium">{activeStock} in stock</span>}
      </div>

      {/* ══════════════ CTA BUTTONS ══════════════ */}
      <div ref={ctaRef} className="flex gap-3">
        {/* Add to Cart — outlined dark */}
        <motion.button
          onClick={doAdd}
          disabled={!activeStock}
          animate={cartFlash ? { scale: [1, 1.03, 0.98, 1] } : {}}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "group relative overflow-hidden flex h-[54px] flex-1 items-center justify-center gap-2.5 rounded-2xl font-bold text-[14px] tracking-wide transition-all duration-200 border-2",
            "border-foreground/80 bg-transparent text-foreground",
            "hover:bg-foreground hover:text-background",
            "dark:border-white/70 dark:text-white dark:hover:bg-white dark:hover:text-black",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/8 to-transparent group-hover:translate-x-full transition-transform duration-600" />
          <ShoppingCart className="h-4.5 w-4.5 shrink-0" />
          <span>{cartFlash ? "Added!" : activeStock === 0 ? "Out of Stock" : "Add to Cart"}</span>
        </motion.button>

        {/* Buy Now — solid indigo-violet */}
        <motion.button
          onClick={doBuy}
          disabled={!activeStock}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "group relative overflow-hidden flex h-[54px] flex-1 items-center justify-center gap-2.5 rounded-2xl font-bold text-[14px] tracking-wide transition-all duration-200",
            "bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 text-white",
            "shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40",
            "hover:from-indigo-500 hover:to-purple-500",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
          )}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover:translate-x-full transition-transform duration-600" />
          <Zap className="h-4.5 w-4.5 shrink-0" />
          <span>Buy Now</span>
        </motion.button>
      </div>

      {/* ══════════════ DELIVERY PINCODE CHECK ══════════════ */}
      <div className="rounded-2xl border border-border/50 bg-muted/20 dark:bg-[hsl(220_17%_8%)] p-4">
        <PincodeChecker productId={productId} />
      </div>

    </div>

      {/* ══════════════ STICKY MOBILE BUY BAR ══════════════
          Mirrors the main CTA row above, but fixed to the bottom of the
          screen — only shown once that row has scrolled out of view, and
          only below the lg breakpoint where the buy box isn't already
          pinned in its own sticky image column like desktop is. */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="fixed bottom-0 inset-x-0 z-50 lg:hidden border-t border-white/10 bg-[#0f1117] px-4 py-3 shadow-[0_-8px_28px_rgba(0,0,0,0.4)]"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 shrink-0">
                <p className="text-[16px] font-black text-white tabular-nums leading-none">{formatPrice(activePrice)}</p>
                {activeCmp && activeCmp > activePrice && (
                  <p className="text-[10px] text-white/40 line-through tabular-nums mt-0.5">{formatPrice(activeCmp)}</p>
                )}
              </div>
              <div className="flex flex-1 gap-2 min-w-0">
                <button
                  onClick={doAdd}
                  disabled={!activeStock}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-white/70 text-[13px] font-bold text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-4 w-4 shrink-0" />
                  {cartFlash ? "Added!" : "Cart"}
                </button>
                <button
                  onClick={doBuy}
                  disabled={!activeStock}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 text-[13px] font-bold text-white shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Zap className="h-4 w-4 shrink-0" />
                  Buy Now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
