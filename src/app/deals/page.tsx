"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Tag, ChevronLeft, Search, X, Store } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

interface DealVariant { id: string; name: string; value: string; price?: number | null; stock: number; }

interface DealProduct {
  id: string; productId: string; name: string;
  price: number; comparePrice: number; images: string[];
  stock: number; storeName: string; sellerId: string; discount: number;
  variants?: DealVariant[];
}

function parseLabel(value: string): string {
  try {
    const p = JSON.parse(value);
    if (typeof p === "object" && p !== null) return Object.values(p).filter(Boolean).join(" · ");
  } catch { /* not JSON */ }
  return value;
}

function DealCard({ deal }: { deal: DealProduct }) {
  const variants = deal.variants ?? [];
  const [selVar, setSelVar] = useState<DealVariant | null>(variants.length > 0 ? variants[0] : null);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const activePrice = selVar?.price ?? deal.price;

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [open]);

  return (
    <div
      className="group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 active:scale-[0.98]"
      style={{ borderRadius: 14, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}
    >
      {/* Image */}
      <Link href={`/product/${deal.productId}`} className="block relative" style={{ height: 180, background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {deal.images[0] ? (
          <Image src={deal.images[0]} alt={deal.name} fill className="object-cover" sizes="(max-width:640px) 50vw, 33vw" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><Tag className="h-10 w-10 text-white/20" /></div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-md px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "0 2px 8px rgba(239,68,68,0.5)" }}>
          -{deal.discount}%
        </span>
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={`/product/${deal.productId}`}>
          <p className="line-clamp-2 text-[12.5px] font-medium leading-snug text-white/85">{deal.name}</p>
        </Link>
        <div>
          <span className="text-[17px] font-bold tabular-nums text-white">₹{activePrice.toLocaleString("en-IN")}</span>
          <span className="ml-2 text-[12px] tabular-nums text-white/35 line-through">₹{deal.comparePrice.toLocaleString("en-IN")}</span>
        </div>
        <p className="truncate text-[11px] text-white/40">{deal.storeName}</p>
        {deal.stock <= 10 && <p className="text-[11px] font-semibold text-red-400">Only {deal.stock} left!</p>}

        {/* Variant picker */}
        {variants.length > 1 && (
          <div className="relative">
            <button
              ref={btnRef}
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (open) { setOpen(false); return; }
                if (btnRef.current) {
                  const r = btnRef.current.getBoundingClientRect();
                  setDropPos({ top: r.bottom + 4, left: r.left });
                }
                setOpen(true);
              }}
              className="flex items-center gap-1 rounded-[6px] border border-white/25 bg-white/12 px-2 py-0.5 text-[10px] font-semibold text-white/75 hover:bg-white/20 transition-all"
            >
              <span>{selVar ? parseLabel(selVar.value) : "Options"}</span>
              <svg width="7" height="7" viewBox="0 0 8 8" fill="none" className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
                <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {open && (
              <div
                style={{ position: "fixed", top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
                className="rounded-xl border border-border bg-white dark:bg-card shadow-2xl p-2 flex flex-wrap gap-1.5 min-w-[130px] max-w-[200px]"
                onClick={e => e.stopPropagation()}
              >
                {variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => { setSelVar(v); setOpen(false); }}
                    disabled={v.stock === 0}
                    className={`rounded-[5px] border px-2.5 py-1 text-[10px] font-semibold transition-all active:scale-95 leading-none ${
                      selVar?.id === v.id ? "border-foreground bg-foreground text-background" : "border-border/50 text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                    } ${v.stock === 0 ? "opacity-35 line-through" : ""}`}
                  >{parseLabel(v.value)}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DealsPage() {
  const [deals, setDeals] = useState<DealProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/deals-of-the-day")
      .then(r => r.json())
      .then(data => { setDeals(data.deals || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter(d =>
      d.storeName.toLowerCase().includes(q) ||
      (d.sellerId || "").toLowerCase().includes(q)
    );
  }, [deals, query]);

  return (
    <>
      <Navbar />
      <main
        className="min-h-screen"
        style={{ background: "linear-gradient(135deg, #12000a 0%, #28001a 40%, #180010 100%)" }}
      >
        {/* Glow orbs — same as home page component */}
        <div className="fixed top-0 right-0 h-[400px] w-[400px] rounded-full pointer-events-none"
          style={{ background: "#be185d", filter: "blur(120px)", opacity: 0.18, transform: "translate(30%,-30%)" }} />
        <div className="fixed bottom-0 left-0 h-[300px] w-[300px] rounded-full pointer-events-none"
          style={{ background: "#9d174d", filter: "blur(100px)", opacity: 0.12, transform: "translate(-30%,30%)" }} />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {/* Back link */}
          <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4" /> Home
          </Link>

          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Deals of the Day</h1>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{ background: "rgba(190,24,93,0.2)", color: "#f9a8d4", border: "1px solid rgba(190,24,93,0.3)" }}
            >
              Limited time
            </span>
          </div>

          {/* Search bar */}
          {!loading && deals.length > 0 && (
            <div className="mb-6">
              <div className="relative max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-400/70" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by store name or ID"
                  className="w-full rounded-2xl border border-pink-400/40 bg-white pl-11 pr-10 py-3 text-[14px] text-pink-700 font-semibold placeholder-pink-300 focus:outline-none focus:border-pink-500/70 focus:ring-2 focus:ring-pink-300/30 transition-all"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400/60 hover:text-pink-300">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {query && (
                <p className="mt-1.5 text-[12px] text-white/40">
                  {filtered.length} deal{filtered.length !== 1 ? "s" : ""} found
                </p>
              )}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl h-64"
                  style={{ background: "rgba(255,255,255,0.05)" }} />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && deals.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
              <Tag className="h-12 w-12 text-white/20" />
              <p className="text-white/50 text-sm">No deals available right now. Check back soon!</p>
            </div>
          )}

          {/* No search results */}
          {!loading && deals.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
              <Store className="h-10 w-10 text-white/20" />
              <p className="text-white/50 text-sm">No stores found for &quot;{query}&quot;</p>
              <button onClick={() => setQuery("")} className="rounded-xl border border-pink-500/25 px-4 py-1.5 text-[12px] text-pink-300 hover:bg-pink-500/10 transition-colors">
                Show all {deals.length} deals
              </button>
            </div>
          )}

          {/* Deal cards grid */}
          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map(deal => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
