"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Star, Package, ShoppingBag, Calendar, Home, Phone,
  Heart, ChevronDown, BadgeCheck, Store,
  Gift, Percent, Truck, Zap, BadgePercent, Tag, Camera, Loader2,
  Search, X, SlidersHorizontal, Share2, Eye, Clock, Flame, TrendingUp, Globe,
  MoreHorizontal,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store";
import { parseStoreColor, isLightColor, hexToRgba, toCssBackground } from "@/lib/store-color";
import { ScrollingDesignOverlay } from "@/components/seller/ScrollingDesignOverlay";
import { useSellerRealtimeSync } from "@/hooks/useSellerRealtimeSync";
import { resolveCardFont } from "@/lib/card-designs";
import { getCollectionHeadingStyle } from "@/lib/collection-heading-styles";
import { resolveCollectionShape } from "@/lib/collection-shapes";

type SortKey = "popular" | "newest" | "price_asc" | "price_desc" | "rating";

type OfferType = "BUY_X_GET_Y" | "PERCENT_OFF" | "FLAT_OFF" | "FREE_SHIPPING" | "CUSTOM" | "DEALS_OF_THE_DAY" | "FLASH_SALE";

interface SellerOffer {
  id: string;
  title: string;
  description?: string | null;
  offerType: OfferType;
  badgeColor?: string | null;
  linkedProductId?: string | null;
  selectedProductIds?: string | string[] | null;
}

const OFFER_COLOR_MAP: Record<OfferType, { bg: string; text: string; border: string }> = {
  BUY_X_GET_Y:     { bg: "bg-purple-500",  text: "text-white", border: "border-purple-600" },
  PERCENT_OFF:     { bg: "bg-red-500",     text: "text-white", border: "border-red-600" },
  FLAT_OFF:        { bg: "bg-amber-500",   text: "text-white", border: "border-amber-600" },
  FREE_SHIPPING:   { bg: "bg-green-500",   text: "text-white", border: "border-green-600" },
  CUSTOM:          { bg: "bg-blue-500",    text: "text-white", border: "border-blue-600" },
  DEALS_OF_THE_DAY:{ bg: "bg-pink-500",   text: "text-white", border: "border-pink-600" },
  FLASH_SALE:      { bg: "bg-orange-500",  text: "text-white", border: "border-orange-600" },
};

const OFFER_ICON_MAP: Record<OfferType, React.FC<{ className?: string }>> = {
  BUY_X_GET_Y:      Gift,
  PERCENT_OFF:      Percent,
  FLAT_OFF:         BadgePercent,
  FREE_SHIPPING:    Truck,
  CUSTOM:           Zap,
  DEALS_OF_THE_DAY: Gift,
  FLASH_SALE:       Zap,
};

interface StoreCollection {
  id: string;
  name: string;
  image: string | null;
  filterTag: string;
  productIds: string;
  sortOrder: number;
  fontStyle?: string | null;
  /** Icon-frame shape for this collection's tappable circle — see
   * lib/collection-shapes.ts. Unset/unrecognised falls back to "circle". */
  iconShape?: string | null;
}

interface SellerStoreClientProps {
  seller: {
    id: string;
    sellerId: string;
    storeName: string;
    description?: string | null;
    logo?: string | null;
    banner?: string | null;
    storeColor?: string | null;
    /** Independent background colour/gradient for the page area behind the
     * product grid. Empty/unset means "auto" — a low-opacity tint of the
     * banner colour, computed below (see resolvedPageBg). */
    productBgColor?: string | null;
    highlights?: string[] | null;
    rating: number;
    totalSales: number;
    createdAt: Date;
    products: Array<{
      id: string;
      productId: string;
      name: string;
      description?: string | null;
      price: number;
      comparePrice?: number | null;
      images: string[];
      rating: number;
      reviewCount: number;
      stock: number;
      isFeatured: boolean;
      salesCount: number;
      condition?: string | null;
      createdAt: Date;
      category?: { name: string } | null;
      tags: string[];
      isFlashSale?: boolean;
      deliveryInfo?: string | null;
      /** Per-product storefront card style — see lib/card-designs.ts */
      cardDesign?: string | null;
      /** Per-product card text style — see CARD_FONTS in lib/card-designs.ts */
      cardFont?: string | null;
      /** Manual override for the card's info panel — see ProductCard.tsx. */
      cardDisplayText?: string | null;
      /** Colour/gradient for a thin padded border frame around THIS
       * product's card. Unset means "no border". */
      cardBorderColor?: string | null;
      /** Focal point for the cover photo's storefront crop — "X% Y%", set
       * by dragging in the Product Card Design preview. Null = center. */
      cardImagePosition?: string | null;
      /** Whether the storefront card's variant picker (size/colour dropdown)
       * is shown for this product — set on the Add/Edit Product page.
       * Undefined/true = show (default); false = hide. */
      showVariantsOnCard?: boolean;
      /** Whether this card auto-slides through all of its photos on a
       * timer — set on the Edit design page. Undefined/false = off
       * (default). */
      cardImageAutoSlide?: boolean;
      variants?: Array<{ id: string; name: string; value: string; price?: number | null; stock: number }>;
    }>;
    _count: { products: number };
    user?: { phone?: string | null; firebaseUid?: string | null } | null;
    lastSeenAt?: Date | null;
    spinWheelEnabled?: boolean;
    spinWheelSegments?: Array<{ label: string; code: string | null; color: string }> | null;
    quickTags?: string[];
    festivalThemeEnabled?: boolean;
    galleryProductIds?: string[];
    floatingBarConfig?: {
      enabled?: boolean;
      message?: string;
      ctaText?: string;
      ctaLink?: string;
      backgroundColor?: string;
      textColor?: string;
      position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
    } | null;
    shakeConfig?: {
      enabled: boolean;
      type: "product" | "category" | "message" | "banner";
      product?: { id: string; productId: string; name: string; image: string; price: number; comparePrice?: number; sellerId: string };
      category?: string;
      message?: { emoji: string; title: string; body: string };
      banner?: { url: string; link?: string };
    } | null;
    isLocalStore?: boolean;
    storeAddress?: string | null;
    pickupHours?: string | null;
    /** Animated banner overlay — see lib/scrolling-designs.ts */
    scrollingDesign?: { enabled?: boolean; effect?: string | null } | null;
  };
  badges?: string[];
  categories: string[];
  collections?: StoreCollection[];
}

const SORT_LABELS: Record<SortKey, string> = {
  popular:    "Most Popular",
  newest:     "Newest First",
  price_asc:  "Price: Low to High",
  price_desc: "Price: High to Low",
  rating:     "Top Rated",
};

const BANNER_COLORS = [
  "#6d28d9",
  "#2563eb",
  "#dc2626",
  "#d97706",
  "#16a34a",
  "#db2777",
  "#0891b2",
  "#ea580c",
  "#7c3aed",
  "#0f766e",
];

function getSellerBannerColor(sellerId: string): string {
  let hash = 0;
  for (let i = 0; i < sellerId.length; i++) {
    hash = sellerId.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return BANNER_COLORS[Math.abs(hash) % BANNER_COLORS.length];
}

// ── Fuzzy search helpers (typo-tolerant matching, à la Amazon/Flipkart) ──
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Returns true if `text` matches `query`, allowing for small typos
// (e.g. "manog" matches "mango"). Falls back from exact substring match
// to per-word fuzzy matching with a length-proportional edit-distance threshold.
function fuzzyTextMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return true;
  if (t.includes(q)) return true;

  const textWords = t.split(/\s+/).filter(Boolean);
  const queryWords = q.split(/\s+/).filter(Boolean);

  return queryWords.every((qw) =>
    textWords.some((tw) => {
      if (tw.includes(qw) || qw.includes(tw)) return true;
      const maxLen = Math.max(tw.length, qw.length);
      const threshold = maxLen <= 4 ? 1 : maxLen <= 7 ? 2 : 3;
      return levenshteinDistance(tw, qw) <= threshold;
    })
  );
}

// Bolds the substring of `text` that matches `query` (case-insensitive),
// the way Flipkart/Amazon bold the typed portion inside suggestion rows.
function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}

function darkenHex(hex: string, factor = 0.72): string {
  const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor).toString(16).padStart(2, "0");
  const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor).toString(16).padStart(2, "0");
  const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function getSellerBannerStyle(sellerId: string): React.CSSProperties {
  return { background: getSellerBannerColor(sellerId) };
}

interface OffersDropdownProps {
  offers: SellerOffer[];
  selectedOfferId: string | null;
  setSelectedOfferId: (id: string | null) => void;
  setOffersOpen: (v: boolean) => void;
  productsRef: React.RefObject<HTMLDivElement>;
  mobileOnly?: boolean;
  sellerId?: string;
  onNavigate?: (path: string) => void;
}

function OffersDropdown({ offers, selectedOfferId, setSelectedOfferId, setOffersOpen, productsRef, mobileOnly = false, sellerId, onNavigate }: OffersDropdownProps) {
  const offerRows = offers.map(offer => {
    const Icon = OFFER_ICON_MAP[offer.offerType] ?? Zap;
    const isSelected = selectedOfferId === offer.id;
    const bg =
      offer.offerType === "BUY_X_GET_Y"   ? "bg-purple-500" :
      offer.offerType === "PERCENT_OFF"   ? "bg-red-500" :
      offer.offerType === "FLAT_OFF"      ? "bg-amber-500" :
      offer.offerType === "FREE_SHIPPING" ? "bg-green-500" : "bg-blue-500";
    return (
      <button key={offer.id}
        onClick={() => {
          setOffersOpen(false);
          if (offer.offerType === "FLASH_SALE" && sellerId && onNavigate) {
            onNavigate(`/store/${sellerId}/flash-sale`);
            return;
          }
          if (offer.offerType === "DEALS_OF_THE_DAY" && sellerId && onNavigate) {
            onNavigate(`/store/${sellerId}/deals`);
            return;
          }
          setSelectedOfferId(isSelected ? null : offer.id);
          if (!isSelected) setTimeout(() => productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
        }}
        className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-gray-50 border-b border-gray-100 last:border-0", isSelected && "bg-gray-50")}
      >
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white", bg)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-800 truncate">{offer.title}</p>
          {offer.description && <p className="text-[12px] text-gray-400 truncate">{offer.description}</p>}
        </div>
        {isSelected && <span className="text-[11px] font-bold text-primary shrink-0">✓ Active</span>}
      </button>
    );
  });

  if (mobileOnly) {
    return (
      <>
        <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setOffersOpen(false)} />
        <div className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl bg-white shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-[13px] font-bold uppercase tracking-widest text-gray-500">Available Offers</p>
            <button onClick={() => setOffersOpen(false)} className="text-gray-400 text-lg leading-none">✕</button>
          </div>
          {offerRows}
          <div className="pb-6" />
        </div>
      </>
    );
  }

  return (
    <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-gray-100 bg-white shadow-2xl z-50 overflow-hidden">
      <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">Available Offers</p>
      {offerRows}
    </div>
  );
}

const WHEEL_SEGMENTS = [
  { label: "5% OFF",      code: "WIN5",  color: "#f43f5e" },
  { label: "Try Again",   code: null,    color: "#94a3b8" },
  { label: "10% OFF",     code: "WIN10", color: "#8b5cf6" },
  { label: "FREE Ship",   code: "FSHIP", color: "#10b981" },
  { label: "15% OFF",     code: "WIN15", color: "#f59e0b" },
  { label: "Try Again",   code: null,    color: "#64748b" },
  { label: "20% OFF",     code: "WIN20", color: "#3b82f6" },
  { label: "5% OFF",      code: "WIN5",  color: "#ec4899" },
];

// ── Festival detection ────────────────────────────────────────────────────
const FESTIVALS = [
  { name:"Diwali",       emoji:"🪔", start:[10,15], end:[11,10], overlay:"rgba(255,140,0,0.18)",  accent:"#f59e0b" },
  { name:"Pongal",       emoji:"🌾", start:[1,10],  end:[1,17],  overlay:"rgba(255,200,0,0.16)",  accent:"#eab308" },
  { name:"Holi",         emoji:"🎨", start:[3,1],   end:[3,25],  overlay:"rgba(236,72,153,0.16)", accent:"#ec4899" },
  { name:"Navratri",     emoji:"💃", start:[10,3],  end:[10,13], overlay:"rgba(168,85,247,0.18)", accent:"#a855f7" },
  { name:"Onam",         emoji:"🌸", start:[8,20],  end:[9,5],   overlay:"rgba(34,197,94,0.16)",  accent:"#22c55e" },
  { name:"Christmas",    emoji:"🎄", start:[12,20], end:[12,26], overlay:"rgba(239,68,68,0.16)",  accent:"#ef4444" },
  { name:"NewYear",      emoji:"🎆", start:[12,28], end:[1,3],   overlay:"rgba(99,102,241,0.18)", accent:"#6366f1" },
  { name:"IndependenceDay",emoji:"🇮🇳",start:[8,13],end:[8,15], overlay:"rgba(249,115,22,0.16)", accent:"#f97316" },
  { name:"RepublicDay",  emoji:"🇮🇳",start:[1,25],  end:[1,27],  overlay:"rgba(34,197,94,0.14)",  accent:"#16a34a" },
  { name:"Ugadi",        emoji:"🌼", start:[3,28],  end:[4,5],   overlay:"rgba(234,179,8,0.16)",  accent:"#ca8a04" },
];

function getActiveFestival() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  for (const f of FESTIVALS) {
    const [sm, sd] = f.start;
    const [em, ed] = f.end;
    const inRange = sm === em
      ? (m === sm && d >= sd && d <= ed)
      : (m === sm && d >= sd) || (m === em && d <= ed) || (sm < em ? (m > sm && m < em) : (m > sm || m < em));
    if (inRange) return f;
  }
  return null;
}

