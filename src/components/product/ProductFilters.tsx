"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect, Suspense } from "react";
import { ChevronDown, SlidersHorizontal, ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface ProductFiltersProps {
  categories: { id: string; name: string; slug: string }[];
}

interface AccordionSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function AccordionSection({ title, defaultOpen = true, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        className="flex w-full items-center justify-between py-3 text-left"
        onClick={() => setOpen((p) => !p)}
      >
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-[1px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={cn("text-[13px]", i < count ? "text-amber-400" : "text-muted-foreground/30")}>
          ★
        </span>
      ))}
    </span>
  );
}

const PRICE_CHIPS = [
  { label: "Under ₹500", min: 0, max: 500 },
  { label: "₹500–₹1,000", min: 500, max: 1000 },
  { label: "₹1,000–₹5,000", min: 1000, max: 5000 },
  { label: "Above ₹5,000", min: 5000, max: 999999 },
];

const DISCOUNT_OPTIONS = [10, 20, 30, 40, 50];
const RATING_OPTIONS = [4, 3, 2, 1];
const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest First" },
  { value: "rating", label: "Top Rated" },
];

function FilterBody({
  categories,
  onApply,
}: {
  categories: { id: string; name: string; slug: string }[];
  onApply?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort") ?? "relevance";
  const currentCategory = searchParams.get("category") ?? "";
  const currentMinPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined;
  const currentMaxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined;
  const currentRating = searchParams.get("rating") ? parseInt(searchParams.get("rating")!) : 0;
  const currentDiscount = searchParams.get("discount") ? parseInt(searchParams.get("discount")!) : 0;
  const currentInStock = searchParams.get("inStock") === "true";
  const currentFreeDelivery = searchParams.get("freeDelivery") === "true";
  const currentTomorrow = searchParams.get("tomorrow") === "true";

  const [minInput, setMinInput] = useState(currentMinPrice?.toString() ?? "");
  const [maxInput, setMaxInput] = useState(currentMaxPrice?.toString() ?? "");

  useEffect(() => {
    setMinInput(currentMinPrice?.toString() ?? "");
    setMaxInput(currentMaxPrice?.toString() ?? "");
  }, [currentMinPrice, currentMaxPrice]);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
      router.push(`/search?${params.toString()}`);
    },
    [searchParams, router]
  );

  const applyPriceInputs = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (minInput) params.set("minPrice", minInput);
    else params.delete("minPrice");
    if (maxInput) params.set("maxPrice", maxInput);
    else params.delete("maxPrice");
    params.delete("page");
    router.push(`/search?${params.toString()}`);
    onApply?.();
  };

  const setPriceChip = (min: number, max: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("minPrice", min.toString());
    if (max < 999999) params.set("maxPrice", max.toString());
    else params.delete("maxPrice");
    params.delete("page");
    router.push(`/search?${params.toString()}`);
    onApply?.();
  };

  const activeCount = [
    currentCategory,
    currentMinPrice,
    currentMaxPrice,
    currentRating,
    currentDiscount,
    currentInStock || null,
    currentFreeDelivery || null,
    currentTomorrow || null,
    currentSort !== "relevance" ? currentSort : null,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-2 pb-3 border-b border-border/40">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        <span className="text-[14px] font-bold text-foreground">Filters</span>
        {activeCount > 0 && (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </div>

      {/* Price Range */}
      <AccordionSection title="Price Range">
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            placeholder="Min ₹"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
          <span className="text-muted-foreground text-[12px] shrink-0">–</span>
          <input
            type="number"
            placeholder="Max ₹"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
          <button
            onClick={applyPriceInputs}
            className="shrink-0 rounded-[8px] bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90 transition-all"
          >
            Apply
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_CHIPS.map((chip) => {
            const active =
              currentMinPrice === chip.min &&
              (chip.max === 999999 ? !currentMaxPrice : currentMaxPrice === chip.max);
            return (
              <button
                key={chip.label}
                onClick={() => setPriceChip(chip.min, chip.max)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all duration-150",
                  active
                    ? "bg-primary text-white border-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </AccordionSection>

      {/* Category */}
      {categories.length > 0 && (
        <AccordionSection title="Category" defaultOpen={false}>
          <div className="space-y-1">
            {categories.map((cat) => {
              const active = currentCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => updateParam("category", active ? null : cat.slug)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                    active ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"
                  )}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </AccordionSection>
      )}

      {/* Customer Rating */}
      <AccordionSection title="Customer Rating">
        <div className="space-y-1">
          {RATING_OPTIONS.map((r) => {
            const active = currentRating === r;
            return (
              <button
                key={r}
                onClick={() => updateParam("rating", active ? null : r.toString())}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors",
                  active ? "bg-primary/10" : "hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    active ? "border-primary" : "border-border/60"
                  )}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <Stars count={r} />
                <span className="text-[12px] text-muted-foreground">& above</span>
              </button>
            );
          })}
        </div>
      </AccordionSection>

      {/* Discount */}
      <AccordionSection title="Discount" defaultOpen={false}>
        <div className="space-y-1.5">
          {DISCOUNT_OPTIONS.map((d) => {
            const active = currentDiscount === d;
            return (
              <label
                key={d}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-muted transition-colors"
                onClick={() => updateParam("discount", active ? null : d.toString())}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    active ? "bg-primary border-primary" : "border-border/60"
                  )}
                >
                  {active && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path
                        d="M1.5 5L4 7.5L8.5 2.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="text-[13px] text-foreground">{d}% or more</span>
              </label>
            );
          })}
        </div>
      </AccordionSection>

      {/* Availability */}
      <AccordionSection title="Availability">
        <div className="flex items-center justify-between px-1">
          <span className="text-[13px] text-foreground">In Stock Only</span>
          <Switch
            checked={currentInStock}
            onCheckedChange={(checked) => updateParam("inStock", checked ? "true" : null)}
          />
        </div>
      </AccordionSection>

      {/* Delivery */}
      <AccordionSection title="Delivery" defaultOpen={false}>
        <div className="space-y-2">
          {[
            { key: "freeDelivery", label: "Free Delivery", value: currentFreeDelivery },
            { key: "tomorrow", label: "Get it Tomorrow", value: currentTomorrow },
          ].map(({ key, label, value }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-muted transition-colors"
              onClick={() => updateParam(key, value ? null : "true")}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                  value ? "bg-primary border-primary" : "border-border/60"
                )}
              >
                {value && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10">
                    <path
                      d="M1.5 5L4 7.5L8.5 2.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="text-[13px] text-foreground">{label}</span>
            </label>
          ))}
        </div>
      </AccordionSection>

      {/* Apply / Clear */}
      <div className="pt-4">
        <Button className="w-full font-bold text-[13px]" onClick={() => onApply?.()}>
          Apply Filters
        </Button>
        {activeCount > 0 && (
          <button
            onClick={() => {
              const q = searchParams.get("q");
              router.push(q ? `/search?q=${q}` : "/search");
              onApply?.();
            }}
            className="mt-2 w-full text-center text-[12px] text-red-500 font-semibold hover:text-red-600 transition-colors"
          >
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  );
}

function SortBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") ?? "relevance";

  const setSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "relevance") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    router.push(`/search?${params.toString()}`);
    onClose();
  };

  return (
    <div className="space-y-1 pt-2">
      {SORT_OPTIONS.map((opt) => {
        const active =
          currentSort === opt.value || (opt.value === "relevance" && !searchParams.get("sort"));
        return (
          <button
            key={opt.value}
            onClick={() => setSort(opt.value)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-4 py-3 text-[14px] transition-colors",
              active ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"
            )}
          >
            {opt.label}
            {active && <span className="h-2 w-2 rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}

function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-white dark:bg-card shadow-2xl transition-transform duration-300",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border/40">
          <span className="text-[15px] font-bold">{title}</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 flex-1 pb-8">{children}</div>
      </div>
    </>
  );
}

function MobileFilterBar({
  categories,
}: {
  categories: { id: string; name: string; slug: string }[];
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white dark:bg-card border-t border-border/50 flex shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <button
          onClick={() => setSortOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 py-3.5 text-[13px] font-semibold text-foreground hover:bg-muted transition-colors border-r border-border/40"
        >
          <ArrowUpDown className="h-4 w-4" />
          Sort
        </button>
        <button
          onClick={() => setFilterOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 py-3.5 text-[13px] font-semibold text-foreground hover:bg-muted transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </button>
      </div>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filters">
        <FilterBody categories={categories} onApply={() => setFilterOpen(false)} />
      </BottomSheet>

      <BottomSheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort By">
        <SortBody onClose={() => setSortOpen(false)} />
      </BottomSheet>
    </>
  );
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  return (
    <>
      <div className="hidden lg:block">
        <Suspense fallback={null}>
          <FilterBody categories={categories} />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <MobileFilterBar categories={categories} />
      </Suspense>
    </>
  );
}
