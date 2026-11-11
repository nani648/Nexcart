"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuthContext } from "@/context/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { Plus, Pencil, Trash2, Package, Loader2, Search, AlertTriangle, X, Home, Copy, Upload, FileText, CheckCircle2, ArrowUpDown, ArrowDown, Globe, EyeOff } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Product {
  id: string;
  productId: string;
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
  images: string[];
  /** Focal point for the cover photo's crop, "X% Y%" — see ProductCard.tsx.
   * Null means center. Keeps this table's thumbnail matching the real
   * storefront card instead of always center-cropping. */
  cardImagePosition?: string | null;
  category?: { name: string } | null;
  createdAt: string;
}

type FilterTab = "all" | "active" | "out_of_stock" | "low_stock";
type SortKey = "newest" | "oldest" | "name_asc" | "name_desc" | "price_asc" | "price_desc" | "stock_asc" | "stock_desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest",     label: "Newest First" },
  { value: "oldest",     label: "Oldest First" },
  { value: "name_asc",   label: "Name A → Z" },
  { value: "name_desc",  label: "Name Z → A" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "stock_asc",  label: "Stock: Low → High" },
  { value: "stock_desc", label: "Stock: High → Low" },
];

const UID_KEY  = "nxc-uid";
const PROD_KEY = "nxc-prods-v1";
const FRESH_MS = 5 * 60 * 1000;
function getUid() { try { return localStorage.getItem(UID_KEY); } catch { return null; } }
function getProdCache() { try { const r = localStorage.getItem(PROD_KEY); if (!r) return null; const d = JSON.parse(r); return d?.ts && Date.now() - d.ts < FRESH_MS ? d : null; } catch { return null; } }
function saveProd(payload: object) { try { localStorage.setItem(PROD_KEY, JSON.stringify({ data: payload, ts: Date.now() })); } catch {} }

