"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";
import {
  Plus, Pencil, Trash2, Tag, Loader2, X, Check,
  Gift, Percent, Truck, Zap, BadgePercent,
  MoreHorizontal, Search, ChevronDown, SortAsc, Package, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type OfferType = "BUY_X_GET_Y" | "PERCENT_OFF" | "FLAT_OFF" | "FREE_SHIPPING" | "CUSTOM" | "DEALS_OF_THE_DAY" | "FLASH_SALE";

interface Offer {
  id: string;
  title: string;
  description?: string | null;
  offerType: OfferType;
  buyQty?: number | null;
  getQty?: number | null;
  discountVal?: number | null;
  badgeColor?: string | null;
  isActive: boolean;
  sortOrder: number;
  linkedProductId?: string | null;
  selectedProductIds?: string[];
}

interface SellerProduct {
  id: string;
  productId: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  createdAt: string;
  isActive: boolean;
  category?: { name: string } | null;
}

type SortOption = "all" | "newest" | "oldest" | "name_asc" | "name_desc" | "price_low" | "price_high";

interface FormState {
  title: string;
  description: string;
  offerType: OfferType;
  buyQty: string;
  getQty: string;
  discountVal: string;
  isActive: boolean;
  linkedProductId: string | null;
  referenceProductMode: "nothing" | "addProductId";
  selectedProductIds: string[];
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  offerType: "BUY_X_GET_Y",
  buyQty: "",
  getQty: "",
  discountVal: "",
  isActive: true,
  linkedProductId: null,
  referenceProductMode: "nothing",
  selectedProductIds: [],
};

const OFFER_TYPES: { value: OfferType; label: string; icon: React.FC<{ className?: string }>; hint: string }[] = [
  { value: "BUY_X_GET_Y",      label: "Buy X Get Y Free",   icon: Gift,         hint: "E.g. Buy 3 Get 1 Free" },
  { value: "PERCENT_OFF",       label: "% Discount",         icon: Percent,      hint: "E.g. 20% Off on all products" },
  { value: "FLAT_OFF",          label: "Flat Amount Off",    icon: BadgePercent, hint: "E.g. ₹100 Off on ₹500+" },
  { value: "FREE_SHIPPING",     label: "Free Shipping",      icon: Truck,        hint: "E.g. Free delivery on all orders" },
  { value: "CUSTOM",            label: "Custom Offer",       icon: Zap,          hint: "Write your own offer text" },
  { value: "DEALS_OF_THE_DAY",  label: "Deals of the Day",  icon: Gift,         hint: "Select specific products for special deals" },
  { value: "FLASH_SALE",        label: "Flash Sale",         icon: Zap,          hint: "Limited-time flash deals — products marked with ⚡ badge" },
];

// 6 distinct Tailwind palettes — one per offer type
const PALETTE_OPTIONS = [
  { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-700" },
  { bg: "bg-red-100 dark:bg-red-900/30",       text: "text-red-700 dark:text-red-300",       border: "border-red-200 dark:border-red-700" },
  { bg: "bg-amber-100 dark:bg-amber-900/30",   text: "text-amber-700 dark:text-amber-300",   border: "border-amber-200 dark:border-amber-700" },
  { bg: "bg-green-100 dark:bg-green-900/30",   text: "text-green-700 dark:text-green-300",   border: "border-green-200 dark:border-green-700" },
  { bg: "bg-blue-100 dark:bg-blue-900/30",     text: "text-blue-700 dark:text-blue-300",     border: "border-blue-200 dark:border-blue-700" },
  { bg: "bg-pink-100 dark:bg-pink-900/30",     text: "text-pink-700 dark:text-pink-300",     border: "border-pink-200 dark:border-pink-700" },
];

// Hue centers matching each palette: purple, red, amber, green, blue, pink
const PALETTE_HUES = [270, 0, 38, 142, 221, 320];

// Given the banner hue, rank all 6 palettes by color harmony:
// analogous (20–60°) > triadic (100–140°) > complementary (160–200°) > others
function getHarmoniousPalettes(bannerHue: number) {
  const rank = (dist: number) => {
    if (dist >= 20 && dist <= 60)   return 0;
    if (dist >= 100 && dist <= 140) return 1;
    if (dist >= 160 && dist <= 200) return 2;
    if (dist > 60 && dist < 100)    return 3;
    if (dist > 200)                 return 4;
    return 5;
  };
  return PALETTE_HUES
    .map((h, i) => {
      let dist = Math.abs(h - bannerHue) % 360;
      if (dist > 180) dist = 360 - dist;
      return { idx: i, dist };
    })
    .sort((a, b) => rank(a.dist) - rank(b.dist) || a.dist - b.dist)
    .map(s => PALETTE_OPTIONS[s.idx]);
}

// Returns a COLOR_MAP where each offer type gets a harmonious color for this seller's banner
function getOfferColorMap(bannerHue: number): Record<OfferType, { bg: string; text: string; border: string }> {
  const palettes = getHarmoniousPalettes(bannerHue);
  const ORDER: OfferType[] = ["BUY_X_GET_Y", "PERCENT_OFF", "FLAT_OFF", "FREE_SHIPPING", "CUSTOM", "DEALS_OF_THE_DAY", "FLASH_SALE"];
  const map = {} as Record<OfferType, { bg: string; text: string; border: string }>;
  ORDER.forEach((type, i) => { map[type] = palettes[i]; });
  return map;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "all",        label: "All Products" },
  { value: "newest",     label: "Recently Added" },
  { value: "oldest",     label: "Oldest First" },
  { value: "name_asc",   label: "Name A → Z" },
  { value: "name_desc",  label: "Name Z → A" },
  { value: "price_low",  label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
];

function buildAutoTitle(form: FormState): string {
  switch (form.offerType) {
    case "BUY_X_GET_Y":   return form.buyQty && form.getQty ? `Buy ${form.buyQty} Get ${form.getQty} Free` : "Buy X Get Y Free";
    case "PERCENT_OFF":   return form.discountVal ? `${form.discountVal}% Off` : "% Off";
    case "FLAT_OFF":      return form.discountVal ? `₹${form.discountVal} Off` : "Flat Off";
    case "FREE_SHIPPING":    return "Free Shipping";
    case "DEALS_OF_THE_DAY": return "Deals of the Day";
    case "FLASH_SALE":        return "⚡ Flash Sale";
    case "CUSTOM":           return form.title || "Custom Offer";
    default:                 return form.title;
  }
}

function OfferBadge({ offer, size = "sm", bannerHue = 221 }: { offer: Offer; size?: "sm" | "lg"; bannerHue?: number }) {
  const COLOR_MAP = getOfferColorMap(bannerHue);
  const colors = COLOR_MAP[offer.offerType] ?? COLOR_MAP.CUSTOM;
  const Icon = OFFER_TYPES.find(t => t.value === offer.offerType)?.icon ?? Tag;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border font-semibold tracking-tight",
      colors.bg, colors.text, colors.border,
      size === "lg" ? "px-3 py-1.5 text-[13px]" : "px-2 py-0.5 text-[11px]"
    )}>
      <Icon className={size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      {offer.title}
    </span>
  );
}

