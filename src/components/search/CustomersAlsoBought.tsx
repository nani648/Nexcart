"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface RelatedProduct {
  id: string;
  productId: string;
  name: string;
  price: number;
  comparePrice?: number;
  images: string[];
  rating: number;
  reviewCount: number;
  salesCount: number;
  seller: {
    storeName: string;
    isVerified: boolean;
  };
}

interface CustomersAlsoBoughtProps {
  productId: string;
  className?: string;
}

export function CustomersAlsoBought({
  productId,
  className,
}: CustomersAlsoBoughtProps) {
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/products/${productId}/customers-also-bought`
        );
        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error("Error fetching related products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchRelatedProducts();
    }
  }, [productId]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Customers Also Bought
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Customers Also Bought
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  {product.comparePrice && product.comparePrice > product.price && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      Sale
                    </div>
                  )}
                </div>

                {/* Product info */}
                <div className="space-y-1">
                  <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>

                  {/* Seller name */}
                  <p className="text-xs text-muted-foreground truncate">
                    {product.seller.storeName}
                    {product.seller.isVerified && " ✓"}
                  </p>

                  {/* Price */}
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">
                      ₹{product.price.toFixed(0)}
                    </p>
                    {product.comparePrice && product.comparePrice > product.price && (
                      <p className="text-xs line-through text-muted-foreground">
                        ₹{product.comparePrice.toFixed(0)}
                      </p>
                    )}
                  </div>

                  {/* Rating and sales */}
                  <div className="flex items-center justify-between text-xs">
                    {product.rating > 0 && (
                      <span className="text-muted-foreground">
                        ★ {product.rating.toFixed(1)} ({product.reviewCount})
                      </span>
                    )}
                    {product.salesCount > 0 && (
                      <span className="text-green-600 font-medium">
                        {product.salesCount}+ sold
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {products.length >= 8 && (
          <Button
            asChild
            variant="outline"
            className="w-full"
          >
            <Link href={`/search?category=${products[0].id}`} className="flex items-center justify-center gap-2">
              View More <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
