"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Shuffle, Check } from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  CARD_DESIGN_LIST,
  CARD_FONT_LIST,
  DEFAULT_CARD_DESIGN,
  DEFAULT_CARD_FONT,
  RANDOM_DESIGN_VALUE,
  type CardDesignKey,
  type CardFontKey,
} from "@/lib/card-designs";
import { cn } from "@/lib/utils";

interface DesignProduct {
  id: string;
  name: string;
  images: string[];
  cardDesign: string | null;
  cardFont: string | null;
}

function getUid() {
  return (
    auth.currentUser?.uid ??
    (() => {
      try {
        return localStorage.getItem("nxc-uid");
      } catch {
        return null;
      }
    })()
  );
}

export function DesignManagerClient() {
  const [products, setProducts] = useState<DesignProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkDesign, setBulkDesign] = useState<string>(DEFAULT_CARD_DESIGN);

  const load = useCallback(async () => {
    const uid = getUid();
    const res = await fetch("/api/sellers/products", {
      headers: uid ? { Authorization: `Bearer ${uid}` } : {},
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Could not load products");
    return Array.isArray(data?.products)
      ? data.products.map((p: DesignProduct) => ({
          id: p.id,
          name: p.name,
          images: p.images ?? [],
          cardDesign: p.cardDesign ?? null,
          cardFont: p.cardFont ?? null,
        }))
      : [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Could not load products");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function send(body: Record<string, unknown>) {
    const uid = getUid();
    const res = await fetch("/api/sellers/products/design", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(uid ? { Authorization: `Bearer ${uid}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Request failed");
    return data as { design?: CardDesignKey; font?: CardFontKey; updated?: number };
  }

  async function setFont(productId: string, font: string) {
    setBusy(productId);
    try {
      const data = await send({ productId, font });
      const applied = data.font ?? (font as CardFontKey);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, cardFont: applied } : p))
      );
      toast.success("Text style updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update text style");
    } finally {
      setBusy(null);
    }
  }

  async function setOne(productId: string, design: string) {
    setBusy(productId);
    try {
      const data = await send({ productId, design });
      const applied = data.design ?? (design as CardDesignKey);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, cardDesign: applied } : p))
      );
      toast.success("Design updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update design");
    } finally {
      setBusy(null);
    }
  }

  async function applyToAll() {
    setBusy("__all__");
    try {
      const data = await send({ design: bulkDesign, applyToAll: true });
      const applied = data.design ?? (bulkDesign as CardDesignKey);
      setProducts((prev) => prev.map((p) => ({ ...p, cardDesign: applied })));
      toast.success(`Applied to ${data.updated ?? products.length} products`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not apply design");
    } finally {
      setBusy(null);
    }
  }

  async function randomizeAll() {
    setBusy("__random__");
    try {
      const data = await send({ randomizeAll: true });
      toast.success(`Mixed ${data.updated ?? 0} products`);
      // Each product got its own key server-side, so refetch rather than guess.
      setProducts(await load());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not randomise");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your products…
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-10 text-center">
        <p className="text-sm font-medium">No products yet</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Add a product and you can choose how its card looks here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bulk actions */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <h2 className="text-sm font-medium">Apply to all products</h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Set one design for your whole store, or give every product a different one.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={bulkDesign}
            onChange={(e) => setBulkDesign(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-[13px]"
          >
            {CARD_DESIGN_LIST.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyToAll}
            disabled={busy !== null}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-[13px] font-medium hover:bg-muted disabled:opacity-50"
          >
            {busy === "__all__" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Apply to all
          </button>
          <button
            type="button"
            onClick={randomizeAll}
            disabled={busy !== null}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-[13px] font-medium hover:bg-muted disabled:opacity-50"
          >
            {busy === "__random__" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />}
            Keep random
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          &ldquo;Keep random&rdquo; gives each product a different design and saves it, so your
          storefront stays the same every time a shopper visits.
        </p>
      </div>

      {/* Per-product pickers */}
      <div className="space-y-2">
        {products.map((p) => {
          const current = p.cardDesign ?? DEFAULT_CARD_DESIGN;
          const currentFont = p.cardFont ?? DEFAULT_CARD_FONT;
          const plain = CARD_DESIGN_LIST.filter((d) => !d.decorative);
          const fancy = CARD_DESIGN_LIST.filter((d) => d.decorative);
          return (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card p-3"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                {p.images?.[0] && (
                  <Image src={p.images[0]} alt={p.name} fill sizes="48px" className="object-cover" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {CARD_DESIGN_LIST.find((d) => d.key === current)?.description ?? ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {busy === p.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}

                <select
                  aria-label={`Card design for ${p.name}`}
                  value={current}
                  disabled={busy !== null}
                  onChange={(e) => setOne(p.id, e.target.value)}
                  className={cn(
                    "h-9 rounded-md border border-input bg-background px-2 text-[13px]",
                    busy !== null && "opacity-50"
                  )}
                >
                  <optgroup label="Simple">
                    {plain.map((d) => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Decorative">
                    {fancy.map((d) => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </optgroup>
                  <option value={RANDOM_DESIGN_VALUE}>Surprise me</option>
                </select>

                <select
                  aria-label={`Text style for ${p.name}`}
                  value={currentFont}
                  disabled={busy !== null}
                  onChange={(e) => setFont(p.id, e.target.value)}
                  className={cn(
                    "h-9 rounded-md border border-input bg-background px-2 text-[13px]",
                    busy !== null && "opacity-50"
                  )}
                >
                  {CARD_FONT_LIST.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                  <option value={RANDOM_DESIGN_VALUE}>Surprise me</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