// ─── Multi-Select Product Picker Panel ────────────────────────────────────────

function ProductPickerPanel({
  onSelectSingle,
  onSelectMultiple,
  onClose,
  selectedId,
  selectedIds,
  multiSelect,
  authToken,
}: {
  onSelectSingle: (product: SellerProduct) => void;
  onSelectMultiple: (ids: string[]) => void;
  onClose: () => void;
  selectedId: string | null;
  selectedIds: string[];
  multiSelect: boolean;
  authToken: string;
}) {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("all");
  const [showSortMenu, setShowSortMenu] = useState(false);
  // Local multi-select state inside picker
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedIds));
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/sellers/products", {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (res.ok) setProducts(data.products ?? []);
      } catch {
        toast.error("Failed to load products");
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [authToken]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = products
    .filter(p => p.isActive)
    .filter(p =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.productId.toLowerCase().includes(search.toLowerCase())
    );

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "all":        return 0; // original order
      case "newest":     return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":     return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name_asc":   return a.name.localeCompare(b.name);
      case "name_desc":  return b.name.localeCompare(a.name);
      case "price_low":  return a.price - b.price;
      case "price_high": return b.price - a.price;
      default:           return 0;
    }
  });

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? "Sort";

  const toggleLocalSelect = (id: string) => {
    setLocalSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const allVisibleSelected = sorted.length > 0 && sorted.every(p => localSelected.has(p.id));
  const toggleAll = () => {
    if (allVisibleSelected) {
      setLocalSelected(prev => {
        const s = new Set(prev);
        sorted.forEach(p => s.delete(p.id));
        return s;
      });
    } else {
      setLocalSelected(prev => {
        const s = new Set(prev);
        sorted.forEach(p => s.add(p.id));
        return s;
      });
    }
  };

  const handleConfirmMulti = () => {
    onSelectMultiple(Array.from(localSelected));
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] font-semibold">
            {multiSelect ? "Select Products" : "Select a Product"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Sort + Search */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0 bg-muted/20">
        {/* Sort button */}
        <div className="relative" ref={sortMenuRef}>
          <button
            type="button"
            onClick={() => setShowSortMenu(s => !s)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap shadow-sm"
          >
            <SortAsc className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">{currentSortLabel}</span>
            <span className="sm:hidden">Sort</span>
            <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", showSortMenu && "rotate-180")} />
          </button>

          {showSortMenu && (
            <div className="absolute left-0 top-full z-30 mt-1 w-48 rounded-xl border border-border bg-background shadow-xl py-1 overflow-hidden">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-[12px] transition-colors hover:bg-muted",
                    sortBy === opt.value ? "text-foreground font-semibold bg-muted/60" : "text-muted-foreground"
                  )}
                >
                  {opt.label}
                  {sortBy === opt.value && <Check className="h-3 w-3 text-foreground" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-8 pr-7 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:outline-none shadow-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Result count + select all (multi-select mode) */}
      <div className="px-4 pt-2 pb-1 shrink-0 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {loadingProducts ? "Loading..." : `${sorted.length} product${sorted.length !== 1 ? "s" : ""}`}
        </span>
        {multiSelect && !loadingProducts && sorted.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-[11px] text-foreground underline font-medium"
          >
            {allVisibleSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
        {loadingProducts ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-[12px] text-muted-foreground">No products found</p>
            {search && (
              <button type="button" onClick={() => setSearch("")} className="mt-1 text-[11px] text-foreground underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          sorted.map(product => {
            const isSelected = multiSelect
              ? localSelected.has(product.id)
              : selectedId === product.id;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  if (multiSelect) {
                    toggleLocalSelect(product.id);
                  } else {
                    onSelectSingle(product);
                    onClose();
                  }
                }}
                className={cn(
                  "group w-full flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                  isSelected
                    ? "border-foreground/50 bg-foreground/5 ring-1 ring-foreground/20"
                    : "border-border bg-background hover:border-foreground/20 hover:bg-muted/30"
                )}
              >
                {/* Checkbox */}
                <div className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  isSelected
                    ? "border-foreground bg-foreground text-background"
                    : "border-muted-foreground/30 group-hover:border-foreground/40"
                )}>
                  {isSelected && <Check className="h-2.5 w-2.5" />}
                </div>

                {/* Product image */}
                <div className="h-9 w-9 shrink-0 rounded-lg border border-border bg-muted overflow-hidden">
                  {product.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[12px] font-medium text-foreground leading-tight">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{product.productId}</p>
                </div>

                {/* Price + stock */}
                <div className="shrink-0 text-right">
                  <p className="text-[12px] font-semibold text-foreground">
                    {"₹"}{product.price.toLocaleString("en-IN")}
                  </p>
                  <p className={cn("text-[10px]", product.stock > 0 ? "text-green-600 dark:text-green-400" : "text-red-500")}>
                    {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Multi-select confirm footer */}
      {multiSelect && (
        <div className="shrink-0 border-t border-border bg-background px-4 py-3 flex items-center gap-2">
          <span className="flex-1 text-[12px] text-muted-foreground">
            {localSelected.size > 0
              ? `${localSelected.size} product${localSelected.size !== 1 ? "s" : ""} selected`
              : "No products selected"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmMulti}
            className="rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-semibold text-background hover:opacity-90 transition-opacity"
          >
            Confirm ({localSelected.size})
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Offer Form Modal ─────────────────────────────────────────────────────────

function OfferFormModal({
  initial,
  onSave,
  onClose,
  saving,
  authToken,
  bannerHue = 221,
}: {
  initial?: Offer;
  onSave: (form: FormState) => void;
  onClose: () => void;
  saving: boolean;
  authToken: string;
  bannerHue?: number;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          title:                initial.title,
          description:          initial.description ?? "",
          offerType:            initial.offerType,
          buyQty:               initial.buyQty != null ? String(initial.buyQty) : "",
          getQty:               initial.getQty != null ? String(initial.getQty) : "",
          discountVal:          initial.discountVal != null ? String(initial.discountVal) : "",
          isActive:             initial.isActive,
          linkedProductId:      initial.linkedProductId ?? null,
          referenceProductMode: initial.linkedProductId ? "addProductId" : "nothing",
          selectedProductIds:   initial.selectedProductIds ?? [],
        }
      : { ...EMPTY_FORM }
  );

  const [pickerOpen, setPickerOpen] = useState(false);

  const isEditing = !!initial;
  const autoTitle = buildAutoTitle(form);
  const displayTitle = form.offerType !== "CUSTOM" ? autoTitle : form.title;

  const previewOffer: Offer = {
    id: "preview",
    title: displayTitle || "Offer",
    offerType: form.offerType,
    isActive: true,
    sortOrder: 0,
  };

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitForm = { ...form };
    if (form.offerType !== "CUSTOM") submitForm.title = autoTitle;
    if (!submitForm.title.trim()) { toast.error("Please enter an offer title"); return; }
    onSave(submitForm);
  };

  // Whether picker is in multi-select mode (Deals of the Day) or single
  const isMultiMode = form.offerType === "DEALS_OF_THE_DAY" || form.referenceProductMode === "addProductId";
  // For DEALS_OF_THE_DAY the picker manages selectedProductIds
  // For addProductId mode it also manages selectedProductIds (multiple products allowed)
  const pickerIsMulti = form.offerType === "DEALS_OF_THE_DAY" || form.referenceProductMode === "addProductId";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Outer container — expands sideways when picker is open */}
      <div
        className={cn(
          "relative flex rounded-2xl border border-border bg-background shadow-2xl overflow-hidden transition-all duration-300 ease-in-out",
          pickerOpen ? "w-full max-w-3xl" : "w-full max-w-lg"
        )}
        style={{ maxHeight: "90vh" }}
      >
        {/* ── Left: Offer form ────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
                <Tag className="h-4 w-4 text-background" />
              </div>
              <h2 className="text-[15px] font-semibold">{isEditing ? "Edit Offer" : "New Offer"}</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Home button */}
              <Link href="/" target="_blank" rel="noopener noreferrer">
                <button
                  type="button"
                  title="Go to Home"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Home className="h-4 w-4" />
                </button>
              </Link>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable form body */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Offer Type */}
              <div>
                <label className="mb-2 block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Offer Type
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {OFFER_TYPES.map(type => {
                    const Icon = type.icon;
                    const selected = form.offerType === type.value;
                    const colors = getOfferColorMap(bannerHue)[type.value];
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, offerType: type.value }))}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-[13px] font-medium transition-all",
                          selected
                            ? cn("border-2", colors.border, colors.bg, colors.text)
                            : "border-border text-muted-foreground hover:border-border/80 hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{type.label}</div>
                          <div className={cn("text-[11px]", selected ? "opacity-70" : "text-muted-foreground")}>{type.hint}</div>
                        </div>
                        {selected && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BUY_X_GET_Y fields */}
              {form.offerType === "BUY_X_GET_Y" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Buy Qty</label>
                    <input type="number" min={1} max={99} placeholder="3" value={form.buyQty} onChange={set("buyQty")}
                      className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Get Qty Free</label>
                    <input type="number" min={1} max={99} placeholder="1" value={form.getQty} onChange={set("getQty")}
                      className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none" />
                  </div>
                </div>
              )}

              {/* PERCENT_OFF / FLAT_OFF */}
              {(form.offerType === "PERCENT_OFF" || form.offerType === "FLAT_OFF") && (
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                    {form.offerType === "PERCENT_OFF" ? "Discount %" : "Flat Amount (₹)"}
                  </label>
                  <input type="number" min={1} max={form.offerType === "PERCENT_OFF" ? 99 : 100000}
                    placeholder={form.offerType === "PERCENT_OFF" ? "20" : "100"}
                    value={form.discountVal} onChange={set("discountVal")}
                    className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none" />
                </div>
              )}

              {/* CUSTOM title */}
              {form.offerType === "CUSTOM" && (
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                    Offer Title <span className="text-red-400">*</span>
                  </label>
                  <input type="text" maxLength={80} placeholder="E.g. Bundle of 5 at ₹999"
                    value={form.title} onChange={set("title")} required
                    className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none" />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                  Description <span className="opacity-50">(optional)</span>
                </label>
                <textarea maxLength={200} rows={2} placeholder="Any fine print customers should know..."
                  value={form.description} onChange={set("description")}
                  className="w-full resize-none rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none" />
              </div>

              {/* ── DEALS OF THE DAY: multi-product picker ─────────────────── */}
              {form.offerType === "DEALS_OF_THE_DAY" && (
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="text-[11px] font-semibold text-foreground uppercase tracking-widest">Select Deal Products</div>
                  <p className="text-[12px] text-muted-foreground">
                    Choose multiple products to feature in this deal. Click ⋯ to open the product browser.
                  </p>

                  {/* Browse button */}
                  <button
                    type="button"
                    onClick={() => setPickerOpen(p => !p)}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-[13px] font-semibold transition-all duration-200",
                      pickerOpen
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground hover:border-foreground/50 hover:bg-muted"
                    )}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    {pickerOpen ? "Close Browser" : "Browse & Select Products"}
                  </button>

                  {/* Selected product pills */}
                  {form.selectedProductIds.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {form.selectedProductIds.length} product{form.selectedProductIds.length !== 1 ? "s" : ""} selected:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {form.selectedProductIds.map(pid => (
                          <div key={pid} className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/20 px-2 py-0.5 text-[11px] text-green-700 dark:text-green-400">
                            <Check className="h-2.5 w-2.5" />
                            <span className="font-mono">{pid.slice(0, 16)}{pid.length > 16 ? "…" : ""}</span>
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, selectedProductIds: f.selectedProductIds.filter(x => x !== pid) }))}
                              className="ml-0.5 text-green-500 hover:text-red-500 transition-colors"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Reference Product (non-DEALS_OF_THE_DAY) ──────────────── */}
              {form.offerType !== "DEALS_OF_THE_DAY" && (
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="text-[11px] font-semibold text-foreground uppercase tracking-widest">Reference Product</div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg border border-border bg-background hover:bg-muted/30 transition">
                      <input type="radio" name="referenceMode" value="nothing"
                        checked={form.referenceProductMode === "nothing"}
                        onChange={() => setForm({ ...form, referenceProductMode: "nothing", linkedProductId: null, selectedProductIds: [] })}
                        className="h-4 w-4" />
                      <span className="text-[13px] text-foreground">Nothing (no product link)</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-lg border border-border bg-background hover:bg-muted/30 transition">
                      <input type="radio" name="referenceMode" value="addProductId"
                        checked={form.referenceProductMode === "addProductId"}
                        onChange={() => setForm({ ...form, referenceProductMode: "addProductId" })}
                        className="h-4 w-4" />
                      <span className="text-[13px] text-foreground">Add Product ID</span>
                    </label>
                  </div>

                  {form.referenceProductMode === "addProductId" && (
                    <div className="space-y-2">
                      <label className="block text-[12px] font-medium text-muted-foreground">
                        Product ID <span className="text-red-400">*</span>
                      </label>

                      {/* Input + dots button row */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Enter product ID (e.g., prod_123abc)"
                          value={form.linkedProductId || ""}
                          onChange={e => setForm({ ...form, linkedProductId: e.target.value || null })}
                          className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:outline-none"
                        />

                        {/* ⋯ Dots button — opens single-select picker */}
                        <button
                          type="button"
                          onClick={() => setPickerOpen(p => !p)}
                          title="Browse your products"
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-200",
                            pickerOpen
                              ? "border-foreground bg-foreground text-background shadow-lg scale-95"
                              : "border-border bg-background text-muted-foreground hover:border-foreground/50 hover:bg-muted hover:text-foreground hover:scale-105"
                          )}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Selected product pills — shows all selected products */}
                      {form.selectedProductIds.length > 0 ? (
                        <div className="space-y-1.5">
                          <p className="text-[11px] text-muted-foreground font-medium">
                            {form.selectedProductIds.length} product{form.selectedProductIds.length !== 1 ? "s" : ""} selected:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {form.selectedProductIds.map(pid => (
                              <div key={pid} className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/20 px-2 py-0.5 text-[11px] text-green-700 dark:text-green-400">
                                <Check className="h-2.5 w-2.5" />
                                <span className="font-mono">{pid.slice(0, 16)}{pid.length > 16 ? "…" : ""}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const remaining = form.selectedProductIds.filter(x => x !== pid);
                                    setForm({ ...form, selectedProductIds: remaining, linkedProductId: remaining[0] ?? null });
                                  }}
                                  className="ml-0.5 text-green-500 hover:text-red-500 transition-colors"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : form.linkedProductId ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/20 px-2.5 py-1 text-[11px] text-green-700 dark:text-green-400">
                            <Check className="h-3 w-3" />
                            <span className="font-mono">{form.linkedProductId}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, linkedProductId: null })}
                            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : null}

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        When customers click this offer, only this product will be shown.
                        Click <span className="font-mono font-semibold text-foreground">&#8943;</span> to browse and select multiple products.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
                <div className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Preview on product card</div>
                <div className="flex flex-wrap gap-1.5">
                  <OfferBadge offer={previewOffer} size="lg" bannerHue={bannerHue} />
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 border-t border-border bg-background px-6 py-4 flex items-center gap-3">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 rounded-xl bg-foreground text-background hover:opacity-90" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Save Changes" : "Add Offer"}
              </Button>
            </div>
          </form>
        </div>

        {/* ── Right: Product Picker ──────────────────────────────────────────── */}
        <div
          className={cn(
            "border-l border-border overflow-hidden transition-all duration-300 ease-in-out flex flex-col",
            pickerOpen ? "w-72 opacity-100" : "w-0 opacity-0 pointer-events-none"
          )}
        >
          {pickerOpen && (
            <ProductPickerPanel
              authToken={authToken}
              selectedId={form.linkedProductId}
              selectedIds={form.selectedProductIds}
              multiSelect={pickerIsMulti}
              onSelectSingle={product => {
                setForm(f => ({ ...f, linkedProductId: product.id }));
              }}
              onSelectMultiple={ids => {
                if (form.offerType === "DEALS_OF_THE_DAY") {
                  setForm(f => ({ ...f, selectedProductIds: ids }));
                } else {
                  // addProductId mode — store multiple in selectedProductIds, first as linkedProductId
                  setForm(f => ({ ...f, selectedProductIds: ids, linkedProductId: ids[0] ?? null }));
                }
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main OffersManager ───────────────────────────────────────────────────────

export function OffersManager() {
  const { user } = useAuthContext();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [sellerId, setSellerId] = useState<string>("");
  // Derive banner hue from sellerId — same algorithm as SellerStoreClient
  const bannerHue = (() => {
    if (!sellerId) return 221; // default blue until sellerId loads
    let hash = 0;
    for (let i = 0; i < sellerId.length; i++) {
      hash = sellerId.charCodeAt(i) + ((hash << 5) - hash);
      hash |= 0;
    }
    return Math.abs(hash) % 360;
  })();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editOffer, setEditOffer] = useState<Offer | null>(null);

  const authToken = user?.uid ?? "";

  const authHeader = useCallback(() => {
    if (!user) return {};
    return { Authorization: `Bearer ${user.uid}` };
  }, [user]);

  const fetchOffers = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/sellers/offers", { headers: authHeader() as HeadersInit });
      const data = await res.json();
      if (res.ok) {
        setOffers(data.offers ?? []);
        if (data.sellerId) setSellerId(data.sellerId);
      }
    } catch {
      toast.error("Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, [user, authHeader]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const handleSave = async (form: FormState) => {
    setSaving(true);
    try {
      const payload = {
        ...(editOffer ? { id: editOffer.id } : {}),
        title:              form.title,
        description:        form.description || null,
        offerType:          form.offerType,
        buyQty:             form.buyQty ? Number(form.buyQty) : null,
        getQty:             form.getQty ? Number(form.getQty) : null,
        discountVal:        form.discountVal ? Number(form.discountVal) : null,
        isActive:           form.isActive,
        linkedProductId:    form.linkedProductId ?? null,
        selectedProductIds: form.selectedProductIds.length > 0 ? form.selectedProductIds : null,
      };
      const res = await fetch("/api/sellers/offers", {
        method: editOffer ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(authHeader() as HeadersInit) },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save offer");
      toast.success(editOffer ? "Offer updated!" : "Offer created!");
      setShowModal(false);
      setEditOffer(null);
      await fetchOffers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error saving offer");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this offer? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/sellers/offers?id=${id}`, { method: "DELETE", headers: authHeader() as HeadersInit });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Offer deleted");
      setOffers(o => o.filter(x => x.id !== id));
    } catch {
      toast.error("Failed to delete offer");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (offer: Offer) => {
    try {
      const res = await fetch("/api/sellers/offers", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(authHeader() as HeadersInit) },
        body: JSON.stringify({
          id: offer.id, title: offer.title, offerType: offer.offerType,
          description: offer.description, buyQty: offer.buyQty, getQty: offer.getQty,
          discountVal: offer.discountVal, isActive: !offer.isActive,
        }),
      });
      if (!res.ok) throw new Error();
      setOffers(o => o.map(x => x.id === offer.id ? { ...x, isActive: !x.isActive } : x));
    } catch {
      toast.error("Failed to update offer");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <span className="text-muted-foreground/50 text-[12px]">/</span>
            <span className="text-[12px] text-foreground font-medium">Offers</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Create promotions that float on your product cards in your store.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/">
            <button className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </button>
          </Link>
          <button
            onClick={() => { setEditOffer(null); setShowModal(true); }}
            className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-[13px] font-semibold text-background shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Offer
          </button>
        </div>
      </div>

      {offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
            <Tag className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-[15px] font-semibold">No offers yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Create your first offer — like <span className="font-medium text-foreground">Buy 3 Get 1 Free</span> — and it will float on your product cards.
          </p>
          <button
            onClick={() => { setEditOffer(null); setShowModal(true); }}
            className="mt-5 flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-[13px] font-semibold text-background hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Create First Offer
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {offers.map(offer => {
            const colors = getOfferColorMap(bannerHue)[offer.offerType];
            const Icon = OFFER_TYPES.find(t => t.value === offer.offerType)?.icon ?? Tag;
            return (
              <div key={offer.id} className={cn(
                "group flex items-center gap-4 rounded-2xl border bg-background px-4 py-3.5 shadow-sm transition-all duration-200 hover:shadow-md",
                !offer.isActive && "opacity-50"
              )}>
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", colors.bg, colors.border)}>
                  <Icon className={cn("h-4 w-4", colors.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <OfferBadge offer={offer} size="lg" bannerHue={bannerHue} />
                    {!offer.isActive && (
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Paused</span>
                    )}
                  </div>
                  {offer.description && (
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{offer.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => handleToggle(offer)}
                    className={cn(
                      "h-7 rounded-lg px-2.5 text-[11px] font-semibold transition-colors",
                      offer.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {offer.isActive ? "Live" : "Off"}
                  </button>
                  <button
                    onClick={() => { setEditOffer(offer); setShowModal(true); }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(offer.id)}
                    disabled={deleting === offer.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition-colors hover:bg-red-100 dark:border-red-800/40 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                  >
                    {deleting === offer.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
          <p className="pt-1 text-right text-[12px] text-muted-foreground">
            {offers.filter(o => o.isActive).length} active · {offers.length} total · max 20
          </p>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-[13px] font-semibold">How offers work</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
              Active offers appear as coloured badges floating on your product cards in your public store.
              Customers can immediately see your promotions. Pause or edit any time.
            </p>
          </div>
        </div>
      </div>

      {showModal && (
        <OfferFormModal
          initial={editOffer ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditOffer(null); }}
          saving={saving}
          authToken={authToken}
          bannerHue={bannerHue}
        />
      )}
    </>
  );
}
