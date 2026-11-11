import { Suspense } from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SearchResults, getSearchTotal } from "@/components/shared/SearchResults";
import { ProductFilters } from "@/components/product/ProductFilters";
import { SearchPageClient } from "@/components/product/SearchPageClient";
import { ProductGridSkeleton } from "@/components/product/ProductGrid";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: {
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
  };
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const q = searchParams.q;
  return {
    title: q ? `"${q}" — Search Results | NexCart` : "Browse Products | NexCart",
    description: q
      ? `Search results for "${q}" on NexCart`
      : "Browse thousands of products from verified sellers",
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const view: "grid" | "list" = searchParams.view === "list" ? "list" : "grid";

  const [categories, total] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    getSearchTotal(searchParams),
  ]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="pt-6 pb-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {searchParams.q ? `Results for "${searchParams.q}"` : "Browse All Products"}
          </h1>
        </div>

        {/* SortBar + FilterChips — no useSearchParams, receives searchParams as prop */}
        <SearchPageClient total={total} view={view} searchParams={searchParams} />

        <div className="flex gap-4 lg:gap-8 mt-4 pb-20 lg:pb-8">
          {/* Sidebar — desktop only */}
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-24 rounded-xl border border-border/50 bg-card p-5">
              <Suspense fallback={null}>
                <ProductFilters categories={categories} />
              </Suspense>
            </div>
          </aside>

          {/* Main results */}
          <div className="flex-1 min-w-0">
            <Suspense fallback={<ProductGridSkeleton count={12} columns={3} />}>
              <SearchResults searchParams={searchParams} view={view} />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
