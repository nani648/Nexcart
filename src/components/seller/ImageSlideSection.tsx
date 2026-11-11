"use client";

/**
 * Seller → Edit design → "Product Card Image Slide".
 *
 * Per-product setting: each product's card can auto-slide through all of
 * its photos on a timer (mirrors the storefront's Store Highlights
 * carousel, but noticeably slower — see the 5s interval in ProductCard.tsx
 * vs Highlights' 3.5s), or stay off (default — primary photo, swaps to the
 * 2nd photo on hover only). Ships with a bulk "apply to all products"
 * shortcut, same pattern as CardBorderSection right above it. Fetches the
 * seller's products the same way CardBorderSection does, and saves through
 * /api/sellers/products/image-slide (single product or applyToAll).
 */
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, GalleryHorizontal } from "lucide-react";
import { auth } from "@/lib/firebase";
import { ProductCard } from "@/components/product/ProductCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface SlideProduct {
  id: string;
  productId: string;
  name: string;
  images: string[];
  price: number;
  comparePrice: number | null;
  stock: number;
  cardDesign: string | null;
  cardFont: string | null;
  cardImageAutoSlide: boolean;
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

export function ImageSlideSection() {
  const [products, setProducts] = useState<SlideProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState("");
  const [storeName, setStoreName] = useState("Your Store");
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const load = useCallback(async () => {
    const uid = getUid();
    const res = await fetch("/api/sellers/products", {
      headers: uid ? { Authorization: `Bearer ${uid}` } : {},
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Could not load products");
    if (data?.sellerId) setSellerId(data.sellerId);
    return Array.isArray(data?.products)
      ? data.products.map((p: SlideProduct) => ({
          id: p.id,
          productId: p.productId,
          name: p.name,
          images: p.images ?? [],
          price: p.price,
          comparePrice: p.comparePrice ?? null,
          stock: p.stock,
          cardDesign: p.cardDesign ?? null,
          cardFont: p.cardFont ?? null,
          cardImageAutoSlide: !!p.cardImageAutoSlide,
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

    const uid = getUid();
    fetch("/api/sellers/profile", { headers: uid ? { Authorization: `Bearer ${uid}` } : {} })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.seller?.storeName) setStoreName(data.seller.storeName);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [load]);

  const save = async (productId: string, enabled: boolean) => {
    setSavingId(productId);
    try {
      const uid = getUid();
      const res = await fetch("/api/sellers/products/image-slide", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(uid ? { Authorization: `Bearer ${uid}` } : {}) },
        body: JSON.stringify({ productId, enabled }),
      });
      if (!res.ok) throw new Error("Failed");
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, cardImageAutoSlide: enabled } : p)));
      toast.success(enabled ? "Image slide turned on!" : "Image slide turned off.");
    } catch {
      toast.error("Could not update this product");
    } finally {
      setSavingId(null);
    }
  };

  // Applies the same on/off setting to every product in one request,
  // instead of toggling each product one at a time.
  const applyBulk = async (enabled: boolean) => {
    setBulkSaving(true);
    try {
      const uid = getUid();
      const res = await fetch("/api/sellers/products/image-slide", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(uid ? { Authorization: `Bearer ${uid}` } : {}) },
        body: JSON.stringify({ enabled, applyToAll: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed");
      setProducts((prev) => prev.map((p) => ({ ...p, cardImageAutoSlide: enabled })));
      toast.success(
        enabled
          ? `Image slide turned on for ${data?.updated ?? products.length} products!`
          : `Image slide turned off for ${data?.updated ?? products.length} products.`
      );
    } catch {
      toast.error("Could not apply this to all products");
    } finally {
      setBulkSaving(false);
    }
  };

  const editingProduct = products.find((p) => p.id === openProductId) || null;
  const allOn = products.length > 0 && products.every((p) => p.cardImageAutoSlide);
  const allOff = products.length > 0 && products.every((p) => !p.cardImageAutoSlide);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your products…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
      <div>
        <h2 className="text-sm font-medium flex items-center gap-2">
          <GalleryHorizontal className="h-4 w-4" /> Product Card Image Slide
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Auto-slide through a product&apos;s photos on its card, like the Highlights banner on your store page (just
          slower). Off by default — the card just swaps to the 2nd photo on hover instead.
        </p>
      </div>

      {/* Apply to all products — a fast bulk path for "turn this on/off for
          every product" instead of toggling each product one at a time. */}
      {products.length > 0 && (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 space-y-3">
          <div>
            <p className="text-[13px] font-medium">Apply to all products</p>
            <p className="text-[11px] text-muted-foreground">
              Turn this on (or off) for every product at once — faster than toggling them one by one. Only products
              with more than one photo actually slide.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => !allOff && applyBulk(false)}
              disabled={bulkSaving}
              className={`flex-1 rounded-lg border px-3 py-2 text-left text-[12px] font-medium transition-colors ${allOff ? "border-foreground/60 bg-muted" : "border-border hover:border-foreground/30"}`}
            >
              Off for all
            </button>
            <button
              type="button"
              onClick={() => !allOn && applyBulk(true)}
              disabled={bulkSaving}
              className={`flex-1 rounded-lg border px-3 py-2 text-left text-[12px] font-medium transition-colors ${allOn ? "border-foreground/60 bg-muted" : "border-border hover:border-foreground/30"}`}
            >
              Enable for all
            </button>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted-foreground">
          Add a product with more than one photo and you can turn on image slide here.
        </p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const canSlide = p.images.length > 1;
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 p-3"
              >
                <button
                  type="button"
                  onClick={() => setOpenProductId(p.id)}
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted"
                >
                  {p.images?.[0] && (
                    <Image src={p.images[0]} alt={p.name} fill sizes="48px" className="object-cover" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{p.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {canSlide
                      ? p.cardImageAutoSlide
                        ? "Sliding through " + p.images.length + " photos"
                        : "Off"
                      : "Needs 2+ photos to slide"}
                  </p>
                </div>

                <Switch
                  checked={p.cardImageAutoSlide}
                  disabled={!canSlide || savingId === p.id}
                  onCheckedChange={(checked) => save(p.id, checked)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Live preview dialog — shows the real ProductCard so a seller can see
          the effect before deciding, without leaving this page. */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setOpenProductId(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-x-hidden overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{editingProduct?.name}</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div className="mx-auto w-[220px]">
                <ProductCard
                  id="preview"
                  productId={editingProduct.productId}
                  name={editingProduct.name}
                  price={editingProduct.price}
                  comparePrice={editingProduct.comparePrice ?? undefined}
                  image={editingProduct.images[0] ?? ""}
                  images={editingProduct.images}
                  rating={0}
                  reviewCount={0}
                  sellerId={sellerId}
                  sellerName={storeName}
                  stock={editingProduct.stock}
                  cardDesign={editingProduct.cardDesign}
                  cardFont={editingProduct.cardFont}
                  cardImageAutoSlide={editingProduct.cardImageAutoSlide}
                />
              </div>

              {editingProduct.images.length <= 1 ? (
                <p className="text-center text-[12px] text-muted-foreground">
                  This product only has one photo, so there&apos;s nothing to slide between yet.
                </p>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <span className="text-[13px] font-medium">Auto-slide through photos</span>
                  <Switch
                    checked={editingProduct.cardImageAutoSlide}
                    disabled={savingId === editingProduct.id}
                    onCheckedChange={(checked) => save(editingProduct.id, checked)}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
