"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import {
  Home, Layers, Plus, Trash2, X, Loader2,
  Search, CheckSquare, Square, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Type, Check, Shapes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_FONT_LIST } from "@/lib/card-designs";
import { COLLECTION_HEADING_STYLES } from "@/lib/collection-heading-styles";
import { COLLECTION_SHAPES, resolveCollectionShape } from "@/lib/collection-shapes";

interface StoreCollection {
  id: string;
  name: string;
  image: string | null;
  filterTag: string;
  productIds: string;
  sortOrder: number;
  fontStyle: string | null;
  iconShape: string | null;
}

interface SellerProduct {
  id: string;
  productId: string;
  name: string;
  images: string[];
  price: number;
}

// ─── Drag & Drop Circle Upload ─────────────────────────────────────────────

function CircleUpload({
  value,
  onChange,
  shapeClass = "rounded-full",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Tailwind class for the icon-frame shape (see lib/collection-shapes.ts).
   * Defaults to the classic circle so the "Add collection" form (which has
   * no shape chosen yet) renders exactly as it always has. */
  shapeClass?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Only images allowed"); return; }
    setUploading(true);
    try {
      const uid = getUid();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "nexcart/collections");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: uid ? { Authorization: `Bearer ${uid}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!data.url) throw new Error("Upload failed");
      onChange(data.url);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // A dashed empty-state "drop or click" placeholder doesn't need to preview
  // the exact chosen shape — nothing's cropped yet, and a plain CSS border
  // (border-dashed here) doesn't draw a clean outline around a clip-path
  // shape like hexagon/star (see collection-shapes.ts). The real shape
  // becomes visible the moment a photo is added.
  const effectiveShapeClass = value ? shapeClass : "rounded-full";

  return (
    <div className="relative h-20 w-20 shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "h-20 w-20 border-2 border-dashed flex items-center justify-center overflow-hidden transition-all",
          effectiveShapeClass,
          dragging
            ? "border-primary bg-primary/10 scale-105"
            : value
            ? "border-transparent"
            : "border-border hover:border-primary/60 bg-muted/40"
        )}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : value ? (
          <Image src={value} alt="" width={80} height={80} className={cn("h-full w-full object-cover", shapeClass)} />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">🖼️</span>
            <span className="text-[9px] text-muted-foreground text-center leading-tight">Drop or click</span>
          </div>
        )}
      </button>
      {value && !uploading && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

// ─── Product Picker ────────────────────────────────────────────────────────

function ProductPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [open, setOpen] = useState(false);

  const SORT_OPTIONS = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "az", label: "A → Z" },
    { value: "za", label: "Z → A" },
    { value: "price_asc", label: "Price ↑" },
    { value: "price_desc", label: "Price ↓" },
    { value: "selected", label: "Selected first" },
  ];

  useEffect(() => {
    if (!open || products.length > 0) return;
    setLoading(true);
    const uid = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
    fetch("/api/sellers/products", {
      headers: uid ? { Authorization: `Bearer ${uid}` } : {},
    })
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoading(false));
  }, [open]);

  const searched = search.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  const filtered = [...searched].sort((a, b) => {
    if (sort === "selected") {
      const aS = selected.includes(a.productId) ? 0 : 1;
      const bS = selected.includes(b.productId) ? 0 : 1;
      return aS - bS;
    }
    if (sort === "az") return a.name.localeCompare(b.name);
    if (sort === "za") return b.name.localeCompare(a.name);
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "oldest") return 0;
    return 0; // newest — already ordered by API (desc)
  });

  const toggle = (productId: string) => {
    onChange(selected.includes(productId) ? selected.filter((x) => x !== productId) : [...selected, productId]);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-left hover:bg-muted/40 transition-colors"
      >
        <span className="font-medium text-foreground">
          {selected.length === 0
            ? "Select products for this collection"
            : `${selected.length} product${selected.length !== 1 ? "s" : ""} selected`}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
          <div className="p-2 space-y-2 border-b border-border/50">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/40 rounded-lg outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            {/* Sort pills */}
            <div className="flex gap-1.5 flex-wrap">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSort(opt.value)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                    sort === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[26rem] overflow-y-auto divide-y divide-border/30">
            {loading ? (
              <div className="p-6 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-center text-muted-foreground">No products found</p>
            ) : (
              filtered.map((p) => {
                const checked = selected.includes(p.productId);
                return (
                  <button
                    key={p.productId}
                    type="button"
                    onClick={() => toggle(p.productId)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                      checked && "bg-primary/5"
                    )}
                  >
                    {checked
                      ? <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                      : <Square className="h-4 w-4 text-muted-foreground shrink-0" />}
                    {p.images?.[0] && (
                      <Image
                        src={p.images[0]}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <span className="text-sm flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">₹{p.price}</span>
                  </button>
                );
              })
            )}
          </div>

          {selected.length > 0 && (
            <div className="p-2 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{selected.length} selected</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-destructive hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

function getUid() {
  return auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<StoreCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newImage, setNewImage] = useState<string | null>(null);
  const [newProductIds, setNewProductIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [applyingShapeToAll, setApplyingShapeToAll] = useState(false);

  useEffect(() => {
    const uid = getUid();
    if (!uid) { setLoading(false); return; }
    fetch("/api/sellers/collections", { headers: { Authorization: `Bearer ${uid}` } })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setCollections(data.collections ?? []); })
      .catch(() => toast.error("Failed to load collections"))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = useCallback(() => {
    setNewName(""); setNewTag(""); setNewImage(null); setNewProductIds([]);
  }, []);

  const handleAdd = async () => {
    if (!newName.trim() || !newTag.trim()) {
      toast.error("Name and filter tag are required");
      return;
    }
    setAdding(true);
    try {
      const uid = getUid();
      const res = await fetch("/api/sellers/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(uid ? { Authorization: `Bearer ${uid}` } : {}),
        },
        body: JSON.stringify({
          name: newName.trim(),
          filterTag: newTag.trim(),
          image: newImage,
          productIds: newProductIds,
          sortOrder: collections.length,
        }),
      });
      if (!res.ok) {
        // The server can fail before it ever writes a JSON body (a raw 500,
        // a proxy error page, etc.) — parsing that as JSON throws its own
        // confusing "Unexpected end of JSON input" error that hides the
        // real problem. Fall back to the HTTP status so the toast always
        // says something useful.
        let message = `Server error (${res.status})`;
        try {
          const errBody = await res.json();
          if (errBody?.error) message = typeof errBody.error === "string" ? errBody.error : JSON.stringify(errBody.error);
        } catch { /* body wasn't JSON — keep the status-based message above */ }
        throw new Error(message);
      }
      const data = await res.json();
      setCollections((c) => [...c, data.collection]);
      resetForm();
      setShowForm(false);
      toast.success("Collection added!");
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(id);
    try {
      const uid = getUid();
      await fetch(`/api/sellers/collections/${id}`, {
        method: "DELETE",
        headers: uid ? { Authorization: `Bearer ${uid}` } : {},
      });
      setCollections((c) => c.filter((x) => x.id !== id));
      toast.success("Collection deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setSaving(null);
    }
  };

  const handleImageUpdate = async (id: string, image: string | null) => {
    setSaving(id);
    try {
      const uid = getUid();
      await fetch(`/api/sellers/collections/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(uid ? { Authorization: `Bearer ${uid}` } : {}),
        },
        body: JSON.stringify({ image }),
      });
      setCollections((c) => c.map((x) => (x.id === id ? { ...x, image } : x)));
    } catch {
      toast.error("Failed to update image");
    } finally {
      setSaving(null);
    }
  };

  const handleFontUpdate = async (id: string, fontStyle: string | null) => {
    setSaving(id);
    try {
      const uid = getUid();
      const res = await fetch(`/api/sellers/collections/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(uid ? { Authorization: `Bearer ${uid}` } : {}),
        },
        body: JSON.stringify({ fontStyle }),
      });
      if (!res.ok) {
        // A 400 here almost always means the database's "fontStyle" column
        // hasn't been added yet (see the migration in prisma/migrations) —
        // surface that plainly instead of a bare "Failed", since it's a
        // one-time setup step, not a bug the seller can do anything about
        // from this screen.
        let message = "Could not save the font — the store isn't set up for custom fonts yet. Ask support to run the pending database update.";
        try {
          const errBody = await res.json();
          if (errBody?.error && typeof errBody.error === "string" && errBody.error !== "Nothing to update") {
            message = errBody.error;
          }
        } catch { /* keep the message above */ }
        throw new Error(message);
      }
      setCollections((c) => c.map((x) => (x.id === id ? { ...x, fontStyle } : x)));
      toast.success("Font updated");
    } catch (e) {
      toast.error((e as Error).message || "Failed to update font");
    } finally {
      setSaving(null);
    }
  };

  const handleShapeUpdate = async (id: string, iconShape: string | null) => {
    setSaving(id);
    try {
      const uid = getUid();
      const res = await fetch(`/api/sellers/collections/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(uid ? { Authorization: `Bearer ${uid}` } : {}),
        },
        body: JSON.stringify({ iconShape }),
      });
      if (!res.ok) {
        // Same "column may not be migrated yet" messaging as handleFontUpdate.
        let message = "Could not save the shape — the store isn't set up for custom icon shapes yet. Ask support to run the pending database update.";
        try {
          const errBody = await res.json();
          if (errBody?.error && typeof errBody.error === "string" && errBody.error !== "Nothing to update") {
            message = errBody.error;
          }
        } catch { /* keep the message above */ }
        throw new Error(message);
      }
      setCollections((c) => c.map((x) => (x.id === id ? { ...x, iconShape } : x)));
      toast.success("Shape updated");
    } catch (e) {
      toast.error((e as Error).message || "Failed to update shape");
    } finally {
      setSaving(null);
    }
  };

  // Applies one shape to every collection at once — same optimistic-update +
  // rollback-on-failure pattern as handleMove below, just for a different
  // field. Loops PATCH per row rather than adding a dedicated bulk endpoint:
  // sellers realistically have a handful of collections, not hundreds, so a
  // dedicated endpoint would be extra surface area for no real benefit.
  const handleShapeUpdateAll = async (iconShape: string | null) => {
    if (applyingShapeToAll || collections.length === 0) return;
    setApplyingShapeToAll(true);
    const previous = collections;
    setCollections((c) => c.map((x) => ({ ...x, iconShape })));
    try {
      const uid = getUid();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(uid ? { Authorization: `Bearer ${uid}` } : {}),
      };
      const results = await Promise.all(
        previous.map((c) =>
          fetch(`/api/sellers/collections/${c.id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ iconShape }),
          })
        )
      );
      if (results.some((r) => !r.ok)) throw new Error("Failed to update some collections");
      toast.success(`Applied to ${previous.length} collection${previous.length !== 1 ? "s" : ""}`);
    } catch {
      setCollections(previous);
      toast.error("Failed to apply shape to all — try again");
    } finally {
      setApplyingShapeToAll(false);
    }
  };

  // Moves a collection up/down one spot and re-numbers every collection's
  // sortOrder sequentially (0, 1, 2, …) to match the new array order. This
  // is what controls the priority shown both here and on the storefront
  // (circle row + the stacked collection sections) — lower sortOrder shows
  // first. Renumbering everything (not just swapping the two raw values)
  // keeps ordering unambiguous even if two collections ever ended up with
  // the same sortOrder from older data. Only rows whose sortOrder actually
  // changed are sent to the server, and the whole move is optimistic with a
  // rollback + toast if the save fails.
  const handleMove = async (id: string, direction: "up" | "down") => {
    if (reordering) return;
    const idx = collections.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= collections.length) return;

    const previous = collections;
    const reordered = [...collections];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const renumbered = reordered.map((c, i) => ({ ...c, sortOrder: i }));

    const prevOrderById = new Map(previous.map((c) => [c.id, c.sortOrder]));
    const changed = renumbered.filter((c) => prevOrderById.get(c.id) !== c.sortOrder);

    setCollections(renumbered);
    setReordering(true);
    try {
      const uid = getUid();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(uid ? { Authorization: `Bearer ${uid}` } : {}),
      };
      const results = await Promise.all(
        changed.map((c) =>
          fetch(`/api/sellers/collections/${c.id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ sortOrder: c.sortOrder }),
          })
        )
      );
      if (results.some((r) => !r.ok)) throw new Error("Failed to save order");
    } catch {
      setCollections(previous);
      toast.error("Failed to reorder — try again");
    } finally {
      setReordering(false);
    }
  };

  const handleProductIdsUpdate = async (id: string, productIds: string[]) => {
    try {
      const uid = getUid();
      await fetch(`/api/sellers/collections/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(uid ? { Authorization: `Bearer ${uid}` } : {}),
        },
        body: JSON.stringify({ productIds }),
      });
      setCollections((c) =>
        c.map((x) => (x.id === id ? { ...x, productIds: JSON.stringify(productIds) } : x))
      );
      toast.success("Products updated");
    } catch {
      toast.error("Failed to update products");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <span className="text-muted-foreground/50 text-[12px]">/</span>
            <span className="text-[12px] text-foreground font-medium">Collections</span>
          </div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" />
            Store Collections
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Create sub-categories with circular icons. Customers can tap them to filter your products.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          Add Collection
        </Button>
      </div>

      {/* Info banner */}
      <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800/40 dark:bg-indigo-900/15 px-4 py-3 flex items-start gap-3">
        <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-indigo-800 dark:text-indigo-300">How Collections Work</p>
          <p className="text-[12px] text-indigo-700 dark:text-indigo-400 mt-0.5 leading-relaxed">
            Each collection has a <strong>name</strong>, an <strong>image</strong>, and selected <strong>products</strong>.
            When customers tap the icon on your store page, only those products are shown.
            Use the <strong>Shape</strong> button on any collection to swap the classic circle for a themed frame — like an arch or a star — or apply one shape to every collection at once.
            You can also use a <strong>filter tag</strong> as a fallback.
          </p>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-border/60 bg-card p-5 space-y-4 max-w-2xl">
          <h2 className="font-semibold text-[15px]">New Collection</h2>
          <div className="flex items-start gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground mb-1.5">Circle image</p>
              <CircleUpload value={newImage} onChange={setNewImage} />
              <p className="text-[10px] text-muted-foreground mt-1 text-center">Drag or click</p>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-[12px] font-medium block mb-1">Collection name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Pickles, Best Sellers"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium block mb-1">Filter tag <span className="text-muted-foreground font-normal">(fallback)</span></label>
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="e.g. pickle (must match product tags)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Lowercase, no spaces preferred</p>
              </div>
            </div>
          </div>

          {/* Product picker */}
          <div>
            <label className="text-[12px] font-medium block mb-1.5">Select products</label>
            <ProductPicker selected={newProductIds} onChange={setNewProductIds} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={adding || !newName.trim() || !newTag.trim()}>
              {adding ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Adding…</> : "Add Collection"}
            </Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Collections list */}
      {loading ? (
        <div className="rounded-xl border border-border/50 p-10 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : collections.length === 0 ? (
        <div className="rounded-xl border border-border/50 border-dashed p-10 flex flex-col items-center justify-center gap-3 text-center">
          <Layers className="h-8 w-8 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-muted-foreground">No collections yet</p>
            <p className="text-sm text-muted-foreground/60">Add your first collection to let customers browse by sub-category</p>
          </div>
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Collection
          </Button>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {collections.map((col, idx) => {
            let parsedIds: string[] = [];
            try { parsedIds = JSON.parse(col.productIds || "[]"); } catch { parsedIds = []; }

            return (
              <CollectionRow
                key={col.id}
                col={col}
                parsedIds={parsedIds}
                saving={saving === col.id}
                priority={idx + 1}
                isFirst={idx === 0}
                isLast={idx === collections.length - 1}
                moveDisabled={reordering}
                onImageChange={(url) => handleImageUpdate(col.id, url)}
                onProductIdsChange={(ids) => handleProductIdsUpdate(col.id, ids)}
                onFontChange={(font) => handleFontUpdate(col.id, font)}
                onShapeChange={(shape) => handleShapeUpdate(col.id, shape)}
                onApplyShapeToAll={(shape) => handleShapeUpdateAll(shape)}
                applyingShapeToAll={applyingShapeToAll}
                collectionCount={collections.length}
                onDelete={() => handleDelete(col.id)}
                onMoveUp={() => handleMove(col.id, "up")}
                onMoveDown={() => handleMove(col.id, "down")}
              />
            );
          })}
          <p className="text-[12px] text-muted-foreground text-center pt-2">
            {collections.length} collection{collections.length !== 1 ? "s" : ""} · Use the ↑↓ arrows to set which shows first on your store
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Collection row with expandable product picker ─────────────────────────

function CollectionRow({
  col, parsedIds, saving, priority, isFirst, isLast, moveDisabled,
  onImageChange, onProductIdsChange, onFontChange, onShapeChange, onApplyShapeToAll,
  applyingShapeToAll, collectionCount, onDelete, onMoveUp, onMoveDown,
}: {
  col: StoreCollection;
  parsedIds: string[];
  saving: boolean;
  priority: number;
  isFirst: boolean;
  isLast: boolean;
  moveDisabled: boolean;
  onImageChange: (url: string | null) => void;
  onProductIdsChange: (ids: string[]) => void;
  onFontChange: (fontStyle: string | null) => void;
  onShapeChange: (iconShape: string | null) => void;
  onApplyShapeToAll: (iconShape: string | null) => void;
  applyingShapeToAll: boolean;
  collectionCount: number;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [shapeOpen, setShapeOpen] = useState(false);
  const [localIds, setLocalIds] = useState<string[]>(parsedIds);
  const [dirty, setDirty] = useState(false);
  const shape = resolveCollectionShape(col.iconShape);

  const handleChange = (ids: string[]) => {
    setLocalIds(ids);
    setDirty(true);
  };

  const handleSave = () => {
    onProductIdsChange(localIds);
    setDirty(false);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst || moveDisabled}
            title="Move up (shows earlier)"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] font-semibold text-muted-foreground/70 tabular-nums" title="Priority — lower shows first">
            #{priority}
          </span>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast || moveDisabled}
            title="Move down (shows later)"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <CircleUpload value={col.image} onChange={onImageChange} shapeClass={shape.shapeClass} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[15px] truncate">{col.name}</p>
          <p className="text-[12px] text-muted-foreground">
            Filter tag: <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">{col.filterTag}</span>
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {localIds.length === 0
              ? "No products selected — using filter tag"
              : `${localIds.length} product${localIds.length !== 1 ? "s" : ""} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex h-8 px-3 items-center gap-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Products
          </button>
          <button
            onClick={() => setFontOpen((v) => !v)}
            className="flex h-8 px-3 items-center gap-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Type className="h-3.5 w-3.5" />
            Font
          </button>
          <button
            onClick={() => setShapeOpen((v) => !v)}
            className="flex h-8 px-3 items-center gap-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Shapes className="h-3.5 w-3.5" />
            Shape
          </button>
          <button
            onClick={onDelete}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/40 p-4 space-y-3 bg-muted/20">
          <p className="text-[12px] text-muted-foreground">
            Select which products appear when customers tap this collection.
          </p>
          <ProductPicker selected={localIds} onChange={handleChange} />
          {dirty && (
            <Button size="sm" onClick={handleSave}>
              Save product selection
            </Button>
          )}
        </div>
      )}

      {fontOpen && (
        <div className="border-t border-border/40 p-4 space-y-3 bg-muted/20">
          <p className="text-[12px] text-muted-foreground">
            Pick a font for this collection&apos;s heading on your store. Applies to the &quot;{col.name}&quot; section title shown above its products.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onFontChange(null)}
              disabled={saving}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50",
                !col.fontStyle ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"
              )}
            >
              <span className="text-sm font-medium">Default</span>
              {!col.fontStyle && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>
            {CARD_FONT_LIST.map((font) => {
              const isSelected = col.fontStyle === font.key;
              return (
                <button
                  key={font.key}
                  type="button"
                  onClick={() => onFontChange(font.key)}
                  disabled={saving}
                  title={font.description}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50",
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <span className="min-w-0">
                    <span className={cn("block text-sm truncate", font.titleClass)}>{col.name || font.label}</span>
                    <span className="block text-[10px] text-muted-foreground truncate">{font.label}</span>
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          <p className="text-[12px] text-muted-foreground pt-2">
            Or go bolder with a decorative style — transforms the heading text itself and frames it with a symbol, e.g. &quot;✦ SHIRTS ✦&quot;.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COLLECTION_HEADING_STYLES.map((style) => {
              const isSelected = col.fontStyle === style.key;
              return (
                <button
                  key={style.key}
                  type="button"
                  onClick={() => onFontChange(style.key)}
                  disabled={saving}
                  title={style.description}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50",
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{style.apply(col.name || style.label)}</span>
                    <span className="block text-[10px] text-muted-foreground truncate">{style.label}</span>
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {shapeOpen && (
        <div className="border-t border-border/40 p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[12px] text-muted-foreground">
              Pick an icon frame for this collection&apos;s circle on your store — currently <strong>{shape.label}</strong>.
            </p>
            <button
              type="button"
              onClick={() => onApplyShapeToAll(col.iconShape)}
              disabled={applyingShapeToAll || saving}
              title={`Apply "${shape.label}" to all ${collectionCount} collection${collectionCount !== 1 ? "s" : ""}`}
              className="flex items-center gap-1.5 text-[11px] font-semibold shrink-0 text-primary hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
            >
              {applyingShapeToAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shapes className="h-3 w-3" />}
              Apply to all {collectionCount} collection{collectionCount !== 1 ? "s" : ""}
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {COLLECTION_SHAPES.map((s) => {
              const isSelected = shape.key === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onShapeChange(s.key)}
                  disabled={saving}
                  title={s.description}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 transition-colors disabled:opacity-50",
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <div className={cn("relative h-10 w-10 overflow-hidden shrink-0", s.shapeClass)}>
                    {col.image ? (
                      <Image src={col.image} alt="" width={40} height={40} className="h-10 w-10 object-cover" />
                    ) : (
                      <div className="h-10 w-10 flex items-center justify-center bg-muted text-[13px] font-bold text-muted-foreground">
                        {col.name[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight truncate max-w-full">{s.label}</span>
                  {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
