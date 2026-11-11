"use client";

import { LayoutGrid, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Top Rated" },
];

interface SortBarProps {
  total: number;
  sort: string;
  view: "grid" | "list";
  onSort: (sort: string) => void;
  onView: (view: "grid" | "list") => void;
  page?: number;
  limit?: number;
}

export function SortBar({ total, sort, view, onSort, onView, page = 1, limit = 24 }: SortBarProps) {
  const start = Math.min((page - 1) * limit + 1, total);
  const end = Math.min(page * limit, total);

  return (
    <div
      className="sticky z-40 bg-white dark:bg-card border-b border-border/50 px-4 py-2.5"
      style={{ top: 62 }}
    >
      <div className="flex items-center gap-3 max-w-7xl mx-auto">
        {/* Left: result count */}
        <span className="text-[13px] text-muted-foreground shrink-0 hidden sm:block">
          Showing {start}–{end} of {total} results
        </span>
        <span className="text-[13px] text-muted-foreground shrink-0 sm:hidden">
          {total} results
        </span>

        {/* Divider */}
        <div className="hidden sm:block h-4 w-px bg-border/60 shrink-0" />

        {/* Center: sort tabs — horizontally scrollable on mobile */}
        <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 w-max">
            <span className="text-[12px] text-muted-foreground font-medium shrink-0 mr-1 hidden sm:block">
              Sort:
            </span>
            {SORT_OPTIONS.map((opt) => {
              const active = sort === opt.value || (opt.value === "relevance" && !sort);
              return (
                <button
                  key={opt.value}
                  onClick={() => onSort(opt.value)}
                  className={cn(
                    "shrink-0 px-3 py-1 rounded-full text-[12px] font-medium transition-all duration-150 whitespace-nowrap",
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: grid/list toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onView("grid")}
            aria-label="Grid view"
            className={cn(
              "p-1.5 rounded-md transition-colors",
              view === "grid"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onView("list")}
            aria-label="List view"
            className={cn(
              "p-1.5 rounded-md transition-colors",
              view === "list"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
