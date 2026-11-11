"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice } from "@/lib/utils";
import { Gift, Calendar, Share2, ShoppingBag, Check, ExternalLink } from "lucide-react";
import Link from "next/link";

const OCCASION_EMOJI: Record<string, string> = {
  WEDDING: "💍", BIRTHDAY: "🎂", BABY_SHOWER: "👶", ANNIVERSARY: "🥂",
  GRADUATION: "🎓", HOUSEWARMING: "🏡", OTHER: "🎁",
};

interface Item {
  id: string; name: string; image: string | null; price: number;
  productSlug: string; quantity: number; purchased: number;
  priority: string; note: string | null; createdAt: string;
}

interface Props {
  registry: {
    id: string; title: string; occasion: string; slug: string;
    eventDate: string | null; description: string | null;
    items: Item[]; user: { name: string | null };
    createdAt: string; updatedAt: string;
  };
}

export function PublicRegistryClient({ registry }: Props) {
  const [items, setItems] = useState<Item[]>(registry.items);
  const [buying, setBuying] = useState<string | null>(null);
  const [bought, setBought] = useState<Set<string>>(new Set());

  const markAsBuying = async (item: Item) => {
    if (bought.has(item.id) || item.purchased >= item.quantity) return;
    if (!confirm(`Confirm: I will buy "${item.name}" as a gift!`)) return;
    setBuying(item.id);
    try {
      const res = await fetch(`/api/registry/${registry.slug}/items/${item.id}`, { method: "PATCH" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const { item: updated } = await res.json();
      setItems(prev => prev.map(i => i.id === updated.id ? { ...i, purchased: updated.purchased } : i));
      setBought(prev => new Set([...prev, item.id]));
      toast.success("Marked as purchasing! 🎉 Don't forget to actually buy it.");
    } catch (e) { toast.error((e as Error).message || "Failed"); }
    finally { setBuying(null); }
  };

  const fulfilled = items.filter(i => i.purchased >= i.quantity).length;
  const emoji = OCCASION_EMOJI[registry.occasion] || "🎁";

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 pb-24">
        {/* Registry header */}
        <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border border-pink-200/60 dark:border-pink-800/30 p-6 mb-6 text-center">
          <div className="text-5xl mb-3">{emoji}</div>
          <h1 className="text-[22px] font-black text-foreground leading-tight mb-1">{registry.title}</h1>
          {registry.user.name && (
            <p className="text-[13px] text-muted-foreground mb-2">Created by <strong>{registry.user.name}</strong></p>
          )}
          {registry.eventDate && (
            <p className="text-[13px] text-muted-foreground flex items-center justify-center gap-1 mb-2">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(registry.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
          {registry.description && (
            <p className="text-[14px] text-muted-foreground italic px-4">{registry.description}</p>
          )}

          {/* Progress bar */}
          <div className="mt-4 max-w-xs mx-auto">
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>{fulfilled} of {items.length} items fulfilled</span>
              <span>{items.length > 0 ? Math.round((fulfilled / items.length) * 100) : 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-pink-200/60 dark:bg-pink-800/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-700"
                style={{ width: `${items.length > 0 ? (fulfilled / items.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Share */}
          <button
            onClick={() => {
              if (navigator.share) navigator.share({ title: registry.title, url: window.location.href });
              else { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }
            }}
            className="mt-4 flex items-center gap-1.5 rounded-xl border border-pink-200 dark:border-pink-800/40 bg-white dark:bg-pink-950/20 px-4 py-2 text-[13px] font-semibold text-pink-600 dark:text-pink-400 mx-auto hover:bg-pink-50 dark:hover:bg-pink-950/30 transition-colors"
          >
            <Share2 className="h-4 w-4" /> Share this registry
          </button>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 mb-5 flex items-start gap-2">
          <Gift className="h-4 w-4 text-pink-500 shrink-0 mt-0.5" />
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Tap <strong>&quot;I&apos;m buying this&quot;</strong> on any item to mark it so others don&apos;t duplicate your gift. Then click &quot;View Product&quot; to buy it from the store.
          </p>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🎁</div>
            <p className="font-semibold">No items added yet</p>
            <p className="text-sm text-muted-foreground mt-1">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const isFulfilled = item.purchased >= item.quantity;
              const iMarked = bought.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border overflow-hidden transition-all ${isFulfilled ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/10 opacity-70" : "border-border/60 bg-card hover:border-border"}`}
                >
                  <div className="flex items-start gap-3 p-4">
                    {/* Image */}
                    <div className="relative shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-20 w-20 rounded-xl object-contain bg-muted border border-border/40" />
                      ) : (
                        <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center text-3xl border border-border/40">🎁</div>
                      )}
                      {isFulfilled && (
                        <div className="absolute inset-0 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <Check className="h-8 w-8 text-emerald-600" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-[15px] text-foreground leading-snug line-clamp-2">{item.name}</p>
                          <p className="text-[18px] font-black text-foreground mt-0.5">{formatPrice(item.price)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${item.priority === "HIGH" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : item.priority === "LOW" ? "bg-muted text-muted-foreground" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                          {item.priority === "HIGH" ? "🔴 High" : item.priority === "LOW" ? "🟢 Low" : "🔵 Medium"} priority
                        </span>
                      </div>

                      {/* Purchase status */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {isFulfilled ? (
                          <span className="flex items-center gap-1 text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3.5 w-3.5" /> Fully purchased!
                          </span>
                        ) : (
                          <span className="text-[12px] text-muted-foreground">
                            {item.purchased > 0 ? `${item.purchased} of ${item.quantity} purchased` : `Needs ${item.quantity}`}
                          </span>
                        )}
                      </div>
                      {item.note && <p className="text-[12px] text-muted-foreground italic mt-1">{item.note}</p>}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 px-4 pb-4">
                    {!isFulfilled && (
                      <button
                        onClick={() => markAsBuying(item)}
                        disabled={buying === item.id || iMarked}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${iMarked ? "bg-emerald-500 text-white" : "bg-foreground text-background hover:opacity-90"}`}
                      >
                        {buying === item.id ? "Marking…" : iMarked ? <><Check className="h-4 w-4" /> I&apos;m buying this!</> : <><ShoppingBag className="h-4 w-4" /> I&apos;m buying this</>}
                      </button>
                    )}
                    {item.productSlug && (
                      <Link
                        href={`/product/${item.productSlug}`}
                        className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-[13px] font-semibold hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" /> View Product
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
