"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface RecentProduct {
  id: string;
  productId: string;
  name: string;
  price: number;
  images: string[];
  rating: number;
}

interface RecentlyViewedProps {
  className?: string;
  maxItems?: number;
}

export function RecentlyViewedProducts({
  className,
  maxItems = 6,
}: RecentlyViewedProps) {
  const [products, setProducts] = useState<RecentProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRecentlyViewed = async () => {
      try {
        setIsLoading(true);
        const productIds = JSON.parse(
          localStorage.getItem("recentlyViewedProducts") || "[]"
        ) as string[];

        if (productIds.length === 0) {
          setProducts([]);
          return;
        }

        // Fetch product details
        const response = await fetch(
          `/api/products/recently-viewed?ids=${productIds.slice(0, maxItems).join(
            ","
          )}`
        );
        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error("Error loading recently viewed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentlyViewed();
  }, [maxItems]);

  if (isLoading || products.length === 0) return null;

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recently Viewed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.productId}`}
              className="group"
            >
              <div className="space-y-2">
                {/* Product image */}
                <div className="relative overflow-hidden rounded-lg bg-muted aspect-square">
                  {product.images[0] && (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                </div>

                {/* Product info */}
                <div className="space-y-1">
                  <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">₹{product.price.toFixed(0)}</p>
                    {product.rating > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ★ {product.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <Button
          asChild
          variant="ghost"
          className="w-full mt-4"
        >
          <Link href="/search" className="flex items-center justify-center gap-2">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// Hook to add a product to recently viewed
export function useAddToRecentlyViewed(productId: string) {
  useEffect(() => {
    const viewed = JSON.parse(
      localStorage.getItem("recentlyViewedProducts") || "[]"
    ) as string[];

    // Remove if already exists and add to front
    const updated = [
      productId,
      ...viewed.filter((id) => id !== productId),
    ].slice(0, 10); // Keep last 10

    localStorage.setItem("recentlyViewedProducts", JSON.stringify(updated));
  }, [productId]);
}
