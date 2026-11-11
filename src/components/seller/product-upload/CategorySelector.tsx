"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CATEGORY_CONFIG, type CategoryConfig } from "@/lib/category-config";

interface CategorySelectorProps {
  onSelect: (category: CategoryConfig) => void;
}

const POPULAR = ["electronics", "fashion", "home-kitchen", "grocery", "appliances", "beauty"];
const RECENT_KEY = "nexcart_recent_categories";

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(id: string) {
  if (typeof window === "undefined") return;
  const prev = getRecent().filter((r) => r !== id);
  localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, 4)));
}

export function CategorySelector({ onSelect }: CategorySelectorProps) {
  const [search, setSearch] = useState("");
  const [recentIds] = useState<string[]>(getRecent);

  const filtered = useMemo(() => {
    if (!search.trim()) return CATEGORY_CONFIG;
    return CATEGORY_CONFIG.filter((c) =>
      c.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const popularCats = CATEGORY_CONFIG.filter((c) => POPULAR.includes(c.id));
  const recentCats = CATEGORY_CONFIG.filter((c) => recentIds.includes(c.id));

  const handleSelect = (cat: CategoryConfig) => {
    saveRecent(cat.id);
    onSelect(cat);
  };

  return (
    <div className="max-w-3xl lg:max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-4xl font-semibold text-gray-900 tracking-tight">
          Add New Product
        </h1>
        <p className="text-sm lg:text-base text-gray-500 mt-1">
          Step 1 of 3 — Select a category to get started
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          className="pl-10 lg:pl-12 h-11 lg:h-14 border-gray-200 focus:border-gray-400 focus:ring-0 bg-white rounded-lg text-sm lg:text-base"
        />
      </div>

      {/* If searching */}
      {search.trim() ? (
        <div>
          <p className="text-xs lg:text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            Search Results
          </p>
          {filtered.length === 0 ? (
            <p className="text-sm lg:text-base text-gray-500 py-8 text-center">
              No categories found for &quot;{search}&quot;
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-5">
              {filtered.map((cat) => (
                <CategoryCard key={cat.id} cat={cat} onSelect={handleSelect} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Recent */}
          {recentCats.length > 0 && (
            <div className="mb-8">
              <p className="text-xs lg:text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                Recently Used
              </p>
              <div className="flex flex-wrap gap-2 lg:gap-3">
                {recentCats.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelect(cat)}
                    className="flex items-center gap-2 px-3 py-2 lg:px-5 lg:py-3 rounded-lg border border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50 transition-colors text-sm lg:text-base font-medium text-gray-700"
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular */}
          <div className="mb-8">
            <p className="text-xs lg:text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              Popular Categories
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-5">
              {popularCats.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  onSelect={handleSelect}
                  featured
                />
              ))}
            </div>
          </div>

          {/* All Categories */}
          <div>
            <p className="text-xs lg:text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              All Categories
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-5">
              {CATEGORY_CONFIG.map((cat) => (
                <CategoryCard key={cat.id} cat={cat} onSelect={handleSelect} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CategoryCard({
  cat,
  onSelect,
  featured,
}: {
  cat: CategoryConfig;
  onSelect: (c: CategoryConfig) => void;
  featured?: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(cat)}
      className={`group flex items-center gap-3 lg:gap-5 p-4 lg:p-6 rounded-xl border text-left transition-all duration-150
        ${
          featured
            ? "border-gray-200 bg-white hover:border-gray-900 hover:shadow-sm"
            : "border-gray-200 bg-white hover:border-gray-900 hover:shadow-sm"
        }
      `}
    >
      <span className="text-2xl lg:text-4xl flex-shrink-0">{cat.icon}</span>
      <div className="min-w-0">
        <p className="text-sm lg:text-lg font-medium text-gray-900 truncate">{cat.label}</p>
        <p className="text-xs lg:text-sm text-gray-400 mt-0.5">
          {cat.productTypes.length} product types
        </p>
      </div>
    </button>
  );
}
