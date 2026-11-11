import { ProductCard } from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductCard as ProductCardType } from "@/types";

interface ProductGridProps {
  products: ProductCardType[];
  columns?: 2 | 3 | 4 | 5;
}

const colClasses = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
};

export function ProductGrid({ products, columns = 4 }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-lg font-semibold">No products found</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Try adjusting your search or filters to find what you&apos;re looking for.
        </p>
      </div>
    );
  }

  return (
    <div className={`grid ${colClasses[columns]} gap-4`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          productId={product.productId}
          name={product.name}
          description={product.description ?? undefined}
          price={product.price}
          comparePrice={product.comparePrice}
          image={product.images[0] || "/placeholder-product.jpg"}
          images={product.images}
          rating={product.rating}
          reviewCount={product.reviewCount}
          sellerId={product.seller.sellerId}
          sellerName={product.seller.storeName}
          stock={product.stock}
          isFeatured={product.isFeatured}
          deliveryInfo={product.deliveryInfo ?? undefined}
          condition={product.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"}
          variants={product.variants}
          cardDesign={product.cardDesign}
          cardFont={product.cardFont}
          cardDisplayText={product.cardDisplayText}
          cardBorderColor={product.cardBorderColor}
          cardImagePosition={product.cardImagePosition}
          cardImageAutoSlide={product.cardImageAutoSlide}
        />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, columns = 4 }: { count?: number; columns?: 2 | 3 | 4 | 5 }) {
  return (
    <div className={`grid ${colClasses[columns]} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 overflow-hidden">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
