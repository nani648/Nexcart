"use client";

/**
 * Seller → Edit design → "Product Card Border".
 *
 * Per-product setting: every product gets its own border colour (or none),
 * so a seller can mix and match rather than one colour for the whole
 * storefront — with a bulk "apply to all products" shortcut for when they
 * genuinely do want one colour everywhere. Fetches the seller's products
 * the same way DesignManagerClient does, and saves through
 * /api/sellers/products/border (single product or applyToAll).
 */
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Frame } from "lucide-react";
import { auth } from "@/lib/firebase";
import { ColorPickerSection } from "@/components/seller/ColorPickerSection";
import { ProductCard } from "@/components/product/ProductCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseStoreColor, toCssBackground } from "@/lib/store-color";

interface BorderProduct {
  id: string;
  productId: string;
  name: string;
  images: string[];
  price: number;
  comparePrice: number | null;
  stock: number;
  cardDesign: string | null;
  cardFont: string | null;
  cardBorderColor: string | null;
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

export function CardBorderSection() {
  const [products, setProducts] = useState<BorderProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState("");
  const [storeName, setStoreName] = useState("Your Store");
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const [draftColor, setDraftColor] = useState("");
  const [saving, setSaving] = useState(false);
  // "Apply to all products" — a fast bulk path so picking one colour for
  // the whole catalogue doesn't mean opening every product one by one.
  const [bulkColor, setBulkColor] = useState("");
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
      ? data.products.map((p: BorderProduct) => ({
          id: p.id,
          productId: p.productId,
          name: p.name,
          images: p.images ?? [],
          price: p.price,
          comparePrice: p.comparePrice ?? null,
          stock: p.stock,
          cardDesign: p.cardDesign ?? null,
          cardFont: p.cardFont ?? null,
          cardBorderColor: p.cardBorderColor ?? null,
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

  const openEditor = (product: BorderProduct) => {
    setOpenProductId(product.id);
    setDraftColor(product.cardBorderColor || "");
  };

  const save = async (productId: string, color: string) => {
    setSaving(true);
    try {
      const uid = getUid();
      const res = await fetch("/api/sellers/products/border", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(uid ? { Authorization: `Bearer ${uid}` } : {}) },
        body: JSON.stringify({ productId, color: color || "" }),
      });
      if (!res.ok) throw new Error("Failed");
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, cardBorderColor: color || null } : p)));
      setDraftColor(color);
      toast.success(color ? "Border saved!" : "Border removed.");
    } catch {
      toast.error("Could not save border colour");
    } finally {
      setSaving(false);
    }
  };

  // Applies one colour (or clears it) to every product in a single request,
  // instead of opening each product's dialog one at a time.
  const applyBulk = async (color: string) => {
    setBulkSaving(true);
    try {
      const uid = getUid();
      const res = await fetch("/api/sellers/products/border", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(uid ? { Authorization: `Bearer ${uid}` } : {}) },
        body: JSON.stringify({ color: color || "", applyToAll: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed");
      setProducts((prev) => prev.map((p) => ({ ...p, cardBorderColor: color || null })));
      setBulkColor(color);
      toast.success(
        color
          ? `Border applied to ${data?.updated ?? products.length} products!`
          : `Border removed from ${data?.updated ?? products.length} products.`
      );
    } catch {
      toast.error("Could not apply border colour to all products");
    } finally {
      setBulkSaving(false);
    }
  };

  const editingProduct = products.find((p) => p.id === openProductId) || null;

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
          <Frame className="h-4 w-4" /> Product Card Border
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          A thin coloured mat around a product&apos;s card. Give each product its own colour, or leave it off — off by default.
        </p>
      </div>

      {/* Apply to all products — a fast bulk path for "I want every
          product to have the same border colour" instead of opening each
          product one at a time. */}
      {products.length > 0 && (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 space-y-3">
          <div>
            <p className="text-[13px] font-medium">Apply to all products</p>
            <p className="text-[11px] text-muted-foreground">
              Pick one colour once and it&apos;s set on every product&apos;s border immediately — faster than editing them one by one.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => bulkColor && applyBulk("")}
              disabled={bulkSaving}
              className={`flex-1 rounded-lg border px-3 py-2 text-left text-[12px] font-medium transition-colors ${!bulkColor ? "border-foreground/60 bg-muted" : "border-border hover:border-foreground/30"}`}
            >
              No border for all
            </button>
            <button
              type="button"
              onClick={() => !bulkColor && setBulkColor("#16a34a")}
              disabled={bulkSaving}
              className={`flex-1 rounded-lg border px-3 py-2 text-left text-[12px] font-medium transition-colors ${bulkColor ? "border-foreground/60 bg-muted" : "border-border hover:border-foreground/30"}`}
            >
              Add a border to all
            </button>
          </div>

          {bulkColor && (
            <ColorPickerSection
              value={bulkColor}
              onApply={applyBulk}
              saving={bulkSaving}
              searchPlaceholder={`Search colours — a name like "Rose Gold" or a hex like #870000…`}
              renderPreview={(bg, textColor) => (
                <div
                  className="flex h-12 items-center justify-center rounded-lg border border-border/50 text-[12px] font-semibold"
                  style={{ background: bg, color: textColor }}
                >
                  This colour will apply to every product
                </div>
              )}
            />
          )}
        </div>
      )}

      {products.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted-foreground">
          Add a product and you can give its card a border here.
        </p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const parsed = p.cardBorderColor ? parseStoreColor(p.cardBorderColor) : null;
            const swatchBg = parsed ? toCssBackground(parsed) : null;
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 p-3"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {p.images?.[0] && (
                    <Image src={p.images[0]} alt={p.name} fill sizes="48px" className="object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{p.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {swatchBg ? (
                      <>
                        <span
                          className="inline-block h-3 w-3 rounded-full border border-black/10"
                          style={{ background: swatchBg }}
                        />
                        Border set
                      </>
                    ) : (
                      "No border"
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openEditor(p)}
                  className="h-9 shrink-0 rounded-md border border-input px-3 text-[13px] font-medium hover:bg-muted"
                >
                  {swatchBg ? "Change" : "Add border"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-product border editor */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setOpenProductId(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-x-hidden overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{editingProduct?.name}</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              {/* Real ProductCard, fed this product's actual data, so the
                  preview matches exactly what shoppers will see. */}
              <div className="mx-auto w-[220px]">
                <ProductCard
                  id="preview"
                  productId={editingProduct.productId}
                  name={editingProduct.name}
                  price={editingProduct.price}
                  comparePrice={editingProduct.comparePrice ?? undefined}
                  image={editingProduct.images[0] ?? ""}
                  rating={0}
                  reviewCount={0}
                  sellerId={sellerId}
                  sellerName={storeName}
                  stock={editingProduct.stock}
                  cardDesign={editingProduct.cardDesign}
                  cardFont={editingProduct.cardFont}
                  cardBorderColor={draftColor}
                />
              </div>

              {/* No border vs custom toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => draftColor && save(editingProduct.id, "")}
                  disabled={saving}
                  className={`flex-1 rounded-lg border px-3 py-2 text-left text-[12px] font-medium transition-colors ${!draftColor ? "border-foreground/60 bg-muted" : "border-border hover:border-foreground/30"}`}
                >
                  No border
                </button>
                <button
                  type="button"
                  onClick={() => !draftColor && save(editingProduct.id, "#16a34a")}
                  disabled={saving}
                  className={`flex-1 rounded-lg border px-3 py-2 text-left text-[12px] font-medium transition-colors ${draftColor ? "border-foreground/60 bg-muted" : "border-border hover:border-foreground/30"}`}
                >
                  Add a border
                </button>
              </div>

              {draftColor && (
                <ColorPickerSection
                  value={draftColor}
                  onApply={(color) => save(editingProduct.id, color)}
                  saving={saving}
                  searchPlaceholder={`Search colours — a name like "Rose Gold" or a hex like #870000…`}
                  renderPreview={() => null}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
