"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Tag, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store";

interface DealVariant { id: string; name: string; value: string; price?: number | null; stock: number; }

interface DealProduct {
  id: string;
  productId: string;
  name: string;
  price: number;
  comparePrice: number;
  images: string[];
  stock: number;
  storeName: string;
  sellerId: string;
  discount: number;
  variants?: DealVariant[];
}

function parseVariantLabel(value: string): string {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null)
      return Object.values(parsed).filter(Boolean).join(" · ");
  } catch { /* not JSON */ }
  return value;
}

function DealCard({ deal }: { deal: DealProduct }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const variantRef = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const addToCart = useCartStore((s) => s.addItem);
  const closeCart = useCartStore((s) => s.closeCart);

  const variants = deal.variants ?? [];
  const [selectedVariant, setSelectedVariant] = useState<DealVariant | null>(
    variants.length > 0 ? variants[0] : null
  );
  const [variantOpen, setVariantOpen] = useState(false);

  const activePrice = selectedVariant?.price ?? deal.price;

  useEffect(() => {
    if (!variantOpen) return;
    const fn = (e: MouseEvent) => {
      if (!variantRef.current?.contains(e.target as Node)) setVariantOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [variantOpen]);

  const flyToCart = () => {
    const cartBtn =
      document.getElementById("navbar-cart-btn") ||
      document.getElementById("navbar-cart-btn-desktop");
    if (!cartBtn || !cardRef.current) return;
    const cardRect = cardRef.current.getBoundingClientRect();
    const cartRect = cartBtn.getBoundingClientRect();
    const size = 52;
    const startX = cardRect.left + cardRect.width / 2 - size / 2;
    const startY = cardRect.top + cardRect.height / 4 - size / 2;
    const fly = document.createElement("div");
    fly.style.cssText = `position:fixed;z-index:99999;width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.28);pointer-events:none;left:${startX}px;top:${startY}px;transition:none;`;
    if (deal.images[0]) {
      const img = document.createElement("img");
      img.src = deal.images[0];
      img.style.cssText = "width:100%;height:100%;object-fit:cover;";
      fly.appendChild(img);
    }
    document.body.appendChild(fly);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fly.style.transition = "all 0.65s cubic-bezier(0.4,0,0.2,1)";
        fly.style.left = `${cartRect.left + cartRect.width / 2 - 12}px`;
        fly.style.top = `${cartRect.top + cartRect.height / 2 - 12}px`;
        fly.style.width = "24px";
        fly.style.height = "24px";
        fly.style.opacity = "0";
        fly.style.transform = "scale(0.2)";
      });
    });
    setTimeout(() => {
      if (document.body.contains(fly)) document.body.removeChild(fly);
    }, 750);
  };

  const onCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!deal.stock || adding) return;
    setAdding(true);
    addToCart({
      productId: deal.id,
      productName: deal.name,
      productImage: deal.images[0] || "",
      sellerId: deal.sellerId,
      sellerName: deal.storeName,
      price: deal.price,
      quantity: 1,
      stock: deal.stock,
    });
    closeCart();
    flyToCart();
    setTimeout(() => { setAdding(false); setAdded(true); }, 300);
    setTimeout(() => setAdded(false), 2000);
    toast.success("Added to cart", { duration: 1500 });
  };

  return (
    <div
      ref={cardRef}
      className="flex shrink-0 sm:shrink flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 w-[152px] sm:w-auto"
      style={{
        borderRadius: 12,
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
      }}
    >
      {/* Image */}
      <div className="relative">
        <Link
          href={`/product/${deal.productId}`}
          className="relative block h-[136px] sm:h-[300px]"
          style={{
            background: "rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {deal.images[0] ? (
            <Image
              src={deal.images[0]}
              alt={deal.name}
              fill
              className="object-cover"
              sizes="152px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Tag className="h-8 w-8 text-white/20" />
            </div>
          )}
        </Link>
        {deal.stock > 0 && (
          <button
            onClick={onCart}
            suppressHydrationWarning
            aria-label={added ? "Added to cart" : "Add to cart"}
            className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.28)] border border-white/40 transition-all duration-200 active:scale-90 ${
              added ? "bg-emerald-500" : "bg-pink-500 hover:bg-pink-600"
            }`}
          >
            {added ? <Check className="h-3.5 w-3.5 text-white stroke-[2.5]" /> : <ShoppingCart className="h-3.5 w-3.5 text-white" />}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3">
        <Link
          href={`/product/${deal.productId}`}
          className="line-clamp-2 text-[11.5px] sm:text-[19px] font-medium text-white/85 leading-snug hover:text-white transition-colors"
        >
          {deal.name}
        </Link>
        <div>
          <span className="text-[15px] sm:text-[25px] font-bold tabular-nums text-white">
            ₹{activePrice.toLocaleString("en-IN")}
          </span>
          <span className="ml-1.5 text-[11px] sm:text-[17px] text-white/35 line-through tabular-nums">
            ₹{deal.comparePrice.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Variant picker */}
        {variants.length > 1 && (
          <div ref={variantRef} className="relative mt-1">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVariantOpen(v => !v); }}
              className="flex items-center gap-1 rounded-[6px] border border-white/25 bg-white/12 px-2 py-1 text-[10px] sm:text-[12px] font-semibold text-white/80 hover:bg-white/20 transition-colors"
            >
              <span>{selectedVariant ? parseVariantLabel(selectedVariant.value) : "Options"}</span>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className={`transition-transform duration-200 ${variantOpen ? "rotate-180" : ""}`}>
                <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {variantOpen && (
              <div
                className="absolute bottom-full left-0 mb-1.5 z-30 rounded-xl border border-white/15 bg-[#1a0010] shadow-2xl p-2 flex flex-wrap gap-1.5 min-w-[130px] max-w-[200px]"
                onClick={(e) => e.stopPropagation()}
              >
                {variants.map(v => (
                  <button
                    key={v.id}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedVariant(v); setVariantOpen(false); }}
                    disabled={v.stock === 0}
                    className={`rounded-[5px] border px-2.5 py-1 text-[10px] sm:text-[12px] font-semibold transition-all active:scale-95 leading-none ${
                      selectedVariant?.id === v.id
                        ? "border-white bg-white text-[#1a0010]"
                        : "border-white/25 text-white/70 hover:border-white/60 hover:text-white"
                    } ${v.stock === 0 ? "opacity-35 line-through cursor-not-allowed" : ""}`}
                  >
                    {parseVariantLabel(v.value)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] sm:text-[16px] text-white/40 truncate">{deal.storeName}</p>
        {deal.stock <= 10 && (
          <p className="text-[10px] sm:text-[15px] font-semibold text-red-400">Only {deal.stock} left</p>
        )}
      </div>
    </div>
  );
}

const DEALS_KEY = "nxc-deals-v1";
const DEALS_TTL = 10 * 60 * 1000; // 10 minutes

function getDealsCache(): DealProduct[] | null {
  try {
    const raw = localStorage.getItem(DEALS_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d?.ts || Date.now() - d.ts > DEALS_TTL) return null;
    return Array.isArray(d.deals) ? d.deals : null;
  } catch { return null; }
}

function saveDealsCache(deals: DealProduct[]) {
  try { localStorage.setItem(DEALS_KEY, JSON.stringify({ deals, ts: Date.now() })); } catch {}
}

export function DealOfDay() {
  // Seed from localStorage synchronously — 0ms on repeat visits, no flicker
  const [deals, setDeals] = useState<DealProduct[]>(() => {
    try { return getDealsCache() ?? []; } catch { return []; }
  });

  useEffect(() => {
    const cached = getDealsCache();
    if (cached && cached.length > 0) return; // fresh cache — skip API call entirely
    fetch("/api/deals-of-the-day")
      .then((r) => r.json())
      .then((data) => {
        const d: DealProduct[] = data.deals || [];
        setDeals(d);
        if (d.length > 0) saveDealsCache(d);
      })
      .catch(() => {});
  }, []);

  if (deals.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, #12000a 0%, #28001a 40%, #180010 100%)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
      }}
    >
      {/* Background glow orbs */}
      <div
        className="absolute top-0 right-0 h-[280px] w-[280px] rounded-full pointer-events-none"
        style={{ background: "#be185d", filter: "blur(90px)", opacity: 0.22, transform: "translate(30%, -30%)" }}
      />
      <div
        className="absolute bottom-0 left-0 h-[200px] w-[200px] rounded-full pointer-events-none"
        style={{ background: "#9d174d", filter: "blur(80px)", opacity: 0.15, transform: "translate(-30%, 30%)" }}
      />

      {/* Inner content */}
      <div className="relative px-5 pt-5 pb-5">
        {/* Section header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[15px] font-extrabold tracking-tight text-white">Deals of the Day</h2>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ background: "rgba(190,24,93,0.2)", color: "#f9a8d4", border: "1px solid rgba(190,24,93,0.3)" }}
            >
              Limited time
            </span>
          </div>
          <Link
            href="/deals"
            className="flex items-center gap-1 text-[12px] font-semibold transition-opacity hover:opacity-70"
            style={{ color: "#f9a8d4" }}
          >
            See all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Cards */}
        <div
          className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-x-visible md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8"
          style={{ scrollbarWidth: "none" }}
        >
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      </div>
    </section>
  );
}
