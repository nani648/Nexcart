import { db } from "@/lib/db";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductListCard } from "@/components/product/ProductListCard";
import { SellerCard } from "@/components/seller/SellerCard";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { Package, Store } from "lucide-react";
import { buildDidYouMeanQuery } from "@/lib/utils";

interface SearchParams {
  q?: string;
  category?: string;
  sort?: string;
  type?: string;
  featured?: string;
  minPrice?: string;
  maxPrice?: string;
  rating?: string;
  discount?: string;
  inStock?: string;
  freeDelivery?: string;
  tomorrow?: string;
  page?: string;
}

interface SearchResultsProps {
  searchParams: SearchParams;
  view?: "grid" | "list";
  showFiltersTotal?: (total: number) => void;
}

export async function SearchResults({ searchParams, view = "grid" }: SearchResultsProps) {
  const {
    q = "",
    category,
    sort = "newest",
    type,
    featured,
    minPrice,
    maxPrice,
    rating,
    inStock,
    page = "1",
  } = searchParams;

  const pageNum = Math.max(1, parseInt(page));
  const limit = 24;
  const skip = (pageNum - 1) * limit;
  const showSellers = type === "sellers";
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  if (showSellers) {
    const where: Record<string, unknown> = { status: "APPROVED" };
    if (q) {
      where.OR = [
        { storeName: { contains: q, mode: "insensitive" } },
        { sellerId: { contains: q, mode: "insensitive" } },
      ];
    }
    const [sellers, total] = await Promise.all([
      db.seller.findMany({
        where,
        include: {
          _count: { select: { products: true } },
        },
        take: limit,
        skip,
        orderBy: { rating: "desc" },
      }),
      db.seller.count({ where }),
    ]);

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold">
            {q ? `Sellers matching "${q}"` : "All Sellers"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} sellers found</p>
        </div>
        {sellers.length === 0 ? (
          <EmptyState
            icon={<Store className="h-6 w-6" />}
            title="No sellers found"
            description="Try a different search"
            action={{ label: "Browse Products", href: "/search" }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {sellers.map((s) => (
                <SellerCard
                  key={s.id}
                  sellerId={s.sellerId}
                  storeName={s.storeName}
                  description={s.description}
                  logo={s.logo}
                  banner={s.banner}
                  rating={s.rating}
                  productCount={s._count.products}
                />
              ))}
            </div>
            <div className="mt-10">
              <Pagination currentPage={pageNum} totalPages={Math.ceil(total / limit)} />
            </div>
          </>
        )}
      </div>
    );
  }

  // Product search
  const where: Record<string, unknown> = { isActive: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { productId: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) where.category = { slug: category };
  if (featured === "true") where.isFeatured = true;
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
      ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}),
    };
  }
  if (rating) where.rating = { gte: parseInt(rating) };
  if (inStock === "true") where.stock = { gt: 0 };

  const orderBy: Record<string, string> =
    sort === "price_asc"
      ? { price: "asc" }
      : sort === "price_desc"
      ? { price: "desc" }
      : sort === "rating"
      ? { rating: "desc" }
      : sort === "popular"
      ? { salesCount: "desc" }
      : { createdAt: "desc" };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        seller: { select: { sellerId: true, storeName: true } },
        variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
      },
      orderBy,
      take: limit,
      skip,
    }),
    db.product.count({ where }),
  ]);

  if (products.length === 0) {
    const suggestion = q ? buildDidYouMeanQuery(q) : null;
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="text-6xl mb-4 select-none">🔍</div>
        <h3 className="text-[18px] font-semibold text-foreground mb-2">
          No products found{q ? ` for "${q}"` : ""}
        </h3>
        {suggestion ? (
          <p className="text-[14px] text-muted-foreground mb-6 max-w-sm">
            Did you mean{" "}
            <a
              href={`/search?q=${encodeURIComponent(suggestion)}`}
              className="font-semibold text-primary underline underline-offset-2 hover:no-underline"
            >
              &quot;{suggestion}&quot;
            </a>
            ?
          </p>
        ) : (
          <p className="text-[14px] text-muted-foreground mb-6 max-w-sm">
            Try different keywords or remove some filters to see more results.
          </p>
        )}
        <a
          href="/search"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-bold text-white hover:brightness-105 active:brightness-95 transition-all"
        >
          Clear all filters
        </a>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      {view === "list" ? (
        <div className="flex flex-col gap-3">
          {products.map((p) => (
            <ProductListCard
              key={p.id}
              id={p.id}
              productId={p.productId}
              name={p.name}
              price={p.price}
              comparePrice={p.comparePrice}
              image={p.images[0]}
              rating={p.rating}
              reviewCount={p.reviewCount}
              sellerId={p.seller.sellerId}
              sellerName={p.seller.storeName}
              stock={p.stock}
              isFeatured={p.isFeatured}
              deliveryInfo={p.deliveryInfo ?? undefined}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              productId={p.productId}
              name={p.name}
              description={p.description}
              price={p.price}
              comparePrice={p.comparePrice}
              image={p.images[0]}
              images={p.images}
              rating={p.rating}
              reviewCount={p.reviewCount}
              sellerId={p.seller.sellerId}
              sellerName={p.seller.storeName}
              stock={p.stock}
              isFeatured={p.isFeatured}
              deliveryInfo={p.deliveryInfo ?? undefined}
              condition={p.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"}
              variants={p.variants}
            />
          ))}
        </div>
      )}
      <div className="mt-10">
        <Pagination currentPage={pageNum} totalPages={Math.ceil(total / limit)} />
      </div>
    </div>
  );
}

// Re-export a helper to get total count for SortBar (used by search/page.tsx)
export async function getSearchTotal(searchParams: SearchParams): Promise<number> {
  const { q = "", category, featured, minPrice, maxPrice, rating, inStock } = searchParams;
  const where: Record<string, unknown> = { isActive: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { productId: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) where.category = { slug: category };
  if (featured === "true") where.isFeatured = true;
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
      ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}),
    };
  }
  if (rating) where.rating = { gte: parseInt(rating) };
  if (inStock === "true") where.stock = { gt: 0 };
  return db.product.count({ where });
}
