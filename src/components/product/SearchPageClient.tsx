"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { SortBar } from "@/components/product/SortBar";
import { FilterChips } from "@/components/product/FilterChips";

interface RawSearchParams {
  q?: string;
  category?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  rating?: string;
  discount?: string;
  inStock?: string;
  freeDelivery?: string;
  tomorrow?: string;
  page?: string;
  view?: string;
}

interface SearchPageClientProps {
  total: number;
  view: "grid" | "list";
  searchParams: RawSearchParams;
}

const SORT_LABELS: Record<string, string> = {
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  newest: "Newest",
  rating: "Top Rated",
  popular: "Most Popular",
};

const FILTER_LABELS: Record<string, string> = {
  category: "Category",
  minPrice: "Min Price",
  maxPrice: "Max Price",
  rating: "Rating",
  discount: "Discount",
  inStock: "In Stock",
  freeDelivery: "Free Delivery",
  tomorrow: "Get it Tomorrow",
  sort: "Sort",
};

export function SearchPageClient({ total, view, searchParams }: SearchPageClientProps) {
  const router = useRouter();

  const currentSort = searchParams.sort ?? "relevance";
  const currentPage = searchParams.page ? parseInt(searchParams.page) : 1;

  const chips: { key: string; label: string; value: string }[] = [];
  const filterKeys = ["category", "minPrice", "maxPrice", "rating", "discount", "inStock", "freeDelivery", "tomorrow", "sort"] as const;
  for (const key of filterKeys) {
    const value = searchParams[key];
    if (!value) continue;
    if (key === "sort" && value === "relevance") continue;

    let label = "";
    if (key === "sort") label = `Sort: ${SORT_LABELS[value] ?? value}`;
    else if (key === "minPrice") label = `Min ₹${value}`;
    else if (key === "maxPrice") label = `Max ₹${value}`;
    else if (key === "rating") label = `${value}★ & above`;
    else if (key === "discount") label = `${value}% or more off`;
    else if (key === "inStock") label = "In Stock";
    else if (key === "freeDelivery") label = "Free Delivery";
    else if (key === "tomorrow") label = "Get it Tomorrow";
    else label = `${FILTER_LABELS[key] ?? key}: ${value}`;

    chips.push({ key, label, value });
  }

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v) p.set(k, v);
    }
    return p;
  }, [searchParams]);

  const handleSort = useCallback(
    (sort: string) => {
      const params = buildParams();
      if (sort === "relevance") params.delete("sort");
      else params.set("sort", sort);
      params.delete("page");
      router.push(`/search?${params.toString()}`);
    },
    [buildParams, router]
  );

  const handleView = useCallback(
    (v: "grid" | "list") => {
      const params = buildParams();
      if (v === "grid") params.delete("view");
      else params.set("view", v);
      router.push(`/search?${params.toString()}`, { scroll: false });
    },
    [buildParams, router]
  );

  const handleRemoveChip = useCallback(
    (key: string) => {
      const params = buildParams();
      params.delete(key);
      params.delete("page");
      router.push(`/search?${params.toString()}`);
    },
    [buildParams, router]
  );

  const handleClearAll = useCallback(() => {
    const q = searchParams.q;
    router.push(q ? `/search?q=${q}` : "/search");
  }, [searchParams.q, router]);

  return (
    <>
      <SortBar
        total={total}
        sort={currentSort}
        view={view}
        onSort={handleSort}
        onView={handleView}
        page={currentPage}
        limit={24}
      />
      <FilterChips
        filters={chips}
        onRemove={handleRemoveChip}
        onClearAll={handleClearAll}
      />
    </>
  );
}