// ── Milestone badge definitions ───────────────────────────────────────────
const BADGE_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  FIRST_SALE:    { label: "First Sale",    emoji: "🎯", color: "#16a34a", bg: "rgba(34,197,94,0.15)"  },
  ORDERS_100:    { label: "100 Orders",    emoji: "📦", color: "#2563eb", bg: "rgba(37,99,235,0.12)"  },
  ORDERS_500:    { label: "500 Orders",    emoji: "💎", color: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
  TOP_RATED:     { label: "Top Rated",     emoji: "⭐", color: "#d97706", bg: "rgba(217,119,6,0.12)"  },
  FIVE_STAR:     { label: "5-Star Store",  emoji: "🌟", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  BIG_CATALOGUE: { label: "20+ Products",  emoji: "🏪", color: "#0891b2", bg: "rgba(8,145,178,0.12)"  },
  TRENDING:      { label: "Trending",      emoji: "🔥", color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
};

// ── Gallery Card — inline component with variant picker ───────────────────
function parseGalVariant(value: string): string {
  try {
    const p = JSON.parse(value);
    if (typeof p === "object" && p !== null) return Object.values(p).filter(Boolean).join(" · ");
  } catch { /* not JSON */ }
  return value;
}

function GalleryCard({ product, sellerId, sellerName }: {
  product: {
    id: string; productId: string; name: string; price: number;
    comparePrice?: number | null; images: string[]; stock: number;
    variants?: Array<{ id: string; name: string; value: string; price?: number | null; stock: number }>;
  };
  sellerId: string;
  sellerName: string;
}) {
  const variants = product.variants ?? [];
  const [selVar, setSelVar] = useState(variants.length > 0 ? variants[0] : null);
  const [open, setOpen] = useState(false);
  const [dropY, setDropY] = useState(0);
  const [dropX, setDropX] = useState(0);
  const btnGalRef = useRef<HTMLButtonElement>(null);
  const [added, setAdded] = useState(false);
  const addToCart = useCartStore(s => s.addItem);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    document.addEventListener("touchstart", close, { passive: true });
    return () => {
      window.removeEventListener("scroll", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);
  const activePrice = selVar?.price ?? product.price;
  const activeStock = selVar?.stock ?? product.stock;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!activeStock) return;
    addToCart({
      productId: product.id,
      productName: selVar ? `${product.name} – ${parseGalVariant(selVar.value)}` : product.name,
      productImage: product.images?.[0] || "",
      sellerId, sellerName,
      price: activePrice, quantity: 1, stock: activeStock,
      variantId: selVar?.id,
      variantName: selVar?.value,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };
  const disc = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) : 0;


  return (
    <div className="flex-shrink-0 group">
      {/* Square image */}
      <a href={`/product/${product.productId}`} className="block active:scale-95 transition-transform">
        <div className="relative h-[165px] w-[165px] sm:h-[195px] sm:w-[195px] overflow-hidden rounded-xl">
          {product.images?.[0] ? (
            <Image src={product.images[0]} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="160px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted/40 text-2xl rounded-xl">🖼️</div>
          )}
          {disc > 0 && (
            <span className="absolute top-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-black text-white" style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}>-{disc}%</span>
          )}
        </div>
      </a>
      {/* Info */}
      <div className="mt-1.5 w-[165px] sm:w-[195px]">
        <p className="text-[11px] sm:text-[12px] font-semibold text-foreground truncate">{product.name}</p>
        <div className="flex items-baseline gap-1 mt-0.5 flex-wrap">
          <span className="text-[12px] sm:text-[13px] font-black text-foreground">₹{activePrice.toLocaleString("en-IN")}</span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-[10px] line-through text-muted-foreground">₹{product.comparePrice.toLocaleString("en-IN")}</span>
          )}
        </div>
        {/* Variant picker — fixed position escapes overflow-x clip */}
        {variants.length > 1 && (
          <div className="mt-1.5">
            <button
              ref={btnGalRef}
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (open) { setOpen(false); return; }
                if (btnGalRef.current) {
                  const r = btnGalRef.current.getBoundingClientRect();
                  const dropH = Math.min(variants.length * 36 + 16, 200);
                  const spaceBelow = window.innerHeight - r.bottom;
                  // Open above if not enough space below
                  setDropX(r.left);
                  setDropY(spaceBelow >= dropH ? r.bottom + 4 : r.top - dropH - 4);
                }
                setOpen(true);
              }}
              className="flex items-center gap-1 rounded-[6px] border border-border/60 bg-muted/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground active:bg-muted transition-colors"
              style={{ maxWidth: "160px" }}
            >
              <span className="truncate" style={{ maxWidth: "120px" }}>{selVar ? parseGalVariant(selVar.value) : "Options"}</span>
              <svg width="7" height="7" viewBox="0 0 8 8" fill="none" className={`transition-transform duration-150 shrink-0 ${open ? "rotate-180" : ""}`}>
                <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {open && typeof document !== "undefined" && createPortal(
              <div
                style={{ position: "fixed", top: dropY, left: dropX, zIndex: 99999, width: "220px", maxHeight: "200px" }}
                className="bg-white dark:bg-card border border-border rounded-xl shadow-2xl p-2 flex flex-wrap gap-1.5 overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                {variants.map(v => (
                  <button
                    key={v.id}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelVar(v); setOpen(false); }}
                    disabled={v.stock === 0}
                    className={`rounded-[5px] border px-2.5 py-1 text-[10px] font-semibold transition-all active:scale-95 leading-none whitespace-nowrap ${
                      selVar?.id === v.id
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/50 text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                    } ${v.stock === 0 ? "opacity-35 line-through cursor-not-allowed" : ""}`}
                  >
                    {parseGalVariant(v.value)}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
        )}
        {/* Add to Cart + Buy Now */}
        <div className="mt-2 flex flex-col gap-1.5 w-[130px] sm:w-[160px]">
          <button
            onClick={handleAddToCart}
            disabled={!activeStock}
            className={`w-full rounded-lg py-2 text-[11px] font-bold transition-all active:scale-95 ${
              added
                ? "bg-emerald-500 text-white"
                : activeStock
                ? "bg-foreground text-background hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {added ? "✓ Added" : activeStock ? "Add to Cart" : "Out of Stock"}
          </button>
          <a
            href={`/product/${product.productId}`}
            onClick={e => e.stopPropagation()}
            className="w-full rounded-lg py-2 text-[11px] font-bold text-center border border-border/60 text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-all active:scale-95"
          >
            Buy Now
          </a>
        </div>
      </div>
    </div>
  );
}

export function SellerStoreClient({ seller, categories, collections = [], badges = [] }: SellerStoreClientProps) {
  const router = useRouter();
  // Live cross-device sync: if this seller's row changes anywhere (another
  // tab, another device, the seller dashboard), this page refreshes itself
  // within a second or two instead of showing stale data until manually
  // reloaded. See hooks/useSellerRealtimeSync.ts.
  useSellerRealtimeSync(seller.id);
  const { user: authUser } = useAuthContext();
  const isOwner = !!authUser && authUser.uid === seller.user?.firebaseUid;
  const [activeCategory, setActiveCategory] = useState("All");
  const [sort, setSort] = useState<SortKey>("popular");
  const [sortOpen, setSortOpen] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [offers, setOffers] = useState<SellerOffer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [offersOpen, setOffersOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const productGridRef = useRef<HTMLDivElement>(null);
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(0);
  // Scroll-activity driven hide/show for the filter bar + collections row:
  // hidden the instant the user starts scrolling, restored once scrolling
  // has been idle for SCROLL_IDLE_MS. Uses transform (not display/height),
  // so it never touches the elements' offsetHeight — every scroll-offset
  // calculation elsewhere in this file that reads productsRef/collectionBarRef
  // offsetHeight keeps working unchanged.
  const [headerHidden, setHeaderHidden] = useState(false);
  const [collectionsBarHeight, setCollectionsBarHeight] = useState(0);
  const scrollIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(seller.logo ?? null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerBgRef = useRef<HTMLDivElement>(null);

  // Search + price filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [priceOpen, setPriceOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [quickViewProduct, setQuickViewProduct] = useState<SellerStoreClientProps['seller']['products'][number] | null>(null);
  const [quickViewImg, setQuickViewImg] = useState(0);
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; y: number; color: string; angle: number }>>([]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [viewingNowCount, setViewingNowCount] = useState(1);

  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [collectionSectionCounts, setCollectionSectionCounts] = useState<Record<string, number>>({});
  const [gridAnimKey, setGridAnimKey] = useState(0);
  const [saleTimer, setSaleTimer] = useState(0);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  // Language switcher
  const [langOpen, setLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("en");

  useEffect(() => {
    const match = document.cookie.match(/googtrans=\/en\/([a-z]+)/);
    if (match) setCurrentLang(match[1]);

    const styleId = "nxc-gt-style";
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = `.goog-te-banner-frame,.skiptranslate{display:none!important}body{top:0!important}.goog-te-gadget{display:none!important}.goog-tooltip,.goog-tooltip:hover{display:none!important}.goog-text-highlight{background:transparent!important;box-shadow:none!important}`;
      document.head.appendChild(s);
    }
    const scriptId = "nxc-gt-script";
    if (!document.getElementById(scriptId)) {
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: "en", includedLanguages: "te,hi,ta,kn,ml,bn,mr,ur", autoDisplay: false },
          "nxc-gt-root"
        );
      };
      const sc = document.createElement("script");
      sc.id = scriptId;
      sc.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      sc.async = true;
      document.head.appendChild(sc);
    }
  }, []);

  const translateTo = (lang: string) => {
    if (lang === "en") {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/;`;
    } else {
      document.cookie = `googtrans=/en/${lang}; path=/`;
      document.cookie = `googtrans=/en/${lang}; domain=${window.location.hostname}; path=/`;
    }
    setCurrentLang(lang);
    setLangOpen(false);

    // A full window.location.reload() re-fetches and re-renders the entire
    // page from scratch just to change the language — that's the whole
    // extra multi-second wait users see. The widget's own hidden <select>
    // (class "goog-te-combo") is what actually drives translation; firing a
    // change event on it re-translates the CURRENT page in place, so only
    // Google's translation call itself is on the critical path, not a full
    // reload. "" is the combo's "original language" option.
    const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (combo) {
      combo.value = lang === "en" ? "" : lang;
      combo.dispatchEvent(new Event("change"));
    } else {
      // Widget hasn't finished initializing yet (only happens if clicked
      // within ~1s of page load) — reload is the only reliable fallback.
      window.location.reload();
    }
  };

  const LANGUAGES = [
    { code: "en", native: "English" },
    { code: "te", native: "తెలుగు" },
    { code: "hi", native: "हिंदी" },
    { code: "ta", native: "தமிழ்" },
    { code: "kn", native: "ಕನ್ನಡ" },
    { code: "ml", native: "മലയാളം" },
    { code: "bn", native: "বাংলা" },
    { code: "mr", native: "मराठी" },
    { code: "ur", native: "اردو" },
  ];

  // Spin wheel
  const spinDegRef = useRef(0);
  const [spinDeg, setSpinDeg] = useState(0);
  const [spinOpen, setSpinOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const wheelSegments = (
    seller.spinWheelSegments &&
    Array.isArray(seller.spinWheelSegments) &&
    seller.spinWheelSegments.length >= 2
  ) ? seller.spinWheelSegments as typeof WHEEL_SEGMENTS : WHEEL_SEGMENTS;

  const [spinWon, setSpinWon] = useState<typeof WHEEL_SEGMENTS[0] | null>(null);
  const [spinCopied, setSpinCopied] = useState(false);

  // Wishlist (localStorage per store)
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Product comparison (max 2 products)
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  // Smart search suggestions
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  // Keyboard-navigable suggestion index (-1 = nothing highlighted), and a
  // small persisted history of past searches — the two pieces that make the
  // dropdown feel like a real search product instead of a plain filter box.
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`nxc-recent-search-${seller.sellerId}`);
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch {}
  }, [seller.sellerId]);

  const saveRecentSearch = (term: string) => {
    const t = term.trim();
    if (!t) return;
    setRecentSearches(prev => {
      const next = [t, ...prev.filter(s => s.toLowerCase() !== t.toLowerCase())].slice(0, 6);
      try { localStorage.setItem(`nxc-recent-search-${seller.sellerId}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const removeRecentSearch = (term: string) => {
    setRecentSearches(prev => {
      const next = prev.filter(s => s !== term);
      try { localStorage.setItem(`nxc-recent-search-${seller.sellerId}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Highlights carousel
  const highlights = seller.highlights?.filter(Boolean) ?? [];
  const [hlIdx, setHlIdx] = useState(0);
  const [hlPaused, setHlPaused] = useState(false);
  const hlTouchStartX = useRef<number | null>(null);
  useEffect(() => {
    if (highlights.length < 2 || hlPaused) return;
    const id = setInterval(() => setHlIdx(i => (i + 1) % highlights.length), 3500);
    return () => clearInterval(id);
  }, [highlights.length, hlPaused]);
  // Each uploaded highlight photo has its own real width:height shape, and
  // no single fixed box shape matches every photo at every screen width —
  // that's what was forcing a choice between cropping a photo (object-cover)
  // or leaving empty bars beside it (object-contain) on some screens. This
  // records each photo's TRUE ratio as it finishes loading (from the actual
  // decoded file, not a guess), so the box itself can be shaped to match
  // the currently-shown photo exactly — full photo, no crop, no bars, on
  // every screen size. Falls back to the site's original 2.63:1 shape for
  // any slide not measured yet (e.g. still loading).
  const [hlAspects, setHlAspects] = useState<Record<number, number>>({});
  const hlAspect = hlAspects[hlIdx] ?? 2.63;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const token = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "nexcart/sellers");
      const up = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const { url } = await up.json();
      if (!url) throw new Error("No URL");
      await fetch("/api/sellers/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ logo: url }),
      });
      setLogoUrl(url);
      toast.success("Logo updated!");
    } catch {
      toast.error("Failed to update logo");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  // Offers — cached 10 min in localStorage, instant on repeat visits
  // Auto-injects a virtual "Flash Sale" offer if seller has isFlashSale products
  const hasFlashSaleProducts = seller.products.some(p => p.isFlashSale);
  const injectFlashSaleOffer = (base: SellerOffer[]): SellerOffer[] => {
    if (!hasFlashSaleProducts) return base;
    if (base.some(o => o.offerType === "FLASH_SALE")) return base;
    return [
      {
        id: "__flash_sale__",
        title: "⚡ Flash Sale",
        description: "Limited-time deals — selected products",
        offerType: "FLASH_SALE",
        badgeColor: null,
        linkedProductId: null,
        selectedProductIds: null,
      } as SellerOffer,
      ...base,
    ];
  };

  useEffect(() => {
    const cacheKey = `nxc-offers-${seller.sellerId}`;
    const FRESH = 10 * 60 * 1000;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.ts && Date.now() - d.ts < FRESH) { setOffers(injectFlashSaleOffer(d.offers ?? [])); return; }
      }
    } catch {}
    fetch(`/api/sellers/${seller.sellerId}/offers`)
      .then(r => r.json())
      .then(d => {
        const finalOffers = injectFlashSaleOffer(d.offers ?? []);
        setOffers(finalOffers);
        try { localStorage.setItem(cacheKey, JSON.stringify({ offers: d.offers ?? [], ts: Date.now() })); } catch {}
      })
      .catch(() => {});
  }, [seller.sellerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow status — no getIdToken() (removes 500-2000ms Firebase delay)
  // Uses cached uid + caches result in localStorage
  useEffect(() => {
    if (isOwner) return;
    const uid = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
    const followCacheKey = `nxc-flw-${seller.sellerId}-${uid ?? "anon"}`;
    const FRESH = 5 * 60 * 1000;
    // Show cached follow state instantly
    try {
      const raw = localStorage.getItem(followCacheKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.ts && Date.now() - d.ts < FRESH) {
          setFollowed(d.followed ?? false);
          setFollowerCount(d.count ?? 0);
          return; // fresh cache, skip API
        }
      }
    } catch {}
    // Fetch fresh (no getIdToken — just uid)
    fetch(`/api/sellers/${seller.sellerId}/follow`, {
      headers: uid ? { Authorization: `Bearer ${uid}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setFollowed(d.followed ?? false);
        setFollowerCount(d.followerCount ?? 0);
        try { localStorage.setItem(followCacheKey, JSON.stringify({ followed: d.followed ?? false, count: d.followerCount ?? 0, ts: Date.now() })); } catch {}
      })
      .catch(() => {});
  }, [seller.sellerId, isOwner, authUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 90);
      if (bannerBgRef.current) {
        bannerBgRef.current.style.transform = `translateY(${Math.min(y * 0.28, 70)}px)`;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setVisibleCount(12);
  }, [activeCategory, sort, searchQuery, minPrice, maxPrice, selectedOfferId, activeCollection]);

  // Flash sale countdown — resets every midnight
  useEffect(() => {
    const getMidnightSecs = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
    };
    setSaleTimer(getMidnightSecs());
    const id = setInterval(() => setSaleTimer(getMidnightSecs()), 1000);
    return () => clearInterval(id);
  }, []);

  // Recently viewed — load from localStorage on mount
  useEffect(() => {
    try {
      const rv: string[] = JSON.parse(localStorage.getItem(`nxc-rv-${seller.sellerId}`) || "[]");
      setRecentlyViewedIds(rv);
    } catch {}
  }, [seller.sellerId]);

  // Wishlist — load from localStorage
  useEffect(() => {
    try {
      const wl: string[] = JSON.parse(localStorage.getItem(`nxc-wl-${seller.sellerId}`) || "[]");
      setWishlist(wl);
    } catch {}
  }, [seller.sellerId]);

  // Spin wheel — show on first visit ONLY to non-owners if seller enabled it
  useEffect(() => {
    if (!seller.spinWheelEnabled) return;
    if (isOwner) return; // owners never see their own spin wheel
    try {
      if (!localStorage.getItem(`nxc-spun-${seller.sellerId}`)) {
        const t = setTimeout(() => {
          setSpinOpen(true);
          // Mark as seen immediately — prevents repeat shows even if dismissed without spinning
          try { localStorage.setItem(`nxc-spun-${seller.sellerId}`, "seen"); } catch {}
        }, 2500);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [seller.sellerId, seller.spinWheelEnabled, isOwner]);

  // Close search suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Real-time viewer tracking — sessionId is persisted in sessionStorage so that
  // page refreshes reuse the same session (prevents phantom viewer inflation).
  // Different browser tabs each have their own sessionStorage → distinct sessions → correct multi-viewer count.
  useEffect(() => {
    const key = `nxc-sv-${seller.sellerId}`;
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, sid);
    }
    const sessionId = sid;
    const ping = () => {
      fetch(`/api/sellers/${seller.sellerId}/viewing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.count != null) setViewingNowCount(d.count); })
        .catch(() => {});
    };
    ping();
    const id = setInterval(ping, 30000);
    return () => clearInterval(id);
  }, [seller.sellerId]);

  // Measure the sticky green header height so the collections row can stick just below it
  useEffect(() => {
    if (!productsRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setStickyHeaderHeight(entry.contentRect.height);
    });
    ro.observe(productsRef.current);
    return () => ro.disconnect();
  }, []);

  // Solid white when the product section has scrolled up behind the collections bar
  const collectionBarRef = useRef<HTMLDivElement>(null);
  const productSentinelRef = useRef<HTMLDivElement>(null);
  // The (non-sticky) "N products on sale" strip that sits between the banner
  // carousel and the collections row — used as the hide-on-scroll activation
  // point, since it's the first thing that scrolls up to meet the now-stuck
  // search bar.
  const announcementStripRef = useRef<HTMLDivElement>(null);

  // Measure the collections row height too, so the hide/show transform below
  // can move it far enough to fully clear the viewport (see headerHidden effect).
  useEffect(() => {
    if (!collectionBarRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setCollectionsBarHeight(entry.contentRect.height);
    });
    ro.observe(collectionBarRef.current);
    return () => ro.disconnect();
  }, [collections.length]);

  // Horizontal scroll progress for the collections row (drives the dot indicator)
  const collScrollRef = useRef<HTMLDivElement>(null);
  const [collScrollProgress, setCollScrollProgress] = useState(0); // 0..1

  const updateCollScrollState = () => {
    const el = collScrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCollScrollProgress(max > 0 ? Math.min(1, Math.max(0, el.scrollLeft / max)) : 0);
  };

  useEffect(() => {
    updateCollScrollState();
    window.addEventListener("resize", updateCollScrollState);
    return () => window.removeEventListener("resize", updateCollScrollState);
  }, [collections.length]);

  // "View All" modal listing every collection
  const [showAllCollections, setShowAllCollections] = useState(false);

  // Debounce ref for auto-scrolling to results while typing/filtering (search, price range, etc.)
  const searchScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => { if (searchScrollTimeoutRef.current) clearTimeout(searchScrollTimeoutRef.current); };
  }, []);

  const scheduleGridScroll = (delay = 500) => {
    if (searchScrollTimeoutRef.current) clearTimeout(searchScrollTimeoutRef.current);
    searchScrollTimeoutRef.current = setTimeout(() => {
      const el = productGridRef.current;
      if (!el) return;
      const filterBarH = productsRef.current?.offsetHeight ?? 0;
      const collectionsBarH = collectionBarRef.current?.offsetHeight ?? 0;
      const top = el.getBoundingClientRect().top + window.scrollY - filterBarH - collectionsBarH - 8;
      window.scrollTo({ top, behavior: "smooth" });
    }, delay);
  };

  useEffect(() => {
    // Sliding up (scroll starts) stays snappy; falling back down (scroll stops)
    // is deliberately slow, per the seller's request.
    const HIDE_TRANSFORM_TRANSITION = "0.28s cubic-bezier(0.22,1,0.36,1)";
    const SHOW_TRANSFORM_TRANSITION = "1.8s cubic-bezier(0.22,1,0.36,1)";

    const applyBarStyle = (behind: boolean, transformTransition: string) => {
      const el = collectionBarRef.current;
      if (!el) return;
      el.style.backgroundColor = behind ? "#ffffff" : "rgba(255,255,255,0.15)";
      el.style.backdropFilter = behind ? "none" : "blur(18px)";
      (el.style as unknown as Record<string, string>).webkitBackdropFilter = behind ? "none" : "blur(18px)";
      // Note: this imperatively owns the `transition` shorthand for this element,
      // so the transform transition (set via the React style prop below) must be
      // repeated in both branches here — otherwise this overwrite would silently
      // strip it and the hide/show slide would lose its animation.
      el.style.transition = behind
        ? `background-color 0.05s, transform ${transformTransition}`
        : `backdrop-filter 0.35s ease, background-color 0.35s ease, transform ${transformTransition}`;
    };
    const check = (transformTransition: string = HIDE_TRANSFORM_TRANSITION) => {
      if (!productSentinelRef.current || !collectionBarRef.current) return;
      const barBottom = collectionBarRef.current.getBoundingClientRect().bottom;
      const sentinelTop = productSentinelRef.current.getBoundingClientRect().top;
      applyBarStyle(sentinelTop <= barBottom, transformTransition);
    };

    const SCROLL_IDLE_MS = 500;
    const handleScroll = () => {
      check();

      // Hiding should only kick in once the (now-stuck) search bar is flush
      // against the "N products on sale" announcement strip — i.e. the banner
      // carousel above it has fully scrolled away and their two green bars
      // are touching. That strip isn't sticky, so it keeps scrolling normally
      // right up until it meets the pinned search bar, which is exactly the
      // moment to key off. Falls back to the collections row (same flush-check)
      // if the strip is dismissed/absent, then to the search bar's own stuck
      // state if there's no collections row either.
      const searchBarHeight = productsRef.current?.offsetHeight ?? 0;
      const pastActivationPoint = announcementStripRef.current
        ? announcementStripRef.current.getBoundingClientRect().top <= searchBarHeight
        : collectionBarRef.current
        ? collectionBarRef.current.getBoundingClientRect().top <= searchBarHeight
        : (productsRef.current?.getBoundingClientRect().top ?? 1) <= 0;
      if (!pastActivationPoint) {
        if (scrollIdleTimerRef.current) {
          clearTimeout(scrollIdleTimerRef.current);
          scrollIdleTimerRef.current = null;
        }
        setHeaderHidden(false);
        return;
      }

      setHeaderHidden(true);
      if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
      scrollIdleTimerRef.current = setTimeout(() => {
        setHeaderHidden(false);
        // Re-sync the blur/solid background now that the bar is visible again —
        // its geometry while translated off-screen isn't a reliable read. Pass
        // the slow "falling down" transition explicitly, since this is the one
        // call site where the bar is actually becoming visible again.
        check(SHOW_TRANSFORM_TRANSITION);
      }, SCROLL_IDLE_MS);
    };

    check();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
    };
  }, []);

  const sellerPhone = seller.user?.phone?.replace(/\D/g, "") ?? "";
  const whatsappUrl = sellerPhone
    ? `https://wa.me/${sellerPhone}?text=${encodeURIComponent(`Hi! I found your store "${seller.storeName}" on NexCart and have a query.`)}`
    : null;

  // Use seller's custom colour if set (flat hex, or a "#hex,#hex" gradient
  // picked in Settings), else fall back to a hash-based colour. `bannerColor2`
  // is the second gradient stop used everywhere the page renders a two-tone
  // brand gradient: an explicit second colour if the seller picked a
  // gradient, otherwise the previous behaviour of an auto-darkened shade of
  // the single colour — so flat-colour sellers see no change at all.
  const parsedStoreColor = parseStoreColor(seller.storeColor);
  const bannerColor = parsedStoreColor?.primary ?? getSellerBannerColor(seller.sellerId);
  const bannerColor2 = parsedStoreColor?.secondary ?? darkenHex(bannerColor, 0.72);
  // Pale picks (cream, ivory, pastel gradients...) would make the banner's
  // white text/icons unreadable. Rather than special-casing every one of
  // them individually, a single dark scrim (rendered just below the banner
  // content) is laid over the whole banner when either stop is light —
  // one check, one fix, and it covers the title, badges, and status pills
  // uniformly regardless of layout.
  const bannerIsLight = isLightColor(bannerColor) || isLightColor(bannerColor2);
  // Page background behind the whole product grid. Empty/unset means
  // "auto" — and "auto" means "match the banner colour", full strength
  // (not a faded tint), so the page background and the banner read as one
  // deliberate colour choice. A saved productBgColor always wins over
  // this, rendered exactly as chosen.
  const parsedPageBgColor = seller.productBgColor ? parseStoreColor(seller.productBgColor) : null;
  const resolvedPageBg = parsedPageBgColor
    ? toCssBackground(parsedPageBgColor)
    : parsedStoreColor
      ? toCssBackground(parsedStoreColor)
      : bannerColor;
  const totalReviews = seller.products.reduce((s, p) => s + (p.reviewCount || 0), 0);
  const displayFollowers = followerCount;

  const completionPct = [
    logoUrl ? 25 : 0,
    seller.description ? 25 : 0,
    seller._count.products >= 1 ? 25 : 0,
    seller.rating > 0 ? 25 : 0,
  ].reduce((a, b) => a + b, 0);

  // Real online status — seller is "online" if lastSeenAt < 5 minutes ago
  const isOnline = !!(
    seller.lastSeenAt &&
    Date.now() - new Date(seller.lastSeenAt as Date).getTime() < 5 * 60 * 1000
  );

  const lastSeenText = (() => {
    if (!seller.lastSeenAt) return null;
    const diff = Date.now() - new Date(seller.lastSeenAt as Date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();

  const isNewProduct = (d: Date) => (Date.now() - new Date(d).getTime()) < 7 * 24 * 60 * 60 * 1000;
  const CIRC_M = 2 * Math.PI * 40;
  const CIRC_D = 2 * Math.PI * 48;

  const fireConfetti = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = [bannerColor, '#fbbf24', '#f43f5e', '#60a5fa', '#34d399', '#a78bfa', '#fb923c'];
    setConfetti(Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      x: cx,
      y: cy,
      color: colors[i % colors.length],
      angle: (i / 20) * 360,
    })));
    setTimeout(() => setConfetti([]), 900);
  };

  const handleFollow = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (followLoading || isOwner) return;
    fireConfetti(e);
    // Optimistic update
    const wasFollowed = followed;
    setFollowed(!wasFollowed);
    setFollowerCount(c => wasFollowed ? Math.max(0, c - 1) : c + 1);
    setFollowLoading(true);
    try {
      const uid = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
      const res = await fetch(`/api/sellers/${seller.sellerId}/follow`, {
        method: "POST",
        credentials: "include",
        headers: uid ? { Authorization: `Bearer ${uid}` } : {},
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setFollowed(data.followed);
      setFollowerCount(data.followerCount);
      // Update follow cache
      try {
        const uid = auth.currentUser?.uid ?? localStorage.getItem("nxc-uid");
        localStorage.setItem(`nxc-flw-${seller.sellerId}-${uid ?? "anon"}`, JSON.stringify({ followed: data.followed, count: data.followerCount, ts: Date.now() }));
      } catch {}
      toast.success(data.followed ? "Now following! You'll get notified of new products." : "Unfollowed store");
    } catch {
      // Rollback
      setFollowed(wasFollowed);
      setFollowerCount(c => wasFollowed ? c + 1 : Math.max(0, c - 1));
      toast.error("Please sign in to follow stores");
    } finally {
      setFollowLoading(false);
    }
  };

  // ── Filter pipeline ──────────────────────────────────────────────────────
  // 1. Category
  const categoryFiltered =
    activeCategory === "All"
      ? seller.products
      : seller.products.filter((p) => p.category?.name === activeCategory);

  // 2. Offer
  const selectedOffer = selectedOfferId ? offers.find(o => o.id === selectedOfferId) : null;
  let selectedOfferProductIds: string[] = [];
  if (selectedOffer && selectedOffer.selectedProductIds) {
    if (typeof selectedOffer.selectedProductIds === "string") {
      try { selectedOfferProductIds = JSON.parse(selectedOffer.selectedProductIds); } catch { selectedOfferProductIds = []; }
    } else if (Array.isArray(selectedOffer.selectedProductIds)) {
      selectedOfferProductIds = selectedOffer.selectedProductIds;
    }
  }
  const hasOfferProducts = selectedOffer && (
    (selectedOffer.linkedProductId && selectedOffer.linkedProductId.trim() !== "") ||
    selectedOfferProductIds.length > 0
  );
  const offerFiltered = selectedOfferId === "__flash_sale__"
    ? categoryFiltered.filter(p => p.isFlashSale)
    : selectedOfferId && hasOfferProducts
    ? categoryFiltered.filter(p => {
        if (!selectedOffer) return true;
        const isInSelectedIds = selectedOfferProductIds.length > 0 && selectedOfferProductIds.includes(p.id);
        const isLinkedProduct = selectedOffer.linkedProductId && selectedOffer.linkedProductId === p.id;
        return isInSelectedIds || isLinkedProduct;
      })
    : categoryFiltered;

  // 3. Collection filter — by explicit productIds if set, else by filterTag; "__new__" is virtual
  const activeCol: StoreCollection | null = activeCollection
    ? (activeCollection === "__new__"
      ? { id: "__new__", name: "New Arrivals", image: null, filterTag: "", productIds: "[]", sortOrder: -1 }
      : collections.find(c => c.id === activeCollection) ?? null)
    : null;
  const collectionFiltered = activeCol
    ? (() => {
        if (activeCol.id === "__new__") {
          return offerFiltered.filter(p => isNewProduct(p.createdAt));
        }
        let ids: string[] = [];
        try { ids = JSON.parse(activeCol.productIds || "[]"); } catch { ids = []; }
        if (ids.length > 0) {
          return offerFiltered.filter(p => ids.includes(p.productId));
        }
        return offerFiltered.filter(p =>
          p.tags && p.tags.some(t => t.toLowerCase() === activeCol.filterTag.toLowerCase())
        );
      })()
    : offerFiltered;

  // 4. Search (client-side, real-time, typo-tolerant with auto-correct)

  // Vocabulary of real words from product names/tags, used for "did you mean" correction
  const searchVocabulary = (() => {
    const words = new Set<string>();
    for (const p of seller.products) {
      p.name.toLowerCase().split(/\s+/).forEach(w => { if (w.length > 2) words.add(w); });
      (p.tags || []).forEach(t => t.toLowerCase().split(/\s+/).forEach(w => { if (w.length > 2) words.add(w); }));
    }
    return Array.from(words);
  })();

  // If the query has a typo (e.g. "manog"), find the closest real word ("mango")
  const correctedQuery = (() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return null;
    const qWords = q.split(/\s+/).filter(Boolean);
    let changed = false;
    const corrected = qWords.map(qw => {
      if (qw.length <= 2 || searchVocabulary.includes(qw)) return qw;
      let best: string | null = null;
      let bestDist = Infinity;
      for (const vw of searchVocabulary) {
        const maxLen = Math.max(vw.length, qw.length);
        const threshold = maxLen <= 4 ? 1 : maxLen <= 7 ? 2 : 3;
        const dist = levenshteinDistance(vw, qw);
        if (dist <= threshold && dist < bestDist) { bestDist = dist; best = vw; }
      }
      if (best && best !== qw) { changed = true; return best; }
      return qw;
    });
    return changed ? corrected.join(" ") : null;
  })();

  const directSearchFiltered = searchQuery.trim()
    ? collectionFiltered.filter(p => fuzzyTextMatch(p.name, searchQuery))
    : collectionFiltered;

  // Fall back to the auto-corrected spelling only if the original query found nothing
  const usingCorrectedQuery = !!(searchQuery.trim() && directSearchFiltered.length === 0 && correctedQuery);
  const searchFiltered = usingCorrectedQuery
    ? collectionFiltered.filter(p => fuzzyTextMatch(p.name, correctedQuery!))
    : directSearchFiltered;

  // 5. Price range
  const priceFiltered = searchFiltered.filter(p => {
    const minVal = minPrice !== "" ? Number(minPrice) : null;
    const maxVal = maxPrice !== "" ? Number(maxPrice) : null;
    if (minVal !== null && p.price < minVal) return false;
    if (maxVal !== null && p.price > maxVal) return false;
    return true;
  });

  // 6. Sort
  const sorted = [...priceFiltered].sort((a, b) => {
    if (sort === "popular")    return b.salesCount - a.salesCount;
    if (sort === "newest")     return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "price_asc")  return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "rating")     return b.rating - a.rating;
    return 0;
  });

  const hasActiveFilters = searchQuery.trim() || minPrice || maxPrice || activeCategory !== "All" || selectedOfferId || activeCollection;
  const visible = sorted.slice(0, visibleCount);

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const newProducts = seller.products.filter(p => isNewProduct(p.createdAt));
  const discountedCount = seller.products.filter(p => p.comparePrice && p.comparePrice > p.price).length;
  const recentlyViewed = recentlyViewedIds
    .map(id => seller.products.find(p => p.productId === id))
    .filter((p): p is typeof seller.products[number] => !!p);
  const youMayLike = !activeCollection && !searchQuery && !selectedOfferId
    ? seller.products
        .filter(p => !visible.find(v => v.id === p.id))
        .sort((a, b) => b.rating - a.rating || b.salesCount - a.salesCount)
        .slice(0, 6)
    : [];

  // Stacked per-collection sections shown on the default (unfiltered) browse
  // view — each Store Collection gets its own labelled shelf (name + that
  // collection's products) rendered one after another in sortOrder, above
  // the flat "All Products" grid. Matching mirrors the circle-filter logic
  // above: explicit productIds first, falling back to filterTag.
  const collectionSections = hasActiveFilters
    ? []
    : collections
        .map((col) => {
          let ids: string[] = [];
          try { ids = JSON.parse(col.productIds || "[]"); } catch { ids = []; }
          const products = ids.length > 0
            ? ids.map(pid => seller.products.find(p => p.productId === pid)).filter((p): p is typeof seller.products[number] => !!p)
            : seller.products.filter(p => col.filterTag && p.tags?.some(t => t.toLowerCase() === col.filterTag.toLowerCase()));
          return { collection: col, products };
        })
        .filter(section => section.products.length > 0);
  // When a search (even after typo-correction) turns up nothing, don't leave
  // the shopper at a dead end — surface the store's most popular items
  // instead, the way Flipkart/Amazon show "you may be interested in" on a
  // zero-result search rather than a bare "no results" page.
  const searchNoResultsSuggestions = (searchQuery.trim() && sorted.length === 0)
    ? [...seller.products]
        .sort((a, b) => b.rating - a.rating || b.salesCount - a.salesCount)
        .slice(0, 8)
    : [];
  const followerMilestone =
    followerCount >= 10000 ? "10K+" :
    followerCount >= 1000  ? "1K+"  :
    followerCount >= 500   ? "500+" :
    followerCount >= 100   ? "100+" : null;

  // Gallery slider
  const gallerySliderRef = useRef<HTMLDivElement>(null);
  const [galCanLeft, setGalCanLeft] = useState(false);
  const [galCanRight, setGalCanRight] = useState(false);
  const galPausedRef = useRef(false);   // paused by user interaction
  const galDirRef = useRef(1);          // 1 = scroll right, -1 = scroll left
  const galRafRef = useRef<number | null>(null);
  const galleryProducts = (seller.galleryProductIds ?? [])
    .map(id => seller.products.find(p => p.productId === id || p.id === id))
    .filter(Boolean) as typeof seller.products;

  const checkGalScroll = () => {
    const el = gallerySliderRef.current;
    if (!el) return;
    setGalCanLeft(el.scrollLeft > 4);
    setGalCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = gallerySliderRef.current;
    if (!el || galleryProducts.length === 0) return;
    checkGalScroll();
    el.addEventListener("scroll", checkGalScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkGalScroll);
  }, [galleryProducts.length]); // eslint-disable-line

  // Auto-scroll: slowly drifts right, reverses when hitting end, pauses on touch/hover
  useEffect(() => {
    if (galleryProducts.length < 2) return;
    const el = gallerySliderRef.current;
    if (!el) return;

    const SPEED = 0.6; // px per frame — slow and smooth

    const step = () => {
      if (!galPausedRef.current && el) {
        el.scrollLeft += SPEED * galDirRef.current;
        const atEnd   = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
        const atStart = el.scrollLeft <= 0;
        if (atEnd)   galDirRef.current = -1; // reached right end → scroll left
        if (atStart) galDirRef.current =  1; // reached left end  → scroll right
        checkGalScroll();
      }
      galRafRef.current = requestAnimationFrame(step);
    };

    galRafRef.current = requestAnimationFrame(step);
    return () => { if (galRafRef.current) cancelAnimationFrame(galRafRef.current); };
  }, [galleryProducts.length]); // eslint-disable-line

  const slideGallery = (dir: "left" | "right") => {
    gallerySliderRef.current?.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" });
  };

  // Gift Registry — add to registry
  const [registryModal, setRegistryModal] = useState<{ name: string; image: string; price: number; productSlug: string } | null>(null);
  const [userRegistries, setUserRegistries] = useState<Array<{ id: string; slug: string; title: string }>>([]);
  const [registriesLoaded, setRegistriesLoaded] = useState(false);
  const [addingToReg, setAddingToReg] = useState<string | null>(null);

  const loadUserRegistries = () => {
    if (registriesLoaded) return;
    const uid = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
    if (!uid) {
      // Not logged in — mark as loaded so the modal shows the "sign in" / create prompt
      setRegistriesLoaded(true);
      return;
    }
    fetch("/api/registry", { headers: { Authorization: `Bearer ${uid}` } })
      .then(r => r.ok ? r.json() : { registries: [] })
      .then(d => { setUserRegistries(d.registries ?? []); })
      .catch(() => { setUserRegistries([]); })
      .finally(() => { setRegistriesLoaded(true); });
  };

  const addToRegistry = async (slug: string) => {
    if (!registryModal) return;
    const uid = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
    if (!uid) return;
    setAddingToReg(slug);
    try {
      const res = await fetch(`/api/registry/${slug}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${uid}` },
        body: JSON.stringify({ name: registryModal.name, image: registryModal.image, price: registryModal.price, productSlug: registryModal.productSlug, quantity: 1 }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Added to registry! 🎁`);
      setRegistryModal(null);
    } catch { toast.error("Failed to add to registry"); }
    finally { setAddingToReg(null); }
  };

  // Returning visitor memory
  const RV_KEY = `nxc-lastprod-${seller.sellerId}`;
  const RV_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  const [returningProduct, setReturningProduct] = useState<{
    name: string; image: string; productId: string; viewedAt: number;
  } | null>(() => {
    try {
      const raw = localStorage.getItem(`nxc-lastprod-${seller.sellerId}`);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d?.viewedAt || Date.now() - d.viewedAt > 7 * 24 * 60 * 60 * 1000) return null;
      return d;
    } catch { return null; }
  });
  const [rvDismissed, setRvDismissed] = useState(false);

  const saveLastProduct = (p: { name: string; images: string[]; productId: string }) => {
    try {
      localStorage.setItem(RV_KEY, JSON.stringify({
        name: p.name,
        image: p.images?.[0] ?? "",
        productId: p.productId,
        viewedAt: Date.now(),
      }));
    } catch {}
  };

  // Shake to discover
  const [shakePopupOpen, setShakePopupOpen] = useState(false);
  const [shakeHintVisible, setShakeHintVisible] = useState(true);
  const lastShakeRef = useRef(0);
  const shakeCountRef = useRef(0);
  const shakeConfig = seller.shakeConfig ?? null;

  const triggerShake = () => {
    if (!shakeConfig?.enabled || shakePopupOpen) return;
    setShakePopupOpen(true);
    setShakeHintVisible(false);
  };

  const requestShakePermission = async () => {
    if (typeof DeviceMotionEvent !== "undefined" && typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === "function") {
      try {
        const perm = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        return perm === "granted";
      } catch { return false; }
    }
    return true;
  };

  // The hint pill is `fixed` at the bottom-right of the viewport so it stays
  // on top of whatever content scrolls underneath it — with no timeout, it
  // used to sit there forever, silently swallowing taps meant for any
  // product card that happened to scroll into that exact screen spot (the
  // reported "can't open the product" bug). Auto-dismissing it after a few
  // seconds keeps the discovery nudge (and the shake gesture itself, which
  // keeps listening in the background) while freeing up that tap area for
  // the product underneath it.
  useEffect(() => {
    if (!shakeConfig?.enabled || !shakeHintVisible) return;
    const t = setTimeout(() => setShakeHintVisible(false), 5000);
    return () => clearTimeout(t);
  }, [shakeConfig?.enabled, shakeHintVisible]);

  useEffect(() => {
    if (!shakeConfig?.enabled) return;
    let listening = false;

    const handleMotion = (e: DeviceMotionEvent) => {
      // Use acceleration WITHOUT gravity so resting phone = ~0 m/s²
      const acc = e.acceleration ?? e.accelerationIncludingGravity;
      if (!acc) return;
      const mag = Math.sqrt((acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2);
      if (mag > 12) {
        const now = Date.now();
        // Cooldown: don't re-trigger within 3s of last shake
        if (now - lastShakeRef.current > 3000) {
          lastShakeRef.current = now;
          triggerShake();
        }
      }
    };

    const startListening = async () => {
      const granted = await requestShakePermission();
      if (granted) {
        window.addEventListener("devicemotion", handleMotion);
        listening = true;
      }
    };

    startListening();
    return () => { if (listening) window.removeEventListener("devicemotion", handleMotion); };
  }, [shakeConfig?.enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Festival theme
  const activeFestival = (seller.festivalThemeEnabled !== false) ? getActiveFestival() : null;
  const floatingBarConfig = seller.floatingBarConfig ?? null;
  const floatingBarPositionClass = floatingBarConfig?.position === "top-left"
    ? "top-4 left-4"
    : floatingBarConfig?.position === "top-center"
      ? "top-4 left-1/2 -translate-x-1/2"
      : floatingBarConfig?.position === "top-right"
        ? "top-4 right-4"
        : floatingBarConfig?.position === "bottom-left"
          ? "bottom-4 left-4"
          : floatingBarConfig?.position === "bottom-center"
            ? "bottom-4 left-1/2 -translate-x-1/2"
            : "bottom-4 right-4";

  // Tags strip — seller's curated quickTags first, then auto from product tags as fallback
  const allProductTags = (() => {
    if (seller.quickTags && seller.quickTags.length > 0) {
      const extra = Array.from(new Set(seller.products.flatMap(p => p.tags || []).filter(t => t?.trim() && !seller.quickTags!.includes(t))));
      return [...seller.quickTags, ...extra].slice(0, 20);
    }
    return Array.from(new Set(seller.products.flatMap(p => p.tags || []).filter(t => t?.trim()))).slice(0, 15);
  })();

  // Smart search suggestions (max 5)
  const searchSuggestions = searchQuery.trim().length >= 1
    ? seller.products
        .filter(p => fuzzyTextMatch(p.name, searchQuery))
        .slice(0, 5)
    : [];

  // Flipkart-style live-typing fallbacks for the search dropdown:
  // when the query so far matches nothing, show a small set of popular
  // products instead of an empty box, and a couple of matching tags as
  // one-tap alternate search terms.
  const dropdownFallbackProducts = (searchQuery.trim().length >= 1 && searchSuggestions.length === 0)
    ? [...seller.products]
        .sort((a, b) => b.rating - a.rating || b.salesCount - a.salesCount)
        .slice(0, 4)
    : [];
  const dropdownTagSuggestions = searchQuery.trim().length >= 1
    ? allProductTags.filter(t => fuzzyTextMatch(t, searchQuery)).slice(0, 6)
    : allProductTags.slice(0, 8);

  // Wishlist products
  const wishlistProducts = wishlist
    .map(id => seller.products.find(p => p.productId === id))
    .filter((p): p is typeof seller.products[number] => !!p);

  // Comparison products
  const compareProducts = compareIds
    .map(id => seller.products.find(p => p.id === id))
    .filter((p): p is typeof seller.products[number] => !!p);

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setWishlist(prev => {
      const next = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      try { localStorage.setItem(`nxc-wl-${seller.sellerId}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const toggleCompare = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCompareIds(prev => {
      if (prev.includes(productId)) return prev.filter(id => id !== productId);
      if (prev.length >= 2) { toast.info("Select up to 2 products to compare"); return prev; }
      return [...prev, productId];
    });
  };

  const handleSpin = () => {
    if (spinning || spinWon) return;
    setSpinning(true);
    const segCount = wheelSegments.length;
    const winnerIdx = Math.floor(Math.random() * segCount);
    const segAngle = 360 / segCount;
    const extraSpins = 1440;
    const winnerCenterAngle = winnerIdx * segAngle + segAngle / 2;
    const currentMod = spinDegRef.current % 360;
    const targetMod = (360 - winnerCenterAngle + 360) % 360;
    const additionalAngle = ((targetMod - currentMod + 360) % 360) + extraSpins;
    const newTotalDeg = spinDegRef.current + additionalAngle;
    spinDegRef.current = newTotalDeg;
    setSpinDeg(newTotalDeg);
    setTimeout(() => {
      setSpinning(false);
      setSpinWon(wheelSegments[winnerIdx]);
      if (wheelSegments[winnerIdx].code) {
        try { localStorage.setItem(`nxc-spun-${seller.sellerId}`, "1"); } catch {}
      }
    }, 4200);
  };

  return (
    <div>
      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(22px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .card-anim { animation: cardIn 0.38s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes collPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.18); }
          70%  { transform: scale(0.93); }
          100% { transform: scale(1); }
        }
        .coll-pop { animation: collPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes flashPulse { 0%,100%{opacity:1} 50%{opacity:0.55} }
        .flash-pulse { animation: flashPulse 1.1s ease-in-out infinite; }
        @keyframes bannerSlide { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .banner-slide { animation: bannerSlide 0.3s ease-out both; }
        @keyframes rvSlide { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
        .rv-slide { animation: rvSlide 0.35s ease-out both; }
        @keyframes modalIn { from{opacity:0;transform:scale(0.92) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .modal-in { animation: modalIn 0.32s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes drawerUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        .drawer-up { animation: drawerUp 0.34s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes tagIn { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
        .tag-in { animation: tagIn 0.22s ease-out both; }
      `}</style>
      {floatingBarConfig?.enabled && (
        <div
          className={`fixed z-[120] max-w-[min(92vw,440px)] rounded-2xl border border-white/20 px-4 py-3 shadow-2xl backdrop-blur ${floatingBarPositionClass}`}
          style={{ background: floatingBarConfig.backgroundColor || "#111827", color: floatingBarConfig.textColor || "#ffffff" }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold leading-snug">{floatingBarConfig.message?.trim() || "Limited-time offers are live"}</p>
            {floatingBarConfig.ctaText && (
              floatingBarConfig.ctaLink ? (
                <a
                  href={floatingBarConfig.ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] font-bold transition-colors hover:bg-white/20"
                >
                  {floatingBarConfig.ctaText}
                </a>
              ) : (
                <span className="shrink-0 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] font-bold">
                  {floatingBarConfig.ctaText}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {/* ── CONFETTI OVERLAY ── */}
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {confetti.map(p => (
            <div key={p.id} style={{
              position: 'fixed',
              left: p.x,
              top: p.y,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: p.color,
              animation: 'nxc-confetti 0.85s ease-out forwards',
              ['--tx' as string]: `${Math.cos(p.angle * Math.PI / 180) * 72}px`,
              ['--ty' as string]: `${Math.sin(p.angle * Math.PI / 180) * 72}px`,
              ['--rot' as string]: `${p.angle * 4}deg`,
            }} />
          ))}
        </div>
      )}

      {/* ── SPIN WHEEL MODAL ── */}
      {spinOpen && (
        <>
          <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm" onClick={() => !spinning && setSpinOpen(false)} />
          <div className="fixed inset-0 z-[151] flex items-center justify-center p-4 pointer-events-none">
            <div className="modal-in pointer-events-auto w-full max-w-sm rounded-3xl bg-background shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative px-6 py-5 text-center" style={{ background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor2})` }}>
                <button onClick={() => !spinning && setSpinOpen(false)} className="absolute right-4 top-4 text-white/60 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
                <div className="text-3xl mb-1">🎡</div>
                <h2 className="text-xl font-black text-white">Spin to Win!</h2>
                <p className="text-sm text-white/75 mt-0.5">First-time visitors get one free spin</p>
              </div>

              <div className="px-6 py-5">
                {!spinWon ? (
                  <>
                    {/* Wheel */}
                    <div className="relative mx-auto w-56 h-56 mb-5">
                      {/* Pointer */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                        <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-red-500 drop-shadow-md" />
                      </div>
                      <div
                        className="w-full h-full rounded-full overflow-hidden shadow-2xl border-4 border-white"
                        style={{
                          transform: `rotate(${spinDeg}deg)`,
                          transition: spinning ? "transform 4.2s cubic-bezier(0.17,0.67,0.12,0.99)" : "none",
                        }}
                      >
                        <svg viewBox="0 0 200 200" className="w-full h-full">
                          {wheelSegments.map((seg, i) => {
                            const count = wheelSegments.length;
                            const angle = (2 * Math.PI) / count;
                            const start = i * angle - Math.PI / 2;
                            const end = (i + 1) * angle - Math.PI / 2;
                            const x1 = 100 + 98 * Math.cos(start);
                            const y1 = 100 + 98 * Math.sin(start);
                            const x2 = 100 + 98 * Math.cos(end);
                            const y2 = 100 + 98 * Math.sin(end);
                            const mid = (start + end) / 2;
                            const tx = 100 + 66 * Math.cos(mid);
                            const ty = 100 + 66 * Math.sin(mid);
                            const rot = (mid * 180 / Math.PI) + 90;
                            return (
                              <g key={i}>
                                <path d={`M 100 100 L ${x1} ${y1} A 98 98 0 0 1 ${x2} ${y2} Z`} fill={seg.color} stroke="white" strokeWidth="1.5" />
                                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="8" fontWeight="bold" transform={`rotate(${rot},${tx},${ty})`}>{seg.label}</text>
                              </g>
                            );
                          })}
                          <circle cx="100" cy="100" r="16" fill="white" />
                          <circle cx="100" cy="100" r="13" fill="#1f2937" />
                        </svg>
                      </div>
                    </div>
                    <button
                      onClick={handleSpin}
                      disabled={spinning}
                      className="w-full rounded-2xl py-3.5 text-base font-black text-white transition-all active:scale-[0.97] disabled:opacity-60"
                      style={{ background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor2})`, boxShadow: `0 6px 20px ${hexToRgba(bannerColor, 0.45)}` }}
                    >
                      {spinning ? "Spinning... 🌀" : "🎰 SPIN NOW"}
                    </button>
                    <p className="text-center text-xs text-muted-foreground mt-3">One spin per visitor · No purchase required</p>
                  </>
                ) : (
                  <div className="text-center py-2">
                    {spinWon.code ? (
                      <>
                        <div className="text-5xl mb-3">🎉</div>
                        <p className="text-lg font-black text-foreground mb-1">You won {spinWon.label}!</p>
                        <p className="text-sm text-muted-foreground mb-4">Use this code at checkout</p>
                        <div
                          className="flex items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 mb-4 cursor-pointer active:scale-[0.98] transition-all"
                          style={{ borderColor: bannerColor, background: hexToRgba(bannerColor, 0.06) }}
                          onClick={() => { navigator.clipboard.writeText(spinWon?.code ?? "").catch(() => {}); setSpinCopied(true); }}
                        >
                          <span className="text-xl font-black tracking-widest" style={{ color: bannerColor }}>{spinWon.code}</span>
                          <span className="text-xs font-bold" style={{ color: bannerColor }}>{spinCopied ? "✓ Copied!" : "Tap to copy"}</span>
                        </div>
                        <button
                          onClick={() => setSpinOpen(false)}
                          className="w-full rounded-2xl py-3 text-sm font-bold text-white"
                          style={{ background: bannerColor }}
                        >
                          Start Shopping! →
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-5xl mb-3">😅</div>
                        <p className="text-lg font-bold text-foreground mb-1">Better luck next time!</p>
                        <p className="text-sm text-muted-foreground mb-4">No discount this time, but we have great deals!</p>
                        <button onClick={() => setSpinOpen(false)} className="w-full rounded-2xl py-3 text-sm font-bold text-white" style={{ background: bannerColor }}>
                          Shop Now →
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── GIFT REGISTRY MODAL ── */}
      {registryModal && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" onClick={() => setRegistryModal(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[91] rounded-t-3xl bg-white dark:bg-card shadow-2xl" style={{ animation: "drawerUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-muted-foreground/25" /></div>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-pink-500" />
                  <h3 className="font-bold text-[16px]">Add to Registry</h3>
                </div>
                <button onClick={() => setRegistryModal(null)} className="rounded-full p-1.5 hover:bg-muted transition-colors"><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>

              {/* Product preview */}
              <div className="flex items-center gap-3 rounded-xl bg-muted/30 border border-border/50 p-3 mb-4">
                {registryModal.image && <img src={registryModal.image} alt={registryModal.name} className="h-12 w-12 rounded-lg object-contain bg-white border border-border/40 shrink-0" />}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate">{registryModal.name}</p>
                  <p className="text-[12px] text-muted-foreground">₹{registryModal.price.toLocaleString("en-IN")}</p>
                </div>
              </div>

              {/* Registry list */}
              {!registriesLoaded ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : userRegistries.length === 0 ? (
                <div className="text-center py-6 space-y-3">
                  <div className="text-4xl">🎁</div>
                  <p className="text-sm text-muted-foreground">You don&apos;t have any registries yet</p>
                  <a href="/registry" className="inline-flex items-center gap-1.5 rounded-xl bg-foreground text-background px-4 py-2 text-[13px] font-bold hover:opacity-90">
                    <Gift className="h-4 w-4" /> Create Registry
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[12px] text-muted-foreground font-medium mb-2">Choose a registry:</p>
                  {userRegistries.map(reg => (
                    <button
                      key={reg.id}
                      onClick={() => addToRegistry(reg.slug)}
                      disabled={addingToReg === reg.slug}
                      className="w-full flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3 text-left hover:bg-muted/40 transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg">🎁</span>
                        <span className="text-[13px] font-semibold truncate">{reg.title}</span>
                      </div>
                      {addingToReg === reg.slug ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                      ) : (
                        <span className="text-[12px] font-bold shrink-0" style={{ color: bannerColor }}>Add →</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="h-6" />
            </div>
          </div>
        </>
      )}

      {/* ── SHAKE TO DISCOVER ── */}
      {shakeConfig?.enabled && (
        <>
          <style>{`
            @keyframes shake-sheet-up {
              0%   { transform: translateY(100%); opacity: 0; }
              60%  { transform: translateY(-8px);  opacity: 1; }
              80%  { transform: translateY(4px);   opacity: 1; }
              100% { transform: translateY(0);     opacity: 1; }
            }
            @keyframes shake-overlay-in {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes shake-badge-pop {
              0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
              70%  { transform: scale(1.18) rotate(5deg); opacity: 1; }
              100% { transform: scale(1) rotate(0deg);  opacity: 1; }
            }
          `}</style>

          {/* Floating hint button — mobile only */}
          {shakeHintVisible && (
            <button
              onClick={async () => { const ok = await requestShakePermission(); if (ok) triggerShake(); }}
              className="fixed bottom-24 right-4 z-[70] sm:hidden flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[12px] font-bold text-white shadow-2xl active:scale-95 transition-transform"
              style={{ background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor2})`, boxShadow: `0 6px 24px ${hexToRgba(bannerColor, 0.55)}` }}
            >
              <span className="text-base animate-bounce">📳</span> Shake me!
            </button>
          )}

          {/* Bottom-sheet overlay */}
          {shakePopupOpen && (
            <>
              {/* Dim backdrop */}
              <div
                className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-[3px]"
                style={{ animation: "shake-overlay-in 0.25s ease both" }}
                onClick={() => setShakePopupOpen(false)}
              />

              {/* Bottom sheet — slides up with spring bounce */}
              <div
                className="fixed bottom-0 left-0 right-0 z-[91] rounded-t-[28px] overflow-hidden bg-white dark:bg-card shadow-[0_-8px_40px_rgba(0,0,0,0.22)]"
                style={{ animation: "shake-sheet-up 0.5s cubic-bezier(0.22,1,0.36,1) both", maxHeight: "88vh", overflowY: "auto" }}
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
                </div>

                {/* Coloured header bar */}
                <div
                  className="mx-4 mb-4 rounded-2xl px-4 py-3.5 flex items-center justify-between"
                  style={{ background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor2})` }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-xl"
                      style={{ animation: "shake-badge-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" }}
                    >🎲</span>
                    <div>
                      <p className="font-black text-[15px] text-white leading-tight">
                        {shakeConfig.type === "product"  ? "Special Pick For You!"  :
                         shakeConfig.type === "category" ? "Shop This Category!"    :
                         shakeConfig.type === "message"  ? seller.storeName + " says:" :
                         "Check This Out!"}
                      </p>
                      <p className="text-[10px] text-white/65 font-medium">Shake discovery</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShakePopupOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 active:bg-white/30 transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>

                {/* ── PRODUCT ── */}
                {shakeConfig.type === "product" && shakeConfig.product && (() => {
                  const p = shakeConfig.product!;
                  const disc = p.comparePrice && p.comparePrice > p.price
                    ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0;
                  return (
                    <div className="px-4 pb-6">
                      {/* Image card */}
                      <div className="relative rounded-2xl overflow-hidden bg-muted/30 mb-4" style={{ height: 220 }}>
                        {p.image && (
                          <img src={p.image} alt={p.name} className="w-full h-full object-contain p-4" />
                        )}
                        {disc > 0 && (
                          <span className="absolute top-3 left-3 rounded-xl bg-red-500 px-2.5 py-1 text-[11px] font-black text-white shadow-lg">
                            -{disc}%
                          </span>
                        )}
                        {/* Shimmer top edge */}
                        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${hexToRgba(bannerColor, 0.4)}, transparent)` }} />
                      </div>

                      {/* Info */}
                      <p className="font-bold text-[18px] text-foreground leading-snug mb-1">{p.name}</p>
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-[26px] font-black text-foreground">₹{p.price.toLocaleString("en-IN")}</span>
                        {p.comparePrice && (
                          <span className="text-[15px] line-through text-muted-foreground">₹{p.comparePrice.toLocaleString("en-IN")}</span>
                        )}
                        {disc > 0 && (
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: "#16a34a" }}>
                            {disc}% off
                          </span>
                        )}
                      </div>

                      <a
                        href={`/product/${p.productId}`}
                        onClick={() => setShakePopupOpen(false)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-black text-white shadow-lg active:scale-[0.98] transition-transform"
                        style={{ background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor2})`, boxShadow: `0 6px 20px ${hexToRgba(bannerColor, 0.45)}` }}
                      >
                        View Product →
                      </a>
                    </div>
                  );
                })()}

                {/* ── CATEGORY ── */}
                {shakeConfig.type === "category" && shakeConfig.category && (
                  <div className="px-4 pb-6 text-center space-y-4">
                    <div className="text-6xl py-4">🏷️</div>
                    <p className="text-[22px] font-black text-foreground">{shakeConfig.category}</p>
                    <p className="text-[13px] text-muted-foreground">Tap below to see all products in this category</p>
                    <button
                      onClick={() => { setActiveCategory(shakeConfig.category!); setShakePopupOpen(false); productGridRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                      className="w-full rounded-2xl py-4 text-[15px] font-black text-white"
                      style={{ background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor2})`, boxShadow: `0 6px 20px ${hexToRgba(bannerColor, 0.45)}` }}
                    >
                      Show {shakeConfig.category} →
                    </button>
                  </div>
                )}

                {/* ── MESSAGE ── */}
                {shakeConfig.type === "message" && shakeConfig.message && (
                  <div className="px-4 pb-6 text-center space-y-3">
                    <div className="text-6xl py-4">{shakeConfig.message.emoji || "💬"}</div>
                    <p className="text-[20px] font-black text-foreground">{shakeConfig.message.title}</p>
                    <p className="text-[14px] text-muted-foreground leading-relaxed px-2">{shakeConfig.message.body}</p>
                    <button
                      onClick={() => setShakePopupOpen(false)}
                      className="mt-2 w-full rounded-2xl py-4 text-[15px] font-black text-white"
                      style={{ background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor2})`, boxShadow: `0 6px 20px ${hexToRgba(bannerColor, 0.45)}` }}
                    >
                      Start Shopping →
                    </button>
                  </div>
                )}

                {/* ── BANNER ── */}
                {shakeConfig.type === "banner" && shakeConfig.banner && (
                  <div className="px-4 pb-6 space-y-4">
                    {shakeConfig.banner.link ? (
                      <a href={shakeConfig.banner.link} target="_blank" rel="noopener noreferrer" onClick={() => setShakePopupOpen(false)}>
                        <img src={shakeConfig.banner.url} alt="Store banner" className="w-full rounded-2xl object-cover" style={{ maxHeight: 260 }} />
                      </a>
                    ) : (
                      <img src={shakeConfig.banner.url} alt="Store banner" className="w-full rounded-2xl object-cover" style={{ maxHeight: 260 }} />
                    )}
                    <button
                      onClick={() => setShakePopupOpen(false)}
                      className="w-full rounded-2xl py-4 text-[15px] font-black text-white"
                      style={{ background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor2})`, boxShadow: `0 6px 20px ${hexToRgba(bannerColor, 0.45)}` }}
                    >
                      Got it! Shop Now →
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ── COMPARISON DRAWER ── */}
      {compareOpen && compareProducts.length === 2 && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/55" onClick={() => setCompareOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[81] drawer-up rounded-t-2xl bg-background shadow-2xl" style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 sticky top-0 bg-background z-10" style={{ borderTopColor: bannerColor, borderTopWidth: 3 }}>
              <h3 className="font-bold text-[15px]">Comparing 2 Products</h3>
              <button onClick={() => setCompareOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {compareProducts.map(p => (
                  <div key={p.id} className="space-y-3">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/30 border border-border/40">
                      {p.images[0]
                        ? <Image src={p.images[0]} alt={p.name} fill className="object-contain p-3" />
                        : <div className="h-full flex items-center justify-center"><Package className="h-8 w-8 opacity-25" /></div>}
                    </div>
                    <p className="text-[13px] font-bold leading-snug line-clamp-2">{p.name}</p>
                  </div>
                ))}
              </div>
              {/* Comparison rows */}
              {[
                { label: "Price", values: compareProducts.map(p => <span key={p.id} className="font-bold text-[15px]" style={{ color: bannerColor }}>₹{p.price.toLocaleString()}</span>) },
                { label: "Discount", values: compareProducts.map(p => p.comparePrice && p.comparePrice > p.price
                  ? <span key={p.id} className="text-[12px] font-bold text-green-600">-{Math.round((1 - p.price / p.comparePrice) * 100)}% off</span>
                  : <span key={p.id} className="text-[12px] text-muted-foreground">—</span>) },
                { label: "Rating", values: compareProducts.map(p => <span key={p.id} className="text-[13px] font-semibold">⭐ {p.rating.toFixed(1)} <span className="text-muted-foreground text-[11px]">({p.reviewCount})</span></span>) },
                { label: "Category", values: compareProducts.map(p => <span key={p.id} className="text-[12px]">{p.category?.name || "—"}</span>) },
                { label: "Stock", values: compareProducts.map(p => <span key={p.id} className={`text-[12px] font-semibold ${p.stock === 0 ? "text-destructive" : p.stock <= 5 ? "text-orange-500" : "text-green-600"}`}>{p.stock === 0 ? "Out of stock" : p.stock <= 5 ? `Only ${p.stock} left` : "In stock"}</span>) },
                { label: "Condition", values: compareProducts.map(p => <span key={p.id} className="text-[12px] capitalize">{p.condition?.toLowerCase().replace("_", " ") || "Original"}</span>) },
              ].map(row => (
                <div key={row.label} className="grid grid-cols-[80px_1fr_1fr] items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{row.label}</span>
                  {row.values}
                </div>
              ))}
              {/* View buttons */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {compareProducts.map(p => (
                  <button key={p.id} onClick={() => { router.push(`/product/${p.productId}`); setCompareOpen(false); }}
                    className="rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: bannerColor }}>
                    View Product →
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── QUICK VIEW DRAWER ── */}
      {quickViewProduct && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/55" onClick={() => setQuickViewProduct(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[71] rounded-t-2xl bg-background shadow-2xl overflow-hidden" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60" style={{ borderTopColor: bannerColor, borderTopWidth: 3 }}>
              <h3 className="font-semibold text-[15px] line-clamp-1 pr-4">{quickViewProduct.name}</h3>
              <button onClick={() => setQuickViewProduct(null)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Image gallery */}
              <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/40 border border-border/40">
                {quickViewProduct.images[quickViewImg] ? (
                  <Image src={quickViewProduct.images[quickViewImg]} alt={quickViewProduct.name} fill className="object-contain p-4" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">No image</div>
                )}
              </div>
              {quickViewProduct.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {quickViewProduct.images.map((img, i) => (
                    <button key={i} onClick={() => setQuickViewImg(i)}
                      className="h-14 w-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all"
                      style={{ borderColor: quickViewImg === i ? bannerColor : 'transparent' }}
                    >
                      <Image src={img} alt="" width={56} height={56} className="object-cover h-full w-full" />
                    </button>
                  ))}
                </div>
              )}
              {/* Price row */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl font-bold">₹{quickViewProduct.price.toLocaleString()}</span>
                {quickViewProduct.comparePrice && quickViewProduct.comparePrice > quickViewProduct.price && (
                  <>
                    <span className="text-sm text-muted-foreground line-through">₹{quickViewProduct.comparePrice.toLocaleString()}</span>
                    <span className="text-[11px] font-bold text-white rounded-full px-2 py-0.5" style={{ background: bannerColor }}>
                      -{Math.round((1 - quickViewProduct.price / quickViewProduct.comparePrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
              {/* Rating + category */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold">{quickViewProduct.rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({quickViewProduct.reviewCount} reviews)</span>
                </div>
                {quickViewProduct.category && (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ background: hexToRgba(bannerColor, 0.85) }}>
                    {quickViewProduct.category.name}
                  </span>
                )}
                {quickViewProduct.stock <= 5 && quickViewProduct.stock > 0 && (
                  <span className="text-xs font-semibold text-orange-500">Only {quickViewProduct.stock} left!</span>
                )}
              </div>
              {/* CTA */}
              <button
                onClick={() => { router.push(`/product/${quickViewProduct.productId}`); setQuickViewProduct(null); }}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98]"
                style={{ background: bannerColor, boxShadow: `0 4px 18px ${hexToRgba(bannerColor, 0.40)}` }}
              >
                View Full Product →
              </button>
            </div>
          </div>
        </>
      )}


      {/* ── BANNER ── */}
      {/* This is the actual "banner" surface a seller sees when they pick a
          colour in Settings — it must render the real two-tone gradient
          (bannerColor -> bannerColor2), not just the flat primary colour,
          or a chosen gradient preset would visually collapse to a solid. */}
      <div className="relative w-full overflow-hidden" style={{ background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor2})` }}>
        {/* Shimmer sweep animation */}
        <style>{`
          @keyframes nxc-shimmer { 0%{left:-60%} 60%,100%{left:130%} }
          .nxc-shimmer{animation:nxc-shimmer 6s ease-in-out infinite;position:absolute;top:0;height:100%;width:38%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent);pointer-events:none;transform:skewX(-18deg)}
          @keyframes nxc-mesh{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(15px,-15px) scale(1.08)}66%{transform:translate(-10px,10px) scale(0.95)}}
          @keyframes nxc-mesh2{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(-12px,12px) scale(1.06)}75%{transform:translate(8px,-8px) scale(0.98)}}
          @keyframes nxc-confetti{0%{transform:translate(0,0) rotate(0deg) scale(1);opacity:1}100%{transform:translate(var(--tx),var(--ty)) rotate(var(--rot)) scale(0.2);opacity:0}}
          @keyframes nxc-hl-ken{0%{transform:scale(1) translateX(0)}100%{transform:scale(1.06) translateX(-1.5%)}}
          @keyframes nxc-ring-breathe{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.05)}}
          @keyframes nxc-ring-glow{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.12)}}
          @keyframes nxc-name-shine{0%{opacity:0;transform:translateX(-120%) skewX(-18deg)}15%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translateX(340%) skewX(-18deg)}}
          .nxc-name-shine{animation:nxc-name-shine 1.6s ease-out 0.4s 1 both;position:absolute;inset:-2px;background:linear-gradient(90deg,transparent 20%,rgba(255,255,255,0.28) 50%,transparent 80%);pointer-events:none;border-radius:4px}
        `}</style>

        {/* Hidden file input — always in DOM for both mobile + desktop */}
        {isOwner && <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />}

        {seller.banner && (
          <Image src={seller.banner} alt="" fill className="object-cover opacity-30" />
        )}
        <div ref={bannerBgRef} className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(147,197,253,0.15),transparent_60%)] will-change-transform" />
        {/* Shimmer element */}
        <div className="nxc-shimmer" />
        {/* Animated mesh gradient orbs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full pointer-events-none" style={{ background: hexToRgba(bannerColor, 0.35), filter: 'blur(60px)', animation: 'nxc-mesh 8s ease-in-out infinite' }} />
        <div className="absolute -bottom-12 -right-12 w-56 h-56 rounded-full pointer-events-none" style={{ background: hexToRgba(bannerColor, 0.28), filter: 'blur(44px)', animation: 'nxc-mesh2 10s ease-in-out infinite' }} />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.05)', filter: 'blur(32px)', animation: 'nxc-mesh 14s ease-in-out infinite reverse' }} />
        {/* SVG grain/noise texture */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <filter id="nxc-noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
          <rect width="100%" height="100%" filter="url(#nxc-noise)" />
        </svg>
        {/* Dark vignette at top — creates depth, text pops */}
        <div className="absolute top-0 inset-x-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 60%, transparent 100%)' }} />
        {/* Warm colour glow at bottom — based on banner colour */}
        <div className="absolute bottom-0 inset-x-0 h-40 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 100%, ${hexToRgba(bannerColor, 0.75)} 0%, ${hexToRgba(bannerColor, 0.45)} 35%, transparent 70%)` }} />
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none" style={{ background: `linear-gradient(to bottom, transparent, ${hexToRgba(darkenHex(bannerColor, 0.6), 0.4)})` }} />
        {/* Light-colour safety scrim — only rendered when the seller picked a
            pale colour (cream, ivory, pastel gradient...). Sits above the
            decorative layers but below the z-10 content, so it uniformly
            darkens the whole banner and keeps the white title/badges/status
            pills readable without special-casing each one. */}
        {bannerIsLight && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.32) 45%, rgba(0,0,0,0.4) 100%)', zIndex: 1 }}
          />
        )}

        {/* Festival overlay */}
        {activeFestival && (
          activeFestival.name === "Diwali" ? (
            <>
              <style>{`
                @keyframes dw-bulb  { 0%,100%{opacity:1} 48%,52%{opacity:0.2} }
                @keyframes dw-rise  { 0%{transform:translateY(0);opacity:0.9} 100%{transform:translateY(-100px);opacity:0} }
                @keyframes dw-glow  { 0%,100%{opacity:0.45} 50%{opacity:0.85} }
                @keyframes dw-drift { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-6px) scale(1.08)} }
              `}</style>

              {/* ── Deep jewel-toned night overlay ── */}
              <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:'linear-gradient(180deg,rgba(25,8,55,0.72) 0%,rgba(55,20,8,0.5) 55%,rgba(35,12,5,0.62) 100%)' }} />

              {/* ── Fine gold shimmer lines ── */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:'2.5px', pointerEvents:'none', background:'linear-gradient(90deg,transparent 0%,rgba(255,210,60,0.0) 10%,rgba(255,215,80,0.9) 30%,rgba(255,230,120,1) 50%,rgba(255,215,80,0.9) 70%,rgba(255,210,60,0.0) 90%,transparent 100%)', boxShadow:'0 0 18px 4px rgba(255,200,50,0.55)' }} />
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'2px', pointerEvents:'none', background:'linear-gradient(90deg,transparent 5%,rgba(255,200,50,0.7) 25%,rgba(255,220,90,0.9) 50%,rgba(255,200,50,0.7) 75%,transparent 95%)' }} />

              {/* ── String lights ── */}
              <div style={{ position:'absolute', top:0, left:0, right:0, pointerEvents:'none', zIndex:4 }}>
                <div style={{ position:'absolute', top:'11px', left:'1%', right:'1%', height:'1px', background:'rgba(210,190,130,0.35)' }} />
                <div style={{ display:'flex', justifyContent:'space-around', padding:'0 2%' }}>
                  {[
                    {c:'#ff2020',g:'#ff000055'},{c:'#ff8800',g:'#ff770055'},{c:'#ffdd00',g:'#ffcc0055'},
                    {c:'#22dd44',g:'#00cc0055'},{c:'#2288ff',g:'#0055ff55'},{c:'#cc22ff',g:'#aa00ff55'},
                    {c:'#ff2299',g:'#ff007755'},{c:'#ff6600',g:'#ff440055'},{c:'#ffdd00',g:'#ffcc0055'},
                    {c:'#22dd44',g:'#00cc0055'},{c:'#ff2020',g:'#ff000055'},{c:'#cc22ff',g:'#aa00ff55'},
                    {c:'#2288ff',g:'#0055ff55'},{c:'#ff8800',g:'#ff770055'},{c:'#ff2299',g:'#ff007755'},
                    {c:'#ffdd00',g:'#ffcc0055'},{c:'#22dd44',g:'#00cc0055'},{c:'#cc22ff',g:'#aa00ff55'},
                  ].map(({c,g},i)=>(
                    <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                      <div style={{ width:'1px', height:'9px', background:'rgba(200,175,110,0.4)' }} />
                      <div style={{ width:'10px', height:'15px', borderRadius:'50% 50% 45% 45% / 35% 35% 65% 65%', background:`radial-gradient(ellipse at 33% 28%, rgba(255,255,255,0.75) 0%, ${c} 55%)`, boxShadow:`0 0 8px 4px ${c}88, 0 0 22px 8px ${g}`, animation:`dw-bulb ${1.4+(i%5)*0.35}s ease-in-out infinite`, animationDelay:`${(i*0.22)%2.4}s` }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 12 small gold & amber particles floating up ── */}
              {Array.from({length:12},(_,i)=>(
                <div key={i} style={{ position:'absolute', bottom:`${4+(i*6)%18}%`, left:`${(i*8+5)%91}%`, width:`${3+(i%3)}px`, height:`${3+(i%3)}px`, borderRadius:'50%', background: i%3===0?'#ffd700':i%3===1?'#ff9900':'#fff5c0', boxShadow: i%3===0?'0 0 8px 4px rgba(255,215,0,0.9)':'0 0 6px 3px rgba(255,140,0,0.7)', pointerEvents:'none', animation:`dw-rise ${3.5+i*0.55}s ease-in infinite`, animationDelay:`${i*0.5}s` }} />
              ))}

              {/* ── 3 premium diyas — centered, slow drift ── */}
              {[28,50,72].map((left,i)=>(
                <div key={i} style={{ position:'absolute', bottom:'6px', left:`${left}%`, transform:'translateX(-50%)', fontSize:'22px', pointerEvents:'none', zIndex:3, filter:'drop-shadow(0 0 12px rgba(255,145,0,1)) drop-shadow(0 0 28px rgba(255,75,0,0.65)) drop-shadow(0 0 48px rgba(255,120,0,0.35))', animation:`dw-drift ${2.8+i*0.5}s ease-in-out infinite`, animationDelay:`${i*0.7}s` }}>🪔</div>
              ))}

              {/* ── Warm radial glow from bottom — candlelight ── */}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'55%', pointerEvents:'none', background:'radial-gradient(ellipse at 50% 100%, rgba(255,125,0,0.4) 0%, rgba(255,165,0,0.18) 38%, transparent 68%)', animation:'dw-glow 3s ease-in-out infinite' }} />

              {/* ── Top dark vignette so bulbs pop ── */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:'36px', pointerEvents:'none', background:'linear-gradient(to bottom, rgba(0,0,0,0.42), transparent)' }} />
            </>
          ) : (
            <>
              <div style={{ position:'absolute', inset:0, pointerEvents:'none', background:`radial-gradient(ellipse at 50% 0%,${activeFestival.overlay},transparent 70%)` }} />
              <style>{`@keyframes nxc-float-up{0%{transform:translateY(0);opacity:0.85}100%{transform:translateY(-90px);opacity:0}}`}</style>
              {[15,35,55,75,90].map((left,i)=>(
                <span key={i} style={{ position:'absolute', bottom:'10px', left:`${left}%`, fontSize:'20px', pointerEvents:'none', animation:`nxc-float-up ${3+i*0.5}s ease-in infinite`, animationDelay:`${i*0.7}s` }}>{activeFestival.emoji}</span>
              ))}
            </>
          )
        )}

        {/* Scrolling Design — seller-chosen animated particle overlay,
            independent of the festival theme above (both can be on at once). */}
        <ScrollingDesignOverlay design={seller.scrollingDesign} />

        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(v => !v)}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm shadow-md text-foreground hover:bg-white transition-all active:scale-95"
              aria-label="Change language"
            >
              <Globe className="h-4 w-4" />
              {currentLang !== "en" && (
                <span
                  className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-black text-white uppercase"
                  style={{ background: bannerColor, lineHeight: 1 }}
                >
                  {currentLang.slice(0, 2)}
                </span>
              )}
            </button>

            {langOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                <div
                  className="absolute right-0 top-10 z-20 min-w-[140px] rounded-2xl overflow-hidden shadow-2xl"
                  style={{ background: "rgba(10,10,10,0.92)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => translateTo(lang.code)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-white/10"
                      style={{ color: currentLang === lang.code ? bannerColor : "rgba(255,255,255,0.85)" }}
                    >
                      <span>{lang.native}</span>
                      {currentLang === lang.code && (
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: bannerColor }} />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Home button */}
          <Button
            variant="secondary"
            size="sm"
            className="p-2 sm:px-3 sm:gap-1.5 bg-white/90 dark:bg-white/10 backdrop-blur-sm text-foreground hover:bg-white shadow-md"
            onClick={() => router.push("/")}
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>
        </div>

        {/* Hidden Google Translate root */}
        <div id="nxc-gt-root" style={{ display: "none" }} />

        <div className="relative z-10 mx-auto max-w-full">

          {/* ═══ MOBILE LAYOUT ═══ */}
          <div className={cn("sm:hidden px-4 pb-5 transition-all duration-300", scrolled ? "pt-3" : "pt-6")}>

            {/* Top row: logo + info */}
            <div className="flex items-start gap-3.5 mb-3.5">
              {/* Logo with animated glow ring */}
              <div className="nxc-rainbow-ring relative h-[68px] w-[68px] shrink-0">
                {/* Outer breathing glow — colour-shift based on bannerColor */}
                <div
                  className="absolute -inset-3 rounded-full pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${hexToRgba(bannerColor, 0.5)}, transparent 70%)`, animation: 'nxc-ring-glow 2.8s ease-in-out infinite', animationDelay: '0.4s' }}
                />
                {/* Main ring — thicker white + colour shadow */}
                <div
                  className="absolute -inset-1.5 rounded-full pointer-events-none"
                  style={{ boxShadow: `0 0 0 4px rgba(255,255,255,0.75), 0 0 0 6px ${hexToRgba(bannerColor, 0.55)}, 0 0 28px ${hexToRgba(bannerColor, 0.8)}`, animation: 'nxc-ring-breathe 2.8s ease-in-out infinite' }}
                />
                {/* Completion ring SVG */}
                <svg className="absolute pointer-events-none" width="88" height="88" style={{ top: '-10px', left: '-10px', zIndex: 2 }}>
                  <circle cx="44" cy="44" r="40" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                  <circle cx="44" cy="44" r="40" fill="none"
                    stroke={completionPct === 100 ? '#fbbf24' : 'rgba(255,255,255,0.9)'}
                    strokeWidth="3"
                    strokeDasharray={CIRC_M}
                    strokeDashoffset={CIRC_M * (1 - completionPct / 100)}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '44px 44px', transition: 'stroke-dashoffset 1.2s ease', filter: `drop-shadow(0 0 4px ${bannerColor})` }}
                  />
                </svg>
                <div className="relative h-full w-full overflow-hidden rounded-full border-[3px] border-white/90 bg-white/15 shadow-2xl">
                  {logoUrl ? (
                    <Image src={logoUrl} alt={seller.storeName} width={68} height={68} className="object-cover h-full w-full" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                      {seller.storeName[0].toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Active status dot — green if online, gray if offline */}
                <div className="absolute bottom-0.5 right-0.5 z-10">
                  <div className="relative flex h-3 w-3">
                    {isOnline && <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                    <div className={`relative inline-flex rounded-full h-3 w-3 border border-white ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                  </div>
                </div>
                {isOwner && (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/50 opacity-0 active:opacity-100 transition-opacity"
                  >
                    {logoUploading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Camera className="h-4 w-4 text-white" />}
                  </button>
                )}
              </div>

              {/* Store info */}
              <div className="flex-1 min-w-0">
                {/* Name + gold verified badge */}
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <h1 className="relative text-[22px] font-black text-white leading-tight tracking-tight overflow-hidden" style={{ textShadow: `0 2px 12px ${hexToRgba(darkenHex(bannerColor,0.5),0.7)}, 0 1px 3px rgba(0,0,0,0.4)` }}>
                    {seller.storeName}
                    <span className="nxc-name-shine" />
                  </h1>
                  <span
                    className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-black shrink-0"
                    style={{ background: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)', color: '#451a03', boxShadow: '0 2px 6px rgba(245,158,11,0.55)' }}
                  >
                    ✓ VERIFIED
                  </span>
                  {activeFestival && (
                    <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white shrink-0" style={{ background: activeFestival.overlay.replace("0.18", "0.55"), border: `1px solid ${activeFestival.accent}60` }}>
                      {activeFestival.emoji} {activeFestival.name}
                    </span>
                  )}
                </div>
                {/* Milestone badges */}
                {badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {badges.map(b => {
                      const m = BADGE_META[b];
                      if (!m) return null;
                      return (
                        <span key={b} className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}40` }}>
                          {m.emoji} {m.label}
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Online status + Last seen + Viewing now */}
                <div className="flex flex-wrap items-center gap-1 mb-1.5">
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold border",
                    isOnline
                      ? "bg-green-500/20 border-green-400/40 text-green-300"
                      : "bg-white/10 border-white/20 text-white/50"
                  )}>
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isOnline ? "bg-green-400 animate-pulse" : "bg-gray-400"}`} />
                    {isOnline ? "Online Now" : "Offline"}
                  </span>
                  {lastSeenText && (
                    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] bg-white/10 border border-white/20 text-white/55 font-medium">
                      <Clock className="h-2 w-2 shrink-0" /> {lastSeenText}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] bg-white/10 border border-white/20 text-white/55">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white/70" />
                    </span>
                    <Eye className="h-2 w-2 shrink-0" />
                    {viewingNowCount} {viewingNowCount === 1 ? "viewing" : "viewing now"}
                  </span>
                </div>

                {/* Seller ID */}
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <span className="font-mono text-[10px] bg-white/15 border border-white/20 px-1.5 py-0.5 rounded-md text-white/70">@{seller.sellerId}</span>
                </div>

                {/* Stats chips — frosted glass based on banner colour, with count-up reveal */}
                {(() => {
                  const pillStyle: React.CSSProperties = {
                    background: `linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))`,
                    border: `1px solid rgba(255,255,255,0.28)`,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: `0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.25)`,
                  };
                  return (
                <div className="flex flex-wrap gap-1">
                  {[
                    { icon: <Star className="h-2.5 w-2.5 fill-yellow-300 text-yellow-300" />, val: seller.rating.toFixed(1), label: "Rating",    delay: "0ms"   },
                    { icon: <Package className="h-2.5 w-2.5 text-white/80" />,              val: seller._count.products,      label: "Products", delay: "60ms"  },
                    { icon: <Calendar className="h-2.5 w-2.5 text-white/70" />,             val: `Since ${new Date(seller.createdAt).getFullYear()}`, label: "", delay: "120ms" },
                    { icon: <Heart className="h-2.5 w-2.5 text-white/80" />,               val: displayFollowers,            label: "Followers",delay: "180ms" },
                  ].map((s, i) => (
                  <div key={i} className="nxc-stat-reveal flex items-center gap-1 rounded-full px-2.5 py-1" style={{ ...pillStyle, animationDelay: s.delay }}>
                    {s.icon}
                    <span className="text-[10px] font-bold text-white">{s.val}</span>
                    {s.label && <span className="text-[9px] text-white/60">{s.label}</span>}
                  </div>
                  ))}
                  {followerMilestone && (
                    <div className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black text-white banner-slide" style={{ background: `linear-gradient(135deg,${bannerColor},${bannerColor2})`, boxShadow: `0 2px 8px ${hexToRgba(bannerColor,0.5)}` }}>
                      🏆 {followerMilestone}
                    </div>
                  )}
                </div>
                  );
                })()}
              </div>
            </div>

            {/* Description / tagline — collapsible */}
            {seller.description && (
              <div className="mb-3">
                <p className={cn("text-[12px] text-white/65 leading-relaxed italic", descExpanded ? "" : "line-clamp-2")}>{seller.description}</p>
                {seller.description.length > 80 && (
                  <button onClick={() => setDescExpanded(v => !v)} className="text-[11px] font-semibold text-white/50 mt-0.5 hover:text-white/80 transition-colors">
                    {descExpanded ? "Show less ↑" : "Read more ↓"}
                  </button>
                )}
              </div>
            )}

            {/* Local / Kirana Store info */}
            {seller.isLocalStore && (
              <div className="mb-3 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-white/90 uppercase tracking-wide">🏪 Local / Kirana Store</span>
                  <span className="rounded-full bg-emerald-400/20 border border-emerald-400/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">PICKUP</span>
                </div>
                {seller.storeAddress && (
                  <p className="text-[11px] text-white/70 leading-snug">📍 {seller.storeAddress}</p>
                )}
                {seller.pickupHours && (
                  <p className="text-[11px] text-white/70">🕐 {seller.pickupHours}</p>
                )}
              </div>
            )}

            {/* Trust indicators */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="flex items-center gap-1 text-[10px] text-white/65"><span className="text-green-400 font-bold">✓</span> Verified</span>
              <span className="w-px h-2.5 bg-white/25 shrink-0" />
              <span className="flex items-center gap-1 text-[10px] text-white/65"><span className="text-blue-300 font-bold">↩</span> Easy Returns</span>
              <span className="w-px h-2.5 bg-white/25 shrink-0" />
              <span className="flex items-center gap-1 text-[10px] text-white/65"><span className="text-yellow-300 font-bold">🔒</span> Secure Pay</span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#25D366]/60 bg-[#25D366]/20 py-2.5 text-[13px] font-semibold text-white active:scale-[0.98] transition-all">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Contact
                </a>
              ) : (
                <button onClick={() => toast.info("Seller hasn't added a phone number yet.")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 py-2.5 text-[13px] font-semibold text-white/40 cursor-not-allowed">
                  <Phone className="h-3.5 w-3.5" />Contact
                </button>
              )}
              {/* Follow — vibrant gradient */}
              <button
                onClick={handleFollow}
                disabled={followLoading || isOwner}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold text-white active:scale-[0.97] transition-all disabled:opacity-60"
                style={followed
                  ? { background: bannerColor, boxShadow: `0 4px 14px ${hexToRgba(bannerColor, 0.55)}` }
                  : { background: 'linear-gradient(135deg,#f43f5e 0%,#e11d48 100%)', boxShadow: '0 4px 14px rgba(244,63,94,0.45)' }
                }
              >
                {followLoading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Heart className={cn("h-3.5 w-3.5", followed ? "fill-white text-white" : "fill-rose-100 text-rose-100")} />
                }
                {followed ? "✓ Following" : "Follow"}
              </button>
              {/* Share */}
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    if (navigator.share) {
                      navigator.share({ title: seller.storeName, url: window.location.href }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Link copied!");
                    }
                  }
                }}
                className="flex items-center justify-center rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 active:bg-white/25 transition-all"
              >
                <Share2 className="h-3.5 w-3.5 text-white/80" />
              </button>
              {offers.length > 0 && (
                <button onClick={() => setOffersOpen(o => !o)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[13px] font-semibold text-white active:bg-white/20 transition-all ${offersOpen ? "border-white/60 bg-white/20" : "border-white/30 bg-white/10"}`}>
                  <Tag className="h-3.5 w-3.5" />
                  <span className="text-[11px]">{offers.length}</span>
                </button>
              )}
            </div>

            {/* ── Inline offers panel — appears right below the buttons ── */}
            {offersOpen && offers.length > 0 && (
              <div className="mt-3 mx-1 rounded-2xl overflow-hidden shadow-2xl" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Available Offers</p>
                  <button onClick={() => setOffersOpen(false)} className="text-white/50 hover:text-white text-lg leading-none transition-colors">✕</button>
                </div>
                {offers.map(offer => {
                  const Icon = OFFER_ICON_MAP[offer.offerType] ?? Zap;
                  const isSelected = selectedOfferId === offer.id;
                  const colorMap = OFFER_COLOR_MAP[offer.offerType] ?? { bg: "bg-blue-500", text: "text-white", border: "border-blue-600" };
                  return (
                    <button key={offer.id}
                      onClick={() => {
                        setOffersOpen(false);
                        if (offer.offerType === "FLASH_SALE") { router.push(`/store/${seller.sellerId}/flash-sale`); return; }
                        if (offer.offerType === "DEALS_OF_THE_DAY") { router.push(`/store/${seller.sellerId}/deals`); return; }
                        setSelectedOfferId(isSelected ? null : offer.id);
                        if (!isSelected) setTimeout(() => productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors border-b border-white/8 last:border-0 ${isSelected ? "bg-white/15" : "hover:bg-white/8 active:bg-white/10"}`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colorMap.bg}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white leading-tight truncate">{offer.title}</p>
                        {offer.description && <p className="text-[11px] text-white/55 mt-0.5 truncate">{offer.description}</p>}
                      </div>
                      {isSelected && <span className="text-[11px] font-bold text-emerald-400 shrink-0">✓ Applied</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══ DESKTOP LAYOUT ═══ */}
          <div className={cn("hidden sm:block px-6 md:px-10 lg:px-16 pb-12 lg:pb-24 transition-all duration-300", scrolled ? "py-6 lg:py-10" : "py-12 lg:py-24")}>
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-6 lg:gap-12">
              {/* Logo with glow ring */}
              <div className="relative h-[140px] w-[140px] md:h-[170px] md:w-[170px] lg:h-[200px] lg:w-[200px] shrink-0">
                <div
                  className="absolute -inset-4 rounded-full animate-pulse pointer-events-none"
                  style={{ boxShadow: `0 0 0 5px rgba(255,255,255,0.45), 0 0 80px ${hexToRgba(bannerColor, 1)}` }}
                />
                {/* Completion ring SVG */}
                <svg viewBox="0 0 256 256" className="absolute pointer-events-none" style={{ top: '-14%', left: '-14%', width: '128%', height: '128%', zIndex: 2 }}>
                  <circle cx="128" cy="128" r="120" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
                  <circle cx="128" cy="128" r="120" fill="none"
                    stroke={completionPct === 100 ? '#fbbf24' : 'rgba(255,255,255,0.80)'}
                    strokeWidth="4"
                    strokeDasharray={2 * Math.PI * 120}
                    strokeDashoffset={2 * Math.PI * 120 * (1 - completionPct / 100)}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '128px 128px', transition: 'stroke-dashoffset 1.2s ease' }}
                  />
                </svg>
                <div className="relative h-full w-full overflow-hidden rounded-full border-[5px] border-white/60 bg-white/10 shadow-2xl backdrop-blur-sm">
                  {logoUrl ? (
                    <Image src={logoUrl} alt={seller.storeName} width={200} height={200} className="object-cover h-full w-full" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl md:text-5xl lg:text-7xl font-bold text-white">
                      {seller.storeName[0].toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Active status dot */}
                <div className="absolute bottom-2 right-2 z-10">
                  <div className="relative flex h-7 w-7">
                    {isOnline && <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                    <div className={`relative inline-flex rounded-full h-7 w-7 border-[3px] border-white ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                  </div>
                </div>
                {isOwner && (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                    title="Change logo"
                  >
                    {logoUploading ? <Loader2 className="h-8 w-8 text-white animate-spin" /> : <Camera className="h-8 w-8 text-white" />}
                    <span className="text-sm font-semibold text-white">Edit</span>
                  </button>
                )}
              </div>

              <div className="flex-1 min-w-0 w-full lg:w-auto order-2 lg:order-none">
                {/* Name + badges */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <h1 className="text-3xl md:text-4xl lg:text-6xl font-black text-white leading-none tracking-tight drop-shadow-lg">{seller.storeName}</h1>
                  <span
                    className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-black"
                    style={{ background: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)', color: '#451a03', boxShadow: '0 4px 16px rgba(245,158,11,0.65)' }}
                  >
                    ✓ VERIFIED SELLER
                  </span>
                  {activeFestival && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold text-white" style={{ background: activeFestival.overlay.replace("0.18","0.5"), border: `1.5px solid ${activeFestival.accent}80` }}>
                      {activeFestival.emoji} {activeFestival.name} Special
                    </span>
                  )}
                </div>
                {/* Milestone badges — desktop */}
                {badges.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {badges.map(b => {
                      const m = BADGE_META[b];
                      if (!m) return null;
                      return (
                        <span key={b} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold" style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}40` }}>
                          {m.emoji} {m.label}
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Online status + Last seen + Viewing now */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <span className={cn(
                    "inline-flex items-center gap-2.5 rounded-full px-5 py-2 text-base font-semibold border",
                    isOnline
                      ? "bg-green-500/20 border-green-400/40 text-green-300"
                      : "bg-white/10 border-white/20 text-white/55"
                  )}>
                    <span className={`h-3 w-3 rounded-full shrink-0 ${isOnline ? "bg-green-400 animate-pulse" : "bg-gray-400"}`} />
                    {isOnline ? "Online Now · Replies quickly" : "Offline"}
                  </span>
                  {lastSeenText && (
                    <span className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 text-base bg-white/10 border border-white/20 text-white/65 font-medium">
                      <Clock className="h-4 w-4 shrink-0" /> Last seen {lastSeenText}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 text-base bg-white/10 border border-white/20 text-white/60">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-white/70" />
                    </span>
                    <Eye className="h-4 w-4 shrink-0" />
                    {viewingNowCount} {viewingNowCount === 1 ? "viewing" : "viewing now"}
                  </span>
                </div>
                {/* Stats chips row */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <span className="font-mono text-base bg-white/10 border border-white/20 px-4 py-2 rounded-xl text-white/80">{seller.sellerId}</span>
                  <div className="flex items-center gap-2 rounded-full px-5 py-2" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)' }}>
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-base font-bold text-white">{seller.rating.toFixed(1)}</span>
                    <span className="text-sm text-white/55">Rating</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full px-5 py-2" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)' }}>
                    <Package className="h-5 w-5 text-white/75" />
                    <span className="text-base font-bold text-white">{seller._count.products}</span>
                    <span className="text-sm text-white/55">Products</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full px-5 py-2" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)' }}>
                    <ShoppingBag className="h-5 w-5 text-white/75" />
                    <span className="text-base font-bold text-white">{seller.totalSales.toLocaleString()}</span>
                    <span className="text-sm text-white/55">Sales</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full px-5 py-2" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)' }}>
                    <Calendar className="h-5 w-5 text-white/75" />
                    <span className="text-sm text-white/70">Since {new Date(seller.createdAt).getFullYear()}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full px-5 py-2" style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)' }}>
                    <Heart className="h-5 w-5 text-white/75" />
                    <span className="text-base font-bold text-white">{displayFollowers}</span>
                    <span className="text-sm text-white/55">Followers</span>
                  </div>
                  {followerMilestone && (
                    <div className="flex items-center gap-2 rounded-full px-5 py-2 text-base font-black text-white banner-slide" style={{ background: `linear-gradient(135deg,${bannerColor},${bannerColor2})`, boxShadow: `0 4px 16px ${hexToRgba(bannerColor,0.5)}` }}>
                      🏆 {followerMilestone} Followers!
                    </div>
                  )}
                </div>
                {/* Description — collapsible */}
                {seller.description && (
                  <div className="mb-5">
                    <p className={cn("text-base text-white/75 max-w-3xl leading-relaxed italic", descExpanded ? "" : "line-clamp-2")}>{seller.description}</p>
                    {seller.description.length > 100 && (
                      <button onClick={() => setDescExpanded(v => !v)} className="text-sm text-white/50 hover:text-white/80 font-semibold mt-1.5 transition-colors">
                        {descExpanded ? "Show less ↑" : "Read more ↓"}
                      </button>
                    )}
                  </div>
                )}
                {/* Trust indicators */}
                <div className="flex items-center gap-5 mt-3 flex-wrap">
                  <span className="flex items-center gap-2 text-base text-white/65"><span className="text-green-400 font-bold text-lg">✓</span> Verified Seller</span>
                  <span className="w-px h-5 bg-white/25 shrink-0" />
                  <span className="flex items-center gap-2 text-base text-white/65"><span className="text-blue-300 font-bold text-lg">↩</span> Easy Returns</span>
                  <span className="w-px h-5 bg-white/25 shrink-0" />
                  <span className="flex items-center gap-2 text-base text-white/65"><span className="text-yellow-300 font-bold">🔒</span> Secure Pay</span>
                  {totalReviews > 0 && (
                    <>
                      <span className="w-px h-5 bg-white/25 shrink-0" />
                      <span className="text-base text-white/65">{totalReviews.toLocaleString()} reviews</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right — action buttons */}
              <div className="flex flex-col items-start lg:items-end gap-4 self-start lg:self-center shrink-0 w-full lg:w-auto order-3">
                <div className="flex flex-wrap items-center gap-3">
                  {whatsappUrl ? (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-2xl border border-[#25D366]/70 bg-[#25D366]/20 backdrop-blur-sm px-4 lg:px-7 py-2.5 lg:py-3.5 text-sm lg:text-lg font-semibold text-white hover:bg-[#25D366]/40 transition-all">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Contact
                    </a>
                  ) : (
                    <button onClick={() => toast.info("Seller hasn't added a phone number yet.")}
                      className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-4 lg:px-7 py-2.5 lg:py-3.5 text-sm lg:text-lg font-semibold text-white/50 cursor-not-allowed">
                      <Phone className="h-5 w-5" />Contact
                    </button>
                  )}
                  {/* Follow — vibrant */}
                  <button
                    onClick={handleFollow}
                    disabled={followLoading || isOwner}
                    className="flex items-center gap-2.5 rounded-2xl px-4 lg:px-7 py-2.5 lg:py-3.5 text-sm lg:text-lg font-bold text-white transition-all hover:scale-[1.04] active:scale-[0.97] disabled:opacity-60"
                    style={followed
                      ? { background: bannerColor, boxShadow: `0 6px 24px ${hexToRgba(bannerColor, 0.55)}` }
                      : { background: 'linear-gradient(135deg,#f43f5e 0%,#e11d48 100%)', boxShadow: '0 6px 24px rgba(244,63,94,0.55)' }
                    }
                  >
                    {followLoading
                      ? <Loader2 className="h-5 w-5 animate-spin" />
                      : <Heart className={cn("h-5 w-5", followed ? "fill-white text-white" : "fill-rose-100 text-rose-100")} />
                    }
                    {followed ? "✓ Following" : "Follow"}
                  </button>
                  {/* Share */}
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        if (navigator.share) {
                          navigator.share({ title: seller.storeName, url: window.location.href }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success("Link copied!");
                        }
                      }
                    }}
                    className="flex items-center gap-2.5 rounded-2xl border border-white/25 bg-white/10 px-4 lg:px-6 py-2.5 lg:py-3.5 text-sm lg:text-lg font-semibold text-white/85 hover:bg-white/20 transition-all"
                  >
                    <Share2 className="h-5 w-5" />
                    <span>Share</span>
                  </button>
                </div>
                {offers.length > 0 && (
                  <div className="relative w-full lg:w-auto">
                    <button onClick={() => setOffersOpen(o => !o)}
                      className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-white/30 bg-white/15 px-7 py-3 lg:py-3.5 text-base lg:text-lg font-bold text-white hover:bg-white/25 transition-all">
                      <Tag className="h-5 w-5" />Offers ({offers.length})
                      <ChevronDown className={cn("h-5 w-5 transition-transform duration-200", offersOpen && "rotate-180")} />
                    </button>
                    {offersOpen && <OffersDropdown offers={offers} selectedOfferId={selectedOfferId} setSelectedOfferId={setSelectedOfferId} setOffersOpen={setOffersOpen} productsRef={productsRef} sellerId={seller.sellerId} onNavigate={router.push} />}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>


      {/* ── STICKY FILTER BAR ── */}
      <div
        ref={productsRef}
        className="sticky top-0 z-40 shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor2})`,
          boxShadow: `0 4px 32px ${hexToRgba(bannerColor, 0.45)}`,
          transform: headerHidden ? "translateY(-100%)" : "translateY(0)",
          // Sliding up when scrolling starts stays snappy (0.28s); falling back
          // down once scrolling stops is deliberately slow (1.8s), per request.
          transition: `transform ${headerHidden ? "0.28s" : "1.8s"} cubic-bezier(0.22,1,0.36,1)`,
          willChange: "transform",
        }}
      >
        {/* Subtle shimmer overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />

        <div className="relative mx-auto max-w-full px-3 sm:px-8 py-2.5 sm:py-3 space-y-2">

          {/* Search input with suggestions */}
          <div ref={searchContainerRef} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                const val = e.target.value;
                setSearchQuery(val);
                setSearchFocused(true);
                setActiveSuggestionIdx(-1);
                setGridAnimKey(k => k + 1);
                if (val.trim()) scheduleGridScroll();
                else if (searchScrollTimeoutRef.current) clearTimeout(searchScrollTimeoutRef.current);
              }}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={e => {
                const navItems = searchSuggestions.length > 0
                  ? searchSuggestions
                  : searchQuery.trim().length >= 1
                    ? dropdownFallbackProducts
                    : recentSearches;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (navItems.length > 0) setActiveSuggestionIdx(i => Math.min(i + 1, navItems.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveSuggestionIdx(i => Math.max(i - 1, -1));
                } else if (e.key === "Enter") {
                  if (activeSuggestionIdx >= 0 && navItems[activeSuggestionIdx]) {
                    e.preventDefault();
                    const item = navItems[activeSuggestionIdx];
                    if (typeof item === "string") {
                      setSearchQuery(item);
                      saveRecentSearch(item);
                      setActiveSuggestionIdx(-1);
                    } else {
                      saveRecentSearch(searchQuery.trim() || item.name);
                      router.push(`/product/${item.productId}`);
                      setSearchFocused(false);
                    }
                  } else if (searchQuery.trim()) {
                    // Plain Enter, nothing highlighted: the grid already
                    // live-filters as you type, so give a clear, immediate
                    // confirmation that "search happened" by closing the
                    // dropdown and jumping straight to the results.
                    e.preventDefault();
                    saveRecentSearch(searchQuery.trim());
                    setSearchFocused(false);
                    setActiveSuggestionIdx(-1);
                    (e.target as HTMLInputElement).blur();
                    scheduleGridScroll(0);
                  }
                } else if (e.key === "Escape") {
                  setSearchFocused(false);
                  setActiveSuggestionIdx(-1);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder={`Search products in ${seller.storeName}…`}
              className="w-full rounded-xl border border-white/25 bg-white/15 backdrop-blur-sm pl-10 pr-9 py-2.5 text-sm text-white placeholder:text-white/45 outline-none focus:border-white/55 focus:bg-white/22 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchFocused(false); setActiveSuggestionIdx(-1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors z-10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {/* Suggestions dropdown — Flipkart-style: matching products while
                typing (with bolded match + rating + keyboard nav), recent +
                popular search chips when the box is empty, and a
                "did you mean" + popular-products fallback when the query
                matches nothing, so it's never just a blank box. */}
            {searchFocused && (searchSuggestions.length > 0 || dropdownTagSuggestions.length > 0 || dropdownFallbackProducts.length > 0 || recentSearches.length > 0 || (searchQuery.trim().length >= 1 && correctedQuery)) && (
              <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-border/60 bg-white dark:bg-[hsl(220_17%_10%)] shadow-2xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                {searchSuggestions.length > 0 ? (
                  <>
                    {searchSuggestions.map((p, idx) => (
                      <button
                        key={p.id}
                        onClick={() => { saveRecentSearch(searchQuery.trim() || p.name); router.push(`/product/${p.productId}`); setSearchFocused(false); }}
                        onMouseEnter={() => setActiveSuggestionIdx(idx)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2.5 transition-colors border-b border-border/30 last:border-0",
                          activeSuggestionIdx === idx ? "bg-muted" : "hover:bg-muted"
                        )}
                      >
                        <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden bg-muted/40 border border-border/40">
                          {p.images[0]
                            ? <Image src={p.images[0]} alt="" fill className="object-cover" />
                            : <Package className="h-4 w-4 text-muted-foreground m-auto" />}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[13px] font-semibold text-foreground truncate">{highlightMatch(p.name, searchQuery)}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-muted-foreground">₹{p.price.toLocaleString()}{p.comparePrice && p.comparePrice > p.price ? <span className="ml-1.5 text-green-600 font-semibold">-{Math.round((1 - p.price / p.comparePrice) * 100)}%</span> : null}</span>
                            {p.rating > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-400 rounded px-1 py-[1px]">
                                {p.rating.toFixed(1)} <Star className="h-2.5 w-2.5 fill-current" />
                              </span>
                            )}
                            {p.category?.name && (
                              <span className="text-[10px] text-muted-foreground/70">in {p.category.name}</span>
                            )}
                          </div>
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground -rotate-90 shrink-0" />
                      </button>
                    ))}
                    <div className="px-3 py-2 bg-muted/30 border-t border-border/30">
                      <p className="text-[10px] text-muted-foreground text-center">↑↓ to navigate · Enter to select</p>
                    </div>
                  </>
                ) : searchQuery.trim().length >= 1 ? (
                  <>
                    {/* No direct match — offer the auto-corrected spelling first */}
                    {correctedQuery && (
                      <button
                        onClick={() => { setSearchQuery(correctedQuery); saveRecentSearch(correctedQuery); }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-muted transition-colors border-b border-border/30 text-left"
                      >
                        <Search className="h-3.5 w-3.5 shrink-0" style={{ color: bannerColor }} />
                        <span className="text-[13px] text-foreground">
                          Did you mean{" "}
                          <span className="font-semibold" style={{ color: bannerColor }}>&ldquo;{correctedQuery}&rdquo;</span>?
                        </span>
                      </button>
                    )}
                    {dropdownTagSuggestions.length > 0 && (
                      <div className="px-3 py-2 border-b border-border/30">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Related searches</p>
                        <div className="flex flex-wrap gap-1.5">
                          {dropdownTagSuggestions.map(tag => (
                            <button
                              key={tag}
                              onClick={() => { setSearchQuery(tag); saveRecentSearch(tag); }}
                              className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors hover:opacity-80"
                              style={{ borderColor: hexToRgba(bannerColor, 0.3), background: hexToRgba(bannerColor, 0.06), color: bannerColor }}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {dropdownFallbackProducts.length > 0 && (
                      <div>
                        <p className="px-3 pt-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">You might like</p>
                        {dropdownFallbackProducts.map((p, idx) => (
                          <button
                            key={p.id}
                            onClick={() => { saveRecentSearch(searchQuery.trim() || p.name); router.push(`/product/${p.productId}`); setSearchFocused(false); }}
                            onMouseEnter={() => setActiveSuggestionIdx(idx)}
                            className={cn(
                              "flex w-full items-center gap-3 px-3 py-2.5 transition-colors border-b border-border/30 last:border-0",
                              activeSuggestionIdx === idx ? "bg-muted" : "hover:bg-muted"
                            )}
                          >
                            <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-muted/40 border border-border/40">
                              {p.images[0]
                                ? <Image src={p.images[0]} alt="" fill className="object-cover" />
                                : <Package className="h-4 w-4 text-muted-foreground m-auto" />}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-[13px] font-semibold text-foreground truncate">{p.name}</p>
                              <p className="text-[11px] text-muted-foreground">₹{p.price.toLocaleString()}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  /* Empty box, just focused — recent + popular search chips */
                  <>
                    {recentSearches.length > 0 && (
                      <div className="px-3 py-2.5 border-b border-border/30">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Recent searches</p>
                        <div className="flex flex-col">
                          {recentSearches.map((term, idx) => (
                            <div
                              key={term}
                              onMouseEnter={() => setActiveSuggestionIdx(idx)}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-1.5 py-1.5 -mx-1.5 transition-colors",
                                activeSuggestionIdx === idx ? "bg-muted" : ""
                              )}
                            >
                              <button
                                onClick={() => { setSearchQuery(term); saveRecentSearch(term); }}
                                className="flex flex-1 items-center gap-2 min-w-0 text-left"
                              >
                                <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="text-[13px] text-foreground truncate">{term}</span>
                              </button>
                              <button
                                onClick={() => removeRecentSearch(term)}
                                className="shrink-0 text-muted-foreground/60 hover:text-muted-foreground p-0.5"
                                aria-label="Remove"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {dropdownTagSuggestions.length > 0 && (
                      <div className="px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Popular searches</p>
                        <div className="flex flex-wrap gap-1.5">
                          {dropdownTagSuggestions.map(tag => (
                            <button
                              key={tag}
                              onClick={() => { setSearchQuery(tag); saveRecentSearch(tag); }}
                              className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors hover:opacity-80"
                              style={{ borderColor: hexToRgba(bannerColor, 0.3), background: hexToRgba(bannerColor, 0.06), color: bannerColor }}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Row 2: Category tabs (full width, scrollable) */}
          {(() => {
            const CAT_ICON: Record<string, { icon: React.FC<{ className?: string }>, color: string }> = {
              "Electronics": { icon: Zap,       color: "#60a5fa" },
              "Fashion":     { icon: Tag,       color: "#f472b6" },
              "Home":        { icon: Home,      color: "#fbbf24" },
              "Books":       { icon: Package,   color: "#a78bfa" },
              "Sports":      { icon: Package,   color: "#34d399" },
              "Beauty":      { icon: Star,      color: "#fb7185" },
              "Food":        { icon: Package,   color: "#fb923c" },
              "Grocery":     { icon: Package,   color: "#4ade80" },
              "Toys":        { icon: Package,   color: "#c084fc" },
              "Furniture":   { icon: Home,      color: "#fcd34d" },
            };
            return (
              <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {[{ label: "All", key: "All" }, ...categories.map(c => ({ label: c, key: c }))].map((item) => {
                  const cat = CAT_ICON[item.key];
                  const CatIcon = cat?.icon;
                  const isActive = activeCategory === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setActiveCategory(item.key);
                        if (item.key === "All") {
                          setSelectedOfferId(null);
                          setActiveCollection(null);
                        }
                        setGridAnimKey(k => k + 1);
                        setTimeout(() => {
                          const el = productGridRef.current;
                          if (!el) return;
                          const filterBarH = productsRef.current?.offsetHeight ?? 0;
                          const collectionsBarH = collectionBarRef.current?.offsetHeight ?? 0;
                          const top = el.getBoundingClientRect().top + window.scrollY - filterBarH - collectionsBarH - 8;
                          window.scrollTo({ top, behavior: "smooth" });
                        }, 60);
                      }}
                      className={cn(
                        "shrink-0 flex items-center gap-1 rounded-full border px-3 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap",
                        isActive
                          ? "bg-white text-gray-800 border-white shadow-md font-semibold"
                          : "border-white/35 bg-white/10 text-white hover:bg-white/20 hover:border-white/55"
                      )}
                    >
                      {CatIcon && (
                        <span style={{ color: isActive ? cat.color : 'rgba(255,255,255,0.5)' }} className="shrink-0 flex items-center">
                          <CatIcon className="h-3 w-3" />
                        </span>
                      )}
                      {item.key === "All" ? "All Products" : item.label}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* Row 3: Price + Sort (right-aligned, mobile only shows icons) */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: active filter hint */}
            <p className="text-[10px] sm:text-xs text-white/55 truncate">
              {hasActiveFilters ? `Filtered` : `${seller._count.products} products`}
            </p>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Price filter toggle */}
              <button
                onClick={() => setPriceOpen(v => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] sm:text-xs font-medium transition-all",
                  (minPrice || maxPrice)
                    ? "border-white bg-white text-gray-800 shadow-sm"
                    : priceOpen
                    ? "border-white/60 bg-white/20 text-white"
                    : "border-white/35 bg-white/10 text-white hover:bg-white/20"
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Price</span>
                {(minPrice || maxPrice) && <span className="flex h-1.5 w-1.5 rounded-full bg-gray-700" />}
              </button>

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSortOpen(v => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/35 bg-white/10 px-2.5 py-1.5 text-[11px] sm:text-xs font-medium text-white hover:bg-white/20 transition-all"
                >
                  <span className="hidden sm:inline">{SORT_LABELS[sort]}</span>
                  <span className="sm:hidden">Sort</span>
                  <ChevronDown className="h-3 w-3 text-white/60" />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 sm:w-52 rounded-xl border border-border/60 bg-white dark:bg-[hsl(220_17%_10%)] shadow-2xl z-40 overflow-hidden">
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => { setSort(key); setSortOpen(false); }}
                        className={cn(
                          "flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                          sort === key ? "font-semibold" : "text-foreground/80"
                        )}
                        style={sort === key ? { color: bannerColor } : {}}
                      >
                        {SORT_LABELS[key]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Price range inputs (collapsible) */}
          {priceOpen && (
            <div className="flex items-center gap-2 pb-0.5">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/55 pointer-events-none">₹</span>
                <input
                  type="number"
                  value={minPrice}
                  onChange={e => { setMinPrice(e.target.value); scheduleGridScroll(); }}
                  placeholder="Min"
                  min={0}
                  className="w-full rounded-lg border border-white/25 bg-white/15 pl-6 pr-3 py-1.5 text-xs text-white placeholder:text-white/40 outline-none focus:border-white/55 focus:bg-white/22 transition-all"
                />
              </div>
              <span className="shrink-0 text-white/45 text-xs">—</span>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/55 pointer-events-none">₹</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={e => { setMaxPrice(e.target.value); scheduleGridScroll(); }}
                  placeholder="Max"
                  min={0}
                  className="w-full rounded-lg border border-white/25 bg-white/15 pl-6 pr-3 py-1.5 text-xs text-white placeholder:text-white/40 outline-none focus:border-white/55 focus:bg-white/22 transition-all"
                />
              </div>
              {(minPrice || maxPrice) && (
                <button
                  onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                  className="shrink-0 rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/20 transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── RELATED TAGS STRIP ── */}
      {allProductTags.length >= 2 && (
        <div className="px-4 sm:px-8 py-2.5 border-b border-border/30 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ background: hexToRgba(bannerColor, 0.04) }}>
          <div className="flex gap-2 min-w-max">
            {allProductTags.map((tag, i) => (
              <button
                key={tag}
                onClick={() => {
                  setSearchQuery(tag);
                  setSearchFocused(false);
                  setGridAnimKey(k => k + 1);
                  setTimeout(() => {
                    const el = productGridRef.current;
                    if (!el) return;
                    const filterBarH = productsRef.current?.offsetHeight ?? 0;
                    const collectionsBarH = collectionBarRef.current?.offsetHeight ?? 0;
                    const top = el.getBoundingClientRect().top + window.scrollY - filterBarH - collectionsBarH - 8;
                    window.scrollTo({ top, behavior: "smooth" });
                  }, 60);
                }}
                className="tag-in shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                style={{
                  animationDelay: `${i * 30}ms`,
                  borderColor: searchQuery === tag ? bannerColor : hexToRgba(bannerColor, 0.3),
                  background: searchQuery === tag ? bannerColor : hexToRgba(bannerColor, 0.06),
                  color: searchQuery === tag ? "white" : bannerColor,
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ABOUT PANEL ── */}
      <div style={{ background: hexToRgba(bannerColor, 0.06), borderBottom: `1px solid ${hexToRgba(bannerColor, 0.15)}` }}>
        <div className="mx-auto max-w-full px-4 sm:px-8">
          <button
            onClick={() => setAboutOpen(o => !o)}
            className="flex w-full items-center justify-between py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Store className="h-3.5 w-3.5" style={{ color: bannerColor }} />
              <span className="text-[13px] font-semibold" style={{ color: bannerColor }}>About {seller.storeName}</span>
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", aboutOpen && "rotate-180")} style={{ color: bannerColor }} />
          </button>
          {aboutOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4">
              <div className="rounded-xl border border-border/50 bg-card p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Established</p>
                <p className="text-sm font-bold">{new Date(seller.createdAt).getFullYear()}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Total Products</p>
                <p className="text-sm font-bold">{seller._count.products}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Store Rating</p>
                <p className="text-sm font-bold">{seller.rating.toFixed(1)} ⭐</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Returns</p>
                <p className="text-sm font-bold">Easy Returns</p>
              </div>
              {seller.description && (
                <div className="col-span-2 sm:col-span-4 rounded-xl border border-border/50 bg-card p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">About this store</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{seller.description}</p>
                </div>
              )}
              {totalReviews > 0 && (
                <div className="col-span-2 sm:col-span-4 rounded-xl border border-border/50 bg-card p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Total Reviews</p>
                  <p className="text-sm font-bold">{totalReviews.toLocaleString()} customer reviews</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── HIGHLIGHTS CAROUSEL ──
          Every earlier attempt used a box shape guessed from viewport width
          (a fixed vw-based height, then a fixed pixel ceiling), and NONE of
          those numbers actually match a given photo's real shape — a photo
          has ONE fixed width:height ratio; a box shape derived from the
          screen's width does not, so it was always going to either crop the
          photo to fill a mismatched box (object-cover) or leave empty bars
          beside a correctly-shown photo (object-contain), depending on the
          screen. The actual fix is to stop guessing the box's shape and
          instead measure the photo's real shape once it loads (hlAspect,
          from its true decoded pixel dimensions — see hlAspects state
          above) and size the box to exactly that ratio. Box shape == photo
          shape means object-cover now fills it with zero cropping, on every
          screen size, matching how it always looked correct on mobile. */}
      {highlights.length > 0 && (
        <div
          className="relative overflow-hidden select-none w-full bg-muted"
          style={{ aspectRatio: hlAspect, minHeight: 180, maxHeight: 730 }}
          onMouseEnter={() => setHlPaused(true)}
          onMouseLeave={() => setHlPaused(false)}
          onTouchStart={e => { hlTouchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (hlTouchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - hlTouchStartX.current;
            if (dx < -40) setHlIdx(i => (i + 1) % highlights.length);
            else if (dx > 40) setHlIdx(i => (i - 1 + highlights.length) % highlights.length);
            hlTouchStartX.current = null;
          }}
        >
          {/* Slides track */}
          <div
            style={{
              display: "flex",
              width: `${highlights.length * 100}%`,
              height: "100%",
              transform: `translateX(-${(hlIdx * 100) / highlights.length}%)`,
              transition: "transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {highlights.map((url, i) => (
              <div
                key={i}
                style={{ width: `${100 / highlights.length}%`, height: "100%", position: "relative", overflow: "hidden" }}
              >
                <Image
                  src={url}
                  alt={`${seller.storeName} highlight ${i + 1}`}
                  fill
                  className="object-cover object-center"
                  sizes="100vw"
                  quality={100}
                  style={i === hlIdx ? { animation: "nxc-hl-ken 4s ease-out forwards" } : {}}
                  priority={i <= 1}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (!img.naturalWidth || !img.naturalHeight) return;
                    setHlAspects((prev) =>
                      prev[i] !== undefined ? prev : { ...prev, [i]: img.naturalWidth / img.naturalHeight }
                    );
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 h-12 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.35))" }} />
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          {highlights.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-10">
              {highlights.map((_, i) => (
                <button
                  key={i}
                  className="pointer-events-auto transition-all duration-300 rounded-full"
                  style={{
                    width: i === hlIdx ? 20 : 6,
                    height: 6,
                    background: i === hlIdx ? "#ffffff" : "rgba(255,255,255,0.5)",
                  }}
                  onClick={() => setHlIdx(i)}
                />
              ))}
            </div>
          )}

          {/* Prev / Next arrows — desktop only */}
          {highlights.length > 1 && (
            <>
              <button
                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/65 transition-all active:scale-90"
                onClick={() => setHlIdx(i => (i - 1 + highlights.length) % highlights.length)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button
                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/65 transition-all active:scale-90"
                onClick={() => setHlIdx(i => (i + 1) % highlights.length)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </>
          )}
        </div>
      )}

      {/* ── ANNOUNCEMENT STRIP ── */}
      {!announcementDismissed && (newProducts.length > 0 || discountedCount > 0) && (
        <div ref={announcementStripRef} className="relative flex items-center justify-between px-4 py-2.5 banner-slide" style={{ background: `linear-gradient(135deg, ${darkenHex(bannerColor, 0.88)} 0%, ${bannerColor} 100%)` }}>
          <div className="flex items-center gap-2 text-white text-[13px] font-semibold">
            <Flame className="h-4 w-4 text-yellow-300 shrink-0 flash-pulse" />
            {newProducts.length > 0 && discountedCount > 0
              ? `${newProducts.length} new arrival${newProducts.length > 1 ? "s" : ""} · ${discountedCount} product${discountedCount > 1 ? "s" : ""} on sale today!`
              : newProducts.length > 0
              ? `${newProducts.length} new product${newProducts.length > 1 ? "s" : ""} just added!`
              : `${discountedCount} product${discountedCount > 1 ? "s" : ""} on sale today — grab them now!`}
          </div>
          <button onClick={() => setAnnouncementDismissed(true)} className="text-white/55 hover:text-white ml-4 shrink-0 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── COLLECTIONS ROW ── sticky below the green header */}
      {collections.length > 0 && (
        <div
          ref={collectionBarRef}
          className="sticky z-30 border-b border-border/40"
          style={{
            top: stickyHeaderHeight,
            backgroundColor: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            transition: `backdrop-filter 0.35s ease, background-color 0.35s ease, transform ${headerHidden ? "0.28s" : "1.8s"} cubic-bezier(0.22,1,0.36,1)`,
            // Translate by its own height PLUS the filter bar's height above it, so it
            // fully clears the viewport instead of just sliding into the filter bar's
            // vacated spot. stickyHeaderHeight === productsRef's measured height.
            transform: headerHidden
              ? `translateY(-${stickyHeaderHeight + collectionsBarHeight}px)`
              : "translateY(0)",
            willChange: "transform",
          }}
        >
          <div className="mx-auto max-w-full px-4 sm:px-8 py-2">
            <div className="flex items-center gap-3">
              {/* Scroll position indicator — always shown */}
              <div className="flex shrink-0 flex-col items-center gap-1">
                {[0, 1, 2].map((i) => {
                  const dotActive = Math.round(collScrollProgress * 2) === i;
                  return (
                    <span
                      key={i}
                      className="rounded-full transition-all"
                      style={{
                        width: dotActive ? 6 : 4,
                        height: dotActive ? 6 : 4,
                        background: dotActive ? bannerColor : hexToRgba(bannerColor, 0.3),
                      }}
                    />
                  );
                })}
              </div>
              <div
                ref={collScrollRef}
                onScroll={updateCollScrollState}
                className="flex flex-1 gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-0.5 scroll-smooth"
              >

              {/* Virtual "New Arrivals" circle */}
              {newProducts.length > 0 && (() => {
                const isActive = activeCollection === "__new__";
                const scrollToGrid = () => {
                  setTimeout(() => {
                    const el = productGridRef.current;
                    if (!el) return;
                    const filterBarH = productsRef.current?.offsetHeight ?? 0;
                    const collectionsBarH = collectionBarRef.current?.offsetHeight ?? 0;
                    const top = el.getBoundingClientRect().top + window.scrollY - filterBarH - collectionsBarH - 8;
                    window.scrollTo({ top, behavior: "smooth" });
                  }, 60);
                };
                return (
                  <button
                    key="__new__"
                    onClick={() => {
                      setActiveCollection(isActive ? null : "__new__");
                      setGridAnimKey(k => k + 1);
                      if (!isActive) scrollToGrid();
                    }}
                    className="flex shrink-0 flex-col items-center gap-1.5 transition-all active:scale-95"
                  >
                    <div
                      className={`nxc-coll-pill${isActive ? " active" : ""} relative h-14 w-14 sm:h-24 sm:w-24 overflow-hidden rounded-full border-[2.5px] ${isActive ? "coll-pop" : ""}`}
                      style={{
                        borderColor: isActive ? bannerColor : "transparent",
                        boxShadow: isActive ? `0 0 0 2px ${hexToRgba(bannerColor, 0.35)}` : "0 2px 8px rgba(0,0,0,0.10)",
                        background: `linear-gradient(135deg, ${bannerColor} 0%, ${bannerColor2} 100%)`,
                      }}
                    >
                      <div className="h-full w-full flex flex-col items-center justify-center gap-0.5 sm:gap-1">
                        <Zap className="h-4 w-4 sm:h-8 sm:w-8 text-yellow-300" />
                        <span className="text-[9px] sm:text-sm font-black text-white">{newProducts.length} new</span>
                      </div>
                      {isActive && <div className="absolute inset-0 rounded-full" style={{ background: hexToRgba(bannerColor, 0.2) }} />}
                    </div>
                    <span className="text-center text-xs sm:text-base font-semibold leading-tight max-w-[64px] sm:max-w-[96px]" style={{ color: isActive ? bannerColor : undefined }}>
                      New
                    </span>
                  </button>
                );
              })()}

              {collections.map((col) => {
                const isActive = activeCollection === col.id;
                let colIds: string[] = [];
                try { colIds = JSON.parse(col.productIds || "[]"); } catch {}
                const colProds = colIds.length > 0
                  ? seller.products.filter(p => colIds.includes(p.productId))
                  : seller.products.filter(p => p.tags?.some(t => t.toLowerCase() === col.filterTag.toLowerCase()));
                const saleCount = colProds.filter(p => p.comparePrice && p.comparePrice > p.price).length;
                const shape = resolveCollectionShape(col.iconShape);
                return (
                  <button
                    key={col.id}
                    onClick={() => {
                      const next = isActive ? null : col.id;
                      setActiveCollection(next);
                      setGridAnimKey(k => k + 1);
                      if (!isActive) {
                        setTimeout(() => {
                          const el = productGridRef.current;
                          if (!el) return;
                          const filterBarH = productsRef.current?.offsetHeight ?? 0;
                          const collectionsBarH = collectionBarRef.current?.offsetHeight ?? 0;
                          const top = el.getBoundingClientRect().top + window.scrollY - filterBarH - collectionsBarH - 8;
                          window.scrollTo({ top, behavior: "smooth" });
                        }, 60);
                      }
                    }}
                    className="flex shrink-0 flex-col items-center gap-1.5 transition-all active:scale-95"
                  >
                    {/* Outer layer: the shape again, inset by `padding` so its
                        own background peeks through as a uniform-width ring —
                        a plain CSS border can't do this for clip-path shapes
                        (hexagon/diamond/etc.), see collection-shapes.ts. */}
                    <div
                      className={`nxc-coll-pill${isActive ? " active" : ""} h-14 w-14 sm:h-24 sm:w-24 ${shape.shapeClass} ${isActive ? "coll-pop" : ""}`}
                      style={{
                        padding: 2.5,
                        background: isActive ? bannerColor : "transparent",
                        boxShadow: isActive ? `0 0 0 2px ${hexToRgba(bannerColor, 0.35)}` : "0 2px 8px rgba(0,0,0,0.10)",
                      }}
                    >
                      <div className={`relative h-full w-full overflow-hidden ${shape.shapeClass}`}>
                        {col.image ? (
                          <Image src={col.image} alt={col.name} fill className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-base sm:text-2xl font-bold text-white" style={{ background: hexToRgba(bannerColor, 0.75) }}>
                            {col.name[0]?.toUpperCase()}
                          </div>
                        )}
                        {isActive && <div className="absolute inset-0" style={{ background: hexToRgba(bannerColor, 0.18) }} />}
                      </div>
                    </div>
                    <span className="text-center text-xs sm:text-base font-semibold leading-tight max-w-[64px] sm:max-w-[96px] truncate transition-colors" style={{ color: isActive ? bannerColor : undefined }}>
                      {col.name}
                    </span>
                    {saleCount > 0 && (
                      <span className="text-[8px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full text-white -mt-0.5" style={{ background: bannerColor }}>
                        {saleCount} sale
                      </span>
                    )}
                  </button>
                );
              })}
              </div>

              {/* View All button */}
              <button
                onClick={() => setShowAllCollections(true)}
                className="flex shrink-0 flex-col items-center gap-1.5 transition-all active:scale-95"
              >
                <div
                  className="relative h-14 w-14 sm:h-24 sm:w-24 overflow-hidden rounded-full border-[2.5px] border-dashed flex items-center justify-center"
                  style={{ borderColor: hexToRgba(bannerColor, 0.45), background: hexToRgba(bannerColor, 0.06) }}
                >
                  <MoreHorizontal className="h-4 w-4 sm:h-8 sm:w-8" style={{ color: bannerColor }} />
                </div>
                <span className="text-center text-xs sm:text-base font-semibold leading-tight max-w-[64px] sm:max-w-[96px]" style={{ color: bannerColor }}>
                  View All
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW ALL COLLECTIONS MODAL ── */}
      {showAllCollections && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/55" onClick={() => setShowAllCollections(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[81] drawer-up rounded-t-2xl bg-background shadow-2xl" style={{ maxHeight: "85vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 sticky top-0 bg-background z-10" style={{ borderTopColor: bannerColor, borderTopWidth: 3 }}>
              <h3 className="font-bold text-[15px]">All Collections</h3>
              <button onClick={() => setShowAllCollections(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-4">
              {newProducts.length > 0 && (() => {
                const isActive = activeCollection === "__new__";
                return (
                  <button
                    key="__new__"
                    onClick={() => {
                      setActiveCollection(isActive ? null : "__new__");
                      setGridAnimKey(k => k + 1);
                      setShowAllCollections(false);
                      setTimeout(() => {
                        const el = productGridRef.current;
                        if (!el) return;
                        const filterBarH = productsRef.current?.offsetHeight ?? 0;
                        const collectionsBarH = collectionBarRef.current?.offsetHeight ?? 0;
                        const top = el.getBoundingClientRect().top + window.scrollY - filterBarH - collectionsBarH - 8;
                        window.scrollTo({ top, behavior: "smooth" });
                      }, 250);
                    }}
                    className="flex flex-col items-center gap-1.5 transition-all active:scale-95"
                  >
                    <div
                      className={`relative h-20 w-20 overflow-hidden rounded-full border-[2.5px] ${isActive ? "active" : ""}`}
                      style={{
                        borderColor: isActive ? bannerColor : "transparent",
                        boxShadow: isActive ? `0 0 0 2px ${hexToRgba(bannerColor, 0.35)}` : "0 2px 8px rgba(0,0,0,0.10)",
                        background: `linear-gradient(135deg, ${bannerColor} 0%, ${bannerColor2} 100%)`,
                      }}
                    >
                      <div className="h-full w-full flex flex-col items-center justify-center gap-1">
                        <Zap className="h-7 w-7 text-yellow-300" />
                        <span className="text-xs font-black text-white">{newProducts.length} new</span>
                      </div>
                    </div>
                    <span className="text-center text-sm font-semibold leading-tight max-w-[88px]" style={{ color: isActive ? bannerColor : undefined }}>
                      New
                    </span>
                  </button>
                );
              })()}

              {collections.map((col) => {
                const isActive = activeCollection === col.id;
                let colIds: string[] = [];
                try { colIds = JSON.parse(col.productIds || "[]"); } catch {}
                const colProds = colIds.length > 0
                  ? seller.products.filter(p => colIds.includes(p.productId))
                  : seller.products.filter(p => p.tags?.some(t => t.toLowerCase() === col.filterTag.toLowerCase()));
                const saleCount = colProds.filter(p => p.comparePrice && p.comparePrice > p.price).length;
                const shape = resolveCollectionShape(col.iconShape);
                return (
                  <button
                    key={col.id}
                    onClick={() => {
                      const next = isActive ? null : col.id;
                      setActiveCollection(next);
                      setGridAnimKey(k => k + 1);
                      setShowAllCollections(false);
                      if (!isActive) {
                        setTimeout(() => {
                          const el = productGridRef.current;
                          if (!el) return;
                          const filterBarH = productsRef.current?.offsetHeight ?? 0;
                          const collectionsBarH = collectionBarRef.current?.offsetHeight ?? 0;
                          const top = el.getBoundingClientRect().top + window.scrollY - filterBarH - collectionsBarH - 8;
                          window.scrollTo({ top, behavior: "smooth" });
                        }, 250);
                      }
                    }}
                    className="flex flex-col items-center gap-1.5 transition-all active:scale-95"
                  >
                    <div
                      className={`h-20 w-20 ${shape.shapeClass}`}
                      style={{
                        padding: 2.5,
                        background: isActive ? bannerColor : "transparent",
                        boxShadow: isActive ? `0 0 0 2px ${hexToRgba(bannerColor, 0.35)}` : "0 2px 8px rgba(0,0,0,0.10)",
                      }}
                    >
                      <div className={`relative h-full w-full overflow-hidden ${shape.shapeClass}`}>
                        {col.image ? (
                          <Image src={col.image} alt={col.name} fill className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: hexToRgba(bannerColor, 0.75) }}>
                            {col.name[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-center text-sm font-semibold leading-tight max-w-[88px] truncate transition-colors" style={{ color: isActive ? bannerColor : undefined }}>
                      {col.name}
                    </span>
                    {saleCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white -mt-0.5" style={{ background: bannerColor }}>
                        {saleCount} sale
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Sentinel: fires the instant the product section border touches the collections bar */}
      <div ref={productSentinelRef} className="h-px w-full" />

      {/* ── PRODUCTS GRID ── */}
      <div
        className="px-4 sm:px-8 pt-6 min-h-screen"
        style={{
          // `background` (not `backgroundColor`) since resolvedPageBg can be
          // a linear-gradient() string when the seller picked a custom
          // gradient for this setting — backgroundColor silently ignores
          // gradient values.
          background: resolvedPageBg,
          borderTop: `4px solid ${hexToRgba(bannerColor, 0.7)}`,
          boxShadow: `inset 0 4px 40px 0 ${hexToRgba(bannerColor, 0.18)}`,
        }}
      >
      <div ref={productGridRef} className="mx-auto max-w-full">

        {/* ── RETURNING VISITOR BANNER ── */}
        {returningProduct && !rvDismissed && (
          <div
            className="mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm"
            style={{
              background: hexToRgba(bannerColor, 0.07),
              border: `1.5px solid ${hexToRgba(bannerColor, 0.25)}`,
              animation: "bannerSlide 0.4s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            {/* Product thumbnail */}
            {returningProduct.image ? (
              <img
                src={returningProduct.image}
                alt={returningProduct.name}
                className="h-12 w-12 rounded-xl object-contain bg-white shrink-0 border border-border/40"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-white shrink-0 flex items-center justify-center" style={{ border: `1.5px solid ${hexToRgba(bannerColor, 0.2)}` }}>
                <span className="text-xl">🛍️</span>
              </div>
            )}

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold mb-0.5" style={{ color: bannerColor }}>
                👋 Welcome back!
              </p>
              <p className="text-[13px] font-bold text-foreground leading-snug truncate">
                Still thinking about {returningProduct.name}?
              </p>
            </div>

            {/* View button */}
            <a
              href={`/product/${returningProduct.productId}`}
              className="shrink-0 rounded-xl px-3 py-1.5 text-[12px] font-bold text-white whitespace-nowrap shadow-sm active:scale-95 transition-transform"
              style={{ background: `linear-gradient(135deg, ${bannerColor}, ${bannerColor2})` }}
            >
              View →
            </a>

            {/* Dismiss */}
            <button
              onClick={() => setRvDismissed(true)}
              className="shrink-0 rounded-full p-1 hover:bg-black/5 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* ── GALLERY STRIP ── */}
        {galleryProducts.length > 0 && !hasActiveFilters && (
          <div className="mb-5">
            <h3 className="text-[14px] font-bold text-foreground mb-3">Curated for You</h3>
            <div
              ref={gallerySliderRef}
              className="flex gap-3 overflow-x-auto overflow-y-visible"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: "8px" }}
              onMouseEnter={() => { galPausedRef.current = true; }}
              onMouseLeave={() => { galPausedRef.current = false; }}
              onTouchStart={() => { galPausedRef.current = true; }}
              onTouchEnd={() => { setTimeout(() => { galPausedRef.current = false; }, 2000); }}
            >
              {galleryProducts.map(product => (
                <GalleryCard key={product.id} product={product} sellerId={seller.sellerId} sellerName={seller.storeName} />
              ))}
            </div>
          </div>
        )}

        {/* Result count + active filter chips */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {sorted.length} product{sorted.length !== 1 ? "s" : ""} found
          </p>
          {/* "Did you mean" auto-correct hint */}
          {usingCorrectedQuery && correctedQuery && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              Showing results for{" "}
              <button
                onClick={() => setSearchQuery(correctedQuery)}
                className="font-semibold underline underline-offset-2"
                style={{ color: bannerColor }}
              >
                &ldquo;{correctedQuery}&rdquo;
              </button>{" "}
              instead of &ldquo;{searchQuery.trim()}&rdquo;
            </p>
          )}
          {/* Active filter chips */}
          {searchQuery.trim() && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ background: hexToRgba(bannerColor, 0.12), border: `1px solid ${hexToRgba(bannerColor, 0.3)}`, color: bannerColor }}
            >
              &ldquo;{searchQuery.trim()}&rdquo;
              <button onClick={() => setSearchQuery("")}><X className="h-3 w-3" /></button>
            </span>
          )}
          {(minPrice || maxPrice) && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ background: hexToRgba(bannerColor, 0.12), border: `1px solid ${hexToRgba(bannerColor, 0.3)}`, color: bannerColor }}
            >
              {minPrice ? `₹${minPrice}` : "0"} – {maxPrice ? `₹${maxPrice}` : "∞"}
              <button onClick={() => { setMinPrice(""); setMaxPrice(""); }}><X className="h-3 w-3" /></button>
            </span>
          )}
          {activeCollection && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ background: hexToRgba(bannerColor, 0.12), border: `1px solid ${hexToRgba(bannerColor, 0.3)}`, color: bannerColor }}
            >
              {activeCollection === "__new__" ? "New Arrivals" : collections.find(c => c.id === activeCollection)?.name ?? activeCollection}
              <button onClick={() => setActiveCollection(null)}><X className="h-3 w-3" /></button>
            </span>
          )}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchQuery("");
                setMinPrice("");
                setMaxPrice("");
                setActiveCategory("All");
                setSelectedOfferId(null);
                setActiveCollection(null);
              }}
              className="text-[11px] underline transition-colors"
              style={{ color: bannerColor }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* ── STACKED COLLECTION SECTIONS ──
            One labelled shelf per Store Collection, in sortOrder, shown on
            the default (unfiltered) browse view — each has its own heading
            and "See all in <Collection>" jump into the existing single-grid
            filtered view (reusing the already-correct filter/scroll logic
            instead of duplicating it). Sits above the flat All Products grid
            below so uncategorized products stay visible too. */}
        {collectionSections.length > 0 && (
          <div className="mb-2">
            {collectionSections.map((section, sIdx) => {
              const showCount = collectionSectionCounts[section.collection.id] ?? 8;
              const sectionVisible = section.products.slice(0, showCount);
              // Each collection can carry its own heading style (seller
              // picks it in Dashboard → Collections). Two independent kinds
              // of choice share the one stored value: a decorative style
              // (Unicode transform + symbol wrap, e.g. "✦ SHIRTS ✦") takes
              // priority when the stored key matches one; otherwise it's
              // treated as a plain CARD_FONTS key (falls back to the same
              // "sans" default products use when nothing's been chosen).
              const headingStyle = getCollectionHeadingStyle(section.collection.fontStyle);
              const sectionFont = resolveCardFont(section.collection.fontStyle);
              const headingText = headingStyle ? headingStyle.apply(section.collection.name) : section.collection.name;
              return (
                <div key={section.collection.id} className={sIdx === 0 ? "mb-8" : "mb-8 pt-6 border-t border-border/40"}>
                  {/* Rectangle-box heading — border colour follows the
                      store's banner colour, name centred in the middle
                      (not left/right-aligned), font per-collection. */}
                  <div
                    className="relative flex items-center justify-center rounded-xl px-4 py-3 mb-2"
                    style={{ border: `2px solid ${bannerColor}`, background: hexToRgba(bannerColor, 0.05) }}
                  >
                    {/* Base size is roughly 37% bigger than the old text-base (16px -> 22px)
                        on narrow phones, then scales smoothly with viewport width via
                        clamp() rather than jumping at fixed breakpoints, capping at
                        30px so it doesn't grow unbounded on very wide desktop screens.
                        twMerge (via cn()) still lets a per-collection decorative font's
                        own text-[] size (script/bebas/cormorant/dmserif/pacifico) win
                        over this default when one is set. */}
                    <h3 className={cn("text-center text-[clamp(22px,2.6vw,30px)] font-bold tracking-wide truncate max-w-full", sectionFont.titleClass)} style={{ color: bannerColor }}>
                      {headingText}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between mb-4 px-0.5">
                    <span className="text-[11px] text-muted-foreground">{section.products.length} product{section.products.length !== 1 ? "s" : ""}</span>
                    <button
                      onClick={() => {
                        setActiveCollection(section.collection.id);
                        setGridAnimKey(k => k + 1);
                        setTimeout(() => {
                          const el = productGridRef.current;
                          if (!el) return;
                          const filterBarH = productsRef.current?.offsetHeight ?? 0;
                          const collectionsBarH = collectionBarRef.current?.offsetHeight ?? 0;
                          const top = el.getBoundingClientRect().top + window.scrollY - filterBarH - collectionsBarH - 8;
                          window.scrollTo({ top, behavior: "smooth" });
                        }, 60);
                      }}
                      className="text-[11px] font-semibold underline transition-colors shrink-0"
                      style={{ color: bannerColor }}
                    >
                      See all
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 pb-2">
                    {sectionVisible.map((product, idx) => (
                      <div
                        key={product.id}
                        className="card-anim relative flex flex-col gap-1.5 group/card"
                        style={{ animationDelay: `${idx * 45}ms` }}
                        onClick={() => {
                          try {
                            const key = `nxc-rv-${seller.sellerId}`;
                            const rv: string[] = JSON.parse(localStorage.getItem(key) || "[]");
                            const updated = [product.productId, ...rv.filter(id => id !== product.productId)].slice(0, 10);
                            localStorage.setItem(key, JSON.stringify(updated));
                            setRecentlyViewedIds(updated);
                          } catch {}
                          saveLastProduct(product);
                          setReturningProduct(null);
                          setRvDismissed(true);
                        }}
                      >
                        {isNewProduct(product.createdAt) && (
                          <div className="absolute top-2 right-2 z-20 rounded-full px-1.5 py-0.5 text-[9px] font-black text-white shadow-lg pointer-events-none" style={{ background: bannerColor }}>
                            NEW
                          </div>
                        )}
                        {product.salesCount > 20 && (
                          <div className="absolute top-2 left-2 z-20 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg pointer-events-none" style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)" }}>
                            {product.salesCount > 1000 ? `${Math.floor(product.salesCount / 1000)}K sold` : `${product.salesCount} sold`}
                          </div>
                        )}
                        <ProductCard
                          id={product.id}
                          productId={product.productId}
                          name={product.name}
                          description={product.description}
                          price={product.price}
                          comparePrice={product.comparePrice}
                          image={product.images[0]}
                          images={product.images}
                          rating={product.rating}
                          reviewCount={product.reviewCount}
                          sellerId={seller.sellerId}
                          sellerColor={bannerColor}
                          showVariantsOnCard={product.showVariantsOnCard}
                          cardImageAutoSlide={product.cardImageAutoSlide}
                          sellerName={seller.storeName}
                          stock={product.stock}
                          isFeatured={product.isFeatured}
                          isBestSeller={product.salesCount > 100}
                          deliveryInfo={product.deliveryInfo ?? undefined}
                          condition={product.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"} cardDesign={product.cardDesign} cardFont={product.cardFont} cardDisplayText={product.cardDisplayText}
                          offers={offers}
                          variants={product.variants ?? []}
                          buyNowGradient={`linear-gradient(135deg, ${bannerColor}, ${bannerColor2})`}
                          cardBorderColor={product.cardBorderColor}
                          cardImagePosition={product.cardImagePosition}
                        />
                      </div>
                    ))}
                  </div>
                  {section.products.length > showCount && (
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => setCollectionSectionCounts(prev => ({ ...prev, [section.collection.id]: showCount + 8 }))}
                        className="rounded-xl border px-6 py-2 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ borderColor: bannerColor, color: bannerColor, background: hexToRgba(bannerColor, 0.06) }}
                      >
                        Show more · {section.products.length - showCount} remaining
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="mb-16">
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border gap-3 text-muted-foreground py-8">
              <Store className="h-10 w-10 opacity-30" />
              <p className="text-sm text-center px-4">
                {searchQuery.trim()
                  ? `No products found for "${searchQuery.trim()}"`
                  : (minPrice || maxPrice)
                  ? "No products in this price range"
                  : selectedOfferId
                  ? "No products available for this offer"
                  : activeCategory !== "All"
                  ? `No products found for ${activeCategory}`
                  : "No products in this store yet"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setMinPrice("");
                    setMaxPrice("");
                    setActiveCategory("All");
                    setSelectedOfferId(null);
                  }}
                  className="text-xs text-primary underline hover:opacity-70"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* ── Zero-result search fallback — Flipkart-style: never leave the
                shopper at a dead end, surface the store's popular items instead ── */}
            {searchNoResultsSuggestions.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4 pt-2 border-t border-border/40">
                  <TrendingUp className="h-4 w-4 shrink-0" style={{ color: bannerColor }} />
                  <h3 className="text-sm font-bold text-foreground">You might like these instead</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {searchNoResultsSuggestions.map((product, idx) => (
                    <div
                      key={product.id}
                      className="card-anim relative flex flex-col gap-1.5 group/card"
                      style={{ animationDelay: `${idx * 45}ms` }}
                    >
                      {isNewProduct(product.createdAt) && (
                        <div className="absolute top-2 right-2 z-20 rounded-full px-1.5 py-0.5 text-[9px] font-black text-white shadow-lg pointer-events-none" style={{ background: bannerColor }}>NEW</div>
                      )}
                      {product.isFlashSale && (
                        <div className="absolute top-2 left-2 z-20 rounded-full px-1.5 py-0.5 text-[9px] font-black text-white shadow-lg pointer-events-none" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>⚡ FLASH</div>
                      )}
                      {!product.isFlashSale && product.salesCount > 20 && (
                        <div className="absolute top-2 left-2 z-20 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg pointer-events-none" style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)" }}>
                          {product.salesCount > 1000 ? `${Math.floor(product.salesCount / 1000)}K sold` : `${product.salesCount} sold`}
                        </div>
                      )}
                      <ProductCard
                        id={product.id}
                        productId={product.productId}
                        name={product.name}
                        description={product.description}
                        price={product.price}
                        comparePrice={product.comparePrice}
                        image={product.images[0]}
                        images={product.images}
                        rating={product.rating}
                        reviewCount={product.reviewCount}
                        sellerId={seller.sellerId}
                        sellerColor={bannerColor}
                        showVariantsOnCard={product.showVariantsOnCard}
                        cardImageAutoSlide={product.cardImageAutoSlide}
                        sellerName={seller.storeName}
                        stock={product.stock}
                        isFeatured={product.isFeatured}
                        isBestSeller={product.salesCount > 100}
                        deliveryInfo={product.deliveryInfo ?? undefined}
                        condition={product.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"} cardDesign={product.cardDesign} cardFont={product.cardFont} cardDisplayText={product.cardDisplayText}
                        offers={offers}
                        variants={product.variants ?? []}
                        buyNowGradient={`linear-gradient(135deg, ${bannerColor}, ${bannerColor2})`}
                        cardBorderColor={product.cardBorderColor}
                        cardImagePosition={product.cardImagePosition}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div key={gridAnimKey} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 pb-6">
              {visible.map((product, idx) => (
                <div
                  key={product.id}
                  className="card-anim relative flex flex-col gap-1.5 group/card"
                  style={{ animationDelay: `${idx * 55}ms` }}
                  onClick={() => {
                    try {
                      const key = `nxc-rv-${seller.sellerId}`;
                      const rv: string[] = JSON.parse(localStorage.getItem(key) || "[]");
                      const updated = [product.productId, ...rv.filter(id => id !== product.productId)].slice(0, 10);
                      localStorage.setItem(key, JSON.stringify(updated));
                      setRecentlyViewedIds(updated);
                    } catch {}
                    // Save full product info for returning visitor banner
                    saveLastProduct(product);
                    setReturningProduct(null); // hide banner on this visit after clicking
                    setRvDismissed(true);
                  }}
                >
                  {/* NEW badge */}
                  {isNewProduct(product.createdAt) && (
                    <div className="absolute top-2 right-2 z-20 rounded-full px-1.5 py-0.5 text-[9px] font-black text-white shadow-lg pointer-events-none" style={{ background: bannerColor }}>
                      NEW
                    </div>
                  )}
                  {/* Social proof — sold count */}
                  {product.salesCount > 20 && (
                    <div className="absolute top-2 left-2 z-20 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg pointer-events-none" style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)" }}>
                      {product.salesCount > 1000 ? `${Math.floor(product.salesCount / 1000)}K sold` : `${product.salesCount} sold`}
                    </div>
                  )}
                  <ProductCard
                    id={product.id}
                    productId={product.productId}
                    name={product.name}
                    description={product.description}
                    price={product.price}
                    comparePrice={product.comparePrice}
                    image={product.images[0]}
                    images={product.images}
                    rating={product.rating}
                    reviewCount={product.reviewCount}
                    sellerId={seller.sellerId}
                    sellerColor={bannerColor}
                    showVariantsOnCard={product.showVariantsOnCard}
                    cardImageAutoSlide={product.cardImageAutoSlide}
                    sellerName={seller.storeName}
                    stock={product.stock}
                    isFeatured={product.isFeatured}
                    isBestSeller={product.salesCount > 100}
                    deliveryInfo={product.deliveryInfo ?? undefined}
                    condition={product.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"} cardDesign={product.cardDesign} cardFont={product.cardFont} cardDisplayText={product.cardDisplayText}
                    offers={offers}
                    variants={product.variants ?? []}
                    buyNowGradient={`linear-gradient(135deg, ${bannerColor}, ${bannerColor2})`}
                    cardBorderColor={product.cardBorderColor}
                    cardImagePosition={product.cardImagePosition}
                  />
                  {/* Flash sale countdown on discounted products */}
                  {product.comparePrice && product.comparePrice > product.price && saleTimer > 0 && (
                    <div className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-white" style={{ background: `linear-gradient(135deg,${darkenHex(bannerColor,0.8)},${bannerColor})` }}>
                      <Flame className="h-3 w-3 shrink-0 text-yellow-300 flash-pulse" />
                      <span>Sale ends {formatTimer(saleTimer)}</span>
                    </div>
                  )}
                  {/* Action row: Wishlist + Compare + Registry + Quick View */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => toggleWishlist(product.productId, e)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold transition-all active:scale-95 hover:scale-[1.02]"
                      style={wishlist.includes(product.productId)
                        ? { borderColor: "#f43f5e", color: "#f43f5e", background: "rgba(244,63,94,0.08)" }
                        : { borderColor: hexToRgba(bannerColor, 0.35), color: bannerColor, background: hexToRgba(bannerColor, 0.05) }}
                    >
                      <Heart className={`h-3 w-3 shrink-0 ${wishlist.includes(product.productId) ? "fill-[#f43f5e] text-[#f43f5e]" : ""}`} />
                      <span className="hidden sm:inline">{wishlist.includes(product.productId) ? "Saved" : "Wishlist"}</span>
                    </button>
                    <button
                      onClick={(e) => toggleCompare(product.id, e)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold transition-all active:scale-95 hover:scale-[1.02]"
                      style={compareIds.includes(product.id)
                        ? { borderColor: bannerColor, color: "white", background: bannerColor }
                        : { borderColor: hexToRgba(bannerColor, 0.35), color: bannerColor, background: hexToRgba(bannerColor, 0.05) }}
                    >
                      <TrendingUp className="h-3 w-3 shrink-0" />
                      <span className="hidden sm:inline">{compareIds.includes(product.id) ? "✓ Added" : "Compare"}</span>
                    </button>
                    {/* Gift Registry button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadUserRegistries();
                        setRegistryModal({ name: product.name, image: product.images?.[0] ?? "", price: product.price, productSlug: product.productId });
                      }}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold transition-all active:scale-95 hover:scale-[1.02]"
                      style={{ borderColor: hexToRgba(bannerColor, 0.35), color: bannerColor, background: hexToRgba(bannerColor, 0.05) }}
                      title="Add to Gift Registry"
                    >
                      <Gift className="h-3 w-3 shrink-0" />
                      <span className="hidden sm:inline">Registry</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setQuickViewProduct(product); setQuickViewImg(0); }}
                      className="hidden sm:flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold transition-all opacity-0 group-hover/card:opacity-100 hover:scale-[1.02]"
                      style={{ borderColor: hexToRgba(bannerColor, 0.4), color: bannerColor, background: hexToRgba(bannerColor, 0.06) }}
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Load More */}
            {sorted.length > visibleCount && (
              <div className="flex flex-col items-center gap-1 pb-12">
                <button
                  onClick={() => setVisibleCount(v => v + 12)}
                  className="rounded-xl border px-8 py-3 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ borderColor: bannerColor, color: bannerColor, background: hexToRgba(bannerColor, 0.06) }}
                >
                  Load more · {sorted.length - visibleCount} remaining
                </button>
                <p className="text-[11px] text-muted-foreground">Showing {visibleCount} of {sorted.length}</p>
              </div>
            )}
            {sorted.length <= visibleCount && <div className="pb-8" />}

            {/* ── YOU MAY ALSO LIKE ── */}
            {youMayLike.length > 0 && (
              <div className="mt-2 mb-6">
                <div className="flex items-center gap-2 mb-4 pt-2 border-t border-border/40">
                  <TrendingUp className="h-4 w-4 shrink-0" style={{ color: bannerColor }} />
                  <h3 className="text-sm font-bold text-foreground">You may also like</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {youMayLike.map((product, idx) => (
                    <div
                      key={product.id}
                      className="card-anim relative flex flex-col gap-1.5 group/card"
                      style={{ animationDelay: `${idx * 45}ms` }}
                      onClick={() => {
                        try {
                          const key = `nxc-rv-${seller.sellerId}`;
                          const rv: string[] = JSON.parse(localStorage.getItem(key) || "[]");
                          const updated = [product.productId, ...rv.filter(id => id !== product.productId)].slice(0, 10);
                          localStorage.setItem(key, JSON.stringify(updated));
                          setRecentlyViewedIds(updated);
                        } catch {}
                      }}
                    >
                      {isNewProduct(product.createdAt) && (
                        <div className="absolute top-2 right-2 z-20 rounded-full px-1.5 py-0.5 text-[9px] font-black text-white shadow-lg pointer-events-none" style={{ background: bannerColor }}>NEW</div>
                      )}
                      {product.isFlashSale && (
                        <div className="absolute top-2 left-2 z-20 rounded-full px-1.5 py-0.5 text-[9px] font-black text-white shadow-lg pointer-events-none" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>⚡ FLASH</div>
                      )}
                      {!product.isFlashSale && product.salesCount > 20 && (
                        <div className="absolute top-2 left-2 z-20 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg pointer-events-none" style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)" }}>
                          {product.salesCount > 1000 ? `${Math.floor(product.salesCount / 1000)}K sold` : `${product.salesCount} sold`}
                        </div>
                      )}
                      <ProductCard
                        id={product.id}
                        productId={product.productId}
                        name={product.name}
                        description={product.description}
                        price={product.price}
                        comparePrice={product.comparePrice}
                        image={product.images[0]}
                        images={product.images}
                        rating={product.rating}
                        reviewCount={product.reviewCount}
                        sellerId={seller.sellerId}
                        sellerColor={bannerColor}
                        showVariantsOnCard={product.showVariantsOnCard}
                        cardImageAutoSlide={product.cardImageAutoSlide}
                        sellerName={seller.storeName}
                        stock={product.stock}
                        isFeatured={product.isFeatured}
                        isBestSeller={product.salesCount > 100}
                        deliveryInfo={product.deliveryInfo ?? undefined}
                        condition={product.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"} cardDesign={product.cardDesign} cardFont={product.cardFont} cardDisplayText={product.cardDisplayText}
                        offers={offers}
                        variants={product.variants ?? []}
                        buyNowGradient={`linear-gradient(135deg, ${bannerColor}, ${bannerColor2})`}
                        cardBorderColor={product.cardBorderColor}
                        cardImagePosition={product.cardImagePosition}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── WISHLIST ── */}
            {wishlistProducts.length > 0 && (
              <div className="mt-2 mb-6">
                <div className="flex items-center justify-between mb-4 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 shrink-0 fill-rose-500 text-rose-500" />
                    <h3 className="text-sm font-bold text-foreground">My Wishlist ({wishlistProducts.length})</h3>
                  </div>
                  <button onClick={() => { setWishlist([]); try { localStorage.removeItem(`nxc-wl-${seller.sellerId}`); } catch {} }} className="text-[11px] text-muted-foreground underline hover:text-foreground transition-colors">
                    Clear all
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {wishlistProducts.map((product, idx) => (
                    <div key={product.id} className="card-anim relative flex flex-col gap-1.5 group/card" style={{ animationDelay: `${idx * 40}ms` }}>
                      {isNewProduct(product.createdAt) && (
                        <div className="absolute top-2 right-2 z-20 rounded-full px-1.5 py-0.5 text-[9px] font-black text-white shadow-lg pointer-events-none" style={{ background: bannerColor }}>NEW</div>
                      )}
                      <ProductCard
                        id={product.id}
                        productId={product.productId}
                        name={product.name}
                        description={product.description}
                        price={product.price}
                        comparePrice={product.comparePrice}
                        image={product.images[0]}
                        images={product.images}
                        rating={product.rating}
                        reviewCount={product.reviewCount}
                        sellerId={seller.sellerId}
                        sellerColor={bannerColor}
                        showVariantsOnCard={product.showVariantsOnCard}
                        cardImageAutoSlide={product.cardImageAutoSlide}
                        sellerName={seller.storeName}
                        stock={product.stock}
                        isFeatured={product.isFeatured}
                        isBestSeller={product.salesCount > 100}
                        deliveryInfo={product.deliveryInfo ?? undefined}
                        condition={product.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"} cardDesign={product.cardDesign} cardFont={product.cardFont} cardDisplayText={product.cardDisplayText}
                        offers={offers}
                        variants={product.variants ?? []}
                        buyNowGradient={`linear-gradient(135deg, ${bannerColor}, ${bannerColor2})`}
                        cardBorderColor={product.cardBorderColor}
                        cardImagePosition={product.cardImagePosition}
                      />
                      <button
                        onClick={(e) => toggleWishlist(product.productId, e)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 py-1.5 text-[11px] font-semibold text-rose-500 bg-rose-50 hover:bg-rose-100 transition-all"
                      >
                        <X className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── RECENTLY VIEWED ── */}
            {recentlyViewed.length > 0 && (
              <div className="mt-2 mb-8">
                <div className="flex items-center gap-2 mb-3 pt-2 border-t border-border/40">
                  <Clock className="h-4 w-4 shrink-0" style={{ color: bannerColor }} />
                  <h3 className="text-sm font-bold text-foreground">Recently viewed</h3>
                </div>
                <div className="flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-1">
                  {recentlyViewed.map((product, idx) => (
                    <button
                      key={product.id}
                      className="rv-slide shrink-0 flex flex-col gap-1 w-[90px] transition-all active:scale-95 text-left"
                      style={{ animationDelay: `${idx * 35}ms` }}
                      onClick={() => router.push(`/product/${product.productId}`)}
                    >
                      <div className="relative h-[90px] w-[90px] rounded-xl overflow-hidden bg-muted/30 border border-border/40">
                        {product.images[0] ? (
                          <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-6 w-6 opacity-30 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight">{product.name}</p>
                      <p className="text-[11px] font-bold" style={{ color: bannerColor }}>₹{product.price.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>

      {/* ── COMPARE FLOATING BAR ── */}
      {compareIds.length > 0 && !compareOpen && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] banner-slide">
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl text-white" style={{ background: `linear-gradient(135deg,${bannerColor},${bannerColor2})`, boxShadow: `0 8px 32px ${hexToRgba(bannerColor,0.55)}` }}>
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span className="text-sm font-bold">{compareIds.length === 1 ? "Select 1 more to compare" : "Compare 2 Products"}</span>
            {compareIds.length === 2 && (
              <button onClick={() => setCompareOpen(true)} className="rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1 text-sm font-bold transition-all">
                Compare →
              </button>
            )}
            <button onClick={() => setCompareIds([])} className="text-white/60 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