export default function SellerProductsPage() {
  const { user } = useAuthContext();
  const [products, setProducts] = useState<Product[]>(() => { try { return getProdCache()?.data?.products ?? []; } catch { return []; } });
  const [loading, setLoading] = useState(() => { try { return !getProdCache()?.data; } catch { return true; } });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // UI state — pure frontend, no backend changes
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Duplicate
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // CSV import
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ created: number; errors: number } | null>(null);
  const [csvActiveModal, setCsvActiveModal] = useState(false);
  const [csvIsActive, setCsvIsActive] = useState<boolean | null>(null);

  const fetchProducts = (uid: string) => {
    fetch("/api/sellers/products", { headers: { Authorization: `Bearer ${uid}` } })
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products ?? []);
        saveProd({ products: data.products ?? [] });
      })
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const uid = user?.uid ?? getUid();
    if (!uid) return;
    if (user?.uid) { try { localStorage.setItem(UID_KEY, user.uid); } catch {} }
    if (getProdCache() && products.length > 0) { setLoading(false); return; }
    fetchProducts(uid);
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (productId: string) => {
    const uid = user?.uid ?? getUid();
    if (!uid || !confirm("Permanently delete this product? This cannot be undone.")) return;
    setDeletingId(productId);
    try {
      const res = await fetch("/api/sellers/products", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${uid}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Product permanently deleted");
      setProducts((prev) => {
        const next = prev.filter((p) => p.id !== productId);
        saveProd({ products: next });
        return next;
      });
      setSelected((prev) => { const s = new Set(prev); s.delete(productId); return s; });
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (productId: string) => {
    const uid = user?.uid ?? getUid();
    if (!uid) return;
    setDuplicatingId(productId);
    try {
      const res = await fetch("/api/sellers/products/duplicate", {
        method: "POST",
        headers: { Authorization: `Bearer ${uid}`, "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`"${data.product.name}" created — it's inactive until you publish it`);
      fetchProducts(uid);
    } catch (err) {
      toast.error((err as Error).message || "Failed to duplicate product");
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const uid = user?.uid ?? getUid();
    if (!file || !uid) return;
    setCsvImporting(true);
    setCsvResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("isActive", String(csvIsActive ?? true));
      const res = await fetch("/api/sellers/products/csv-import", {
        method: "POST",
        headers: { Authorization: `Bearer ${uid}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setCsvResult({ created: data.created, errors: data.errors });
      if (data.created > 0) {
        toast.success(`${data.created} product${data.created > 1 ? "s" : ""} imported successfully`);
        fetchProducts(uid);
      }
      if (data.errors > 0) toast.error(`${data.errors} row${data.errors > 1 ? "s" : ""} had errors`);
    } catch (err) {
      toast.error((err as Error).message || "CSV import failed");
    } finally {
      setCsvImporting(false);
      setCsvIsActive(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  // Toggle active/inactive — uses PATCH endpoint
  const handleToggle = async (product: Product) => {
    const uid = user?.uid ?? getUid();
    if (!uid) return;
    setTogglingId(product.id);
    try {
      const res = await fetch("/api/sellers/products", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${uid}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: product.id, isActive: !product.isActive }),
      });
      if (!res.ok) throw new Error();
      setProducts((prev) => {
        const next = prev.map((p) => p.id === product.id ? { ...p, isActive: !p.isActive } : p);
        saveProd({ products: next });
        return next;
      });
      toast.success(product.isActive ? "Product hidden" : "Product activated");
    } catch {
      toast.error("Failed to update product");
    } finally {
      setTogglingId(null);
    }
  };

  // Bulk actions — iterate over selected, call existing handleDelete
  const handleBulkDelete = async () => {
    if (!confirm(`Permanently delete ${selected.size} products? This cannot be undone.`)) return;
    setBulkLoading(true);
    for (const id of selected) {
      await handleDelete(id).catch(() => null);
    }
    setSelected(new Set());
    setBulkLoading(false);
  };

  const handleBulkActivate = () => {
    setProducts((prev) => {
      const next = prev.map((p) => selected.has(p.id) ? { ...p, isActive: true } : p);
      saveProd({ products: next });
      return next;
    });
    toast.success(`${selected.size} products activated`);
    setSelected(new Set());
  };

  const handleBulkDeactivate = () => {
    setProducts((prev) => {
      const next = prev.map((p) => selected.has(p.id) ? { ...p, isActive: false } : p);
      saveProd({ products: next });
      return next;
    });
    toast.success(`${selected.size} products hidden`);
    setSelected(new Set());
  };

  // Derived filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...products];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.productId.toLowerCase().includes(q));
    if (filterTab === "active") list = list.filter((p) => p.isActive);
    if (filterTab === "out_of_stock") list = list.filter((p) => p.stock === 0);
    if (filterTab === "low_stock") list = list.filter((p) => p.stock > 0 && p.stock < 5);
    switch (sortBy) {
      case "newest":     list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "oldest":     list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case "name_asc":   list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name_desc":  list.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "price_asc":  list.sort((a, b) => a.price - b.price); break;
      case "price_desc": list.sort((a, b) => b.price - a.price); break;
      case "stock_asc":  list.sort((a, b) => a.stock - b.stock); break;
      case "stock_desc": list.sort((a, b) => b.stock - a.stock); break;
    }
    return list;
  }, [products, search, filterTab, sortBy]);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",          label: "All",           count: products.length },
    { key: "active",       label: "Active",        count: products.filter((p) => p.isActive).length },
    { key: "out_of_stock", label: "Out of Stock",  count: products.filter((p) => p.stock === 0).length },
    { key: "low_stock",    label: "Low Stock (<5)", count: products.filter((p) => p.stock > 0 && p.stock < 5).length },
  ];

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const s = new Set(prev);
        filtered.forEach((p) => s.delete(p.id));
        return s;
      });
    } else {
      setSelected((prev) => {
        const s = new Set(prev);
        filtered.forEach((p) => s.add(p.id));
        return s;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <span className="text-muted-foreground/50 text-[12px]">/</span>
            <span className="text-[12px] text-foreground font-medium">Products</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Products</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {products.length} products
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Home className="h-3.5 w-3.5" /> Home
            </Button>
          </Link>
          {/* CSV Import */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvImport}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setCsvActiveModal(true)}
            disabled={csvImporting}
            title="Import products from CSV (columns: name, price, stock, category, description)"
          >
            {csvImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {csvImporting ? "Importing…" : "Import CSV"}
          </Button>
          {csvResult && (
            <span className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> {csvResult.created} imported{csvResult.errors > 0 ? `, ${csvResult.errors} errors` : ""}
            </span>
          )}
          <Link href="/dashboard/products/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Search + filter tabs row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted/30 p-1 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                filterTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                  filterTab === tab.key ? "bg-muted text-muted-foreground" : "bg-muted/60 text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-9 appearance-none rounded-md border border-input bg-background pl-8 pr-7 text-[12px] font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ArrowDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search your products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 dark:border-blue-800/40 dark:bg-blue-950/30">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={handleBulkActivate}>
              Activate
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={handleBulkDeactivate}>
              Deactivate
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-[11px]"
              onClick={handleBulkDelete}
              disabled={bulkLoading}
            >
              {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete Selected"}
            </Button>
            <button onClick={() => setSelected(new Set())} className="ml-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-20 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30" />
          <h3 className="font-medium">{search || filterTab !== "all" ? "No matching products" : "No products yet"}</h3>
          <p className="text-sm text-muted-foreground">
            {search ? `No results for "${search}"` : filterTab !== "all" ? "Try a different filter" : "Add your first product to start selling"}
          </p>
          {!search && filterTab === "all" && (
            <Link href="/dashboard/products/new">
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">ID</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Price</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Stock</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Active</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const isLow = product.stock > 0 && product.stock < 5;
                  const isOut = product.stock === 0;
                  const isChecked = selected.has(product.id);

                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-border/40 last:border-0 transition-colors ${
                        isLow ? "bg-amber-50/50 dark:bg-amber-900/5 hover:bg-amber-50 dark:hover:bg-amber-900/10"
                        : "hover:bg-muted/20"
                      } ${isChecked ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelected((prev) => {
                              const s = new Set(prev);
                              if (s.has(product.id)) { s.delete(product.id); } else { s.add(product.id); }
                              return s;
                            });
                          }}
                          className="rounded border-border"
                        />
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {product.images[0] && (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                                style={{ objectPosition: product.cardImagePosition || "50% 50%" }}
                              />
                            )}
                          </div>
                          <span className="text-sm font-medium line-clamp-1 max-w-[130px]">{product.name}</span>
                        </div>
                      </td>

                      {/* Product ID */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-mono text-xs text-muted-foreground">{product.productId}</span>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{product.category?.name ?? "—"}</span>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold tabular-nums">{formatPrice(product.price)}</span>
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {isOut ? (
                          <Badge className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-semibold border-0">
                            Out of Stock
                          </Badge>
                        ) : isLow ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-red-500 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            {product.stock}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{product.stock}</span>
                        )}
                      </td>

                      {/* Active toggle */}
                      <td className="px-4 py-3">
                        <Switch
                          checked={product.isActive}
                          onCheckedChange={() => handleToggle(product)}
                          disabled={togglingId === product.id}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/products/${product.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                            onClick={() => handleDuplicate(product.id)}
                            disabled={duplicatingId === product.id}
                            title="Duplicate product"
                          >
                            {duplicatingId === product.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(product.id)}
                            disabled={deletingId === product.id}
                          >
                            {deletingId === product.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV format hint */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-[12px] text-muted-foreground">
        <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          <strong className="text-foreground">CSV Import format:</strong>{" "}
          Required — <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">name, description, price, stock, category</code>.{" "}
          Optional — <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">comparePrice, tags, condition, deliveryInfo, brand, warranty, isFeatured</code>.{" "}
          Tags: pipe-separated (e.g. <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">Shirt|Cotton|Formal</code>).{" "}
          Condition: <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">ORIGINAL</code> / <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">REFURBISHED</code> / <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">BOX_OPEN</code>.{" "}
          Max 500 rows per import.
        </span>
      </div>

      {/* CSV Active/Inactive choice modal */}
      {csvActiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background shadow-xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold">Import CSV — Listing Status</h2>
                <p className="text-xs text-muted-foreground">Should all imported products be visible to customers?</p>
              </div>
              <button onClick={() => setCsvActiveModal(false)} className="text-muted-foreground hover:text-foreground mt-0.5">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Choice cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCsvIsActive(true);
                  setCsvActiveModal(false);
                  setTimeout(() => csvInputRef.current?.click(), 50);
                }}
                className="group flex flex-col items-start gap-3 rounded-xl border-2 border-border bg-background p-4 text-left transition-all hover:border-blue-500 hover:shadow-md focus:outline-none"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <Globe className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">Active</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Products go live immediately — visible to all customers.</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Visible to customers
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCsvIsActive(false);
                  setCsvActiveModal(false);
                  setTimeout(() => csvInputRef.current?.click(), 50);
                }}
                className="group flex flex-col items-start gap-3 rounded-xl border-2 border-border bg-background p-4 text-left transition-all hover:border-muted-foreground hover:shadow-md focus:outline-none"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted group-hover:bg-muted/80 transition-colors">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">Inactive</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Saved as drafts — hidden until you activate them manually.</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  <EyeOff className="h-2.5 w-2.5" /> Hidden from customers
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
