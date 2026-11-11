"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Trash2, ShoppingCart, ChevronRight } from "lucide-react";
import { useWishlistStore, useCartStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { toast } from "sonner";

export default function WishlistPage() {
  const { items, removeItem } = useWishlistStore();
  const addToCart = useCartStore((s) => s.addItem);

  const handleMoveToCart = (item: (typeof items)[0]) => {
    addToCart({
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      sellerId: item.sellerId,
      sellerName: "",
      price: item.price,
      quantity: 1,
      stock: 99,
    });
    removeItem(item.productId);
    toast.success("Moved to cart");
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 pb-24 md:pb-8">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Wishlist</h1>
            {items.length > 0 && (
              <p className="text-[13px] text-muted-foreground mt-0.5">{items.length} saved item{items.length !== 1 ? "s" : ""}</p>
            )}
          </div>
          {items.length > 0 && (
            <Link href="/search" className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors">
              Continue shopping
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 rounded-[10px] border border-border/60 bg-white dark:bg-card py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-muted/30">
              <Heart className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold">Nothing saved yet</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">Tap the heart on any product to save it here</p>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-primary px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Browse Products <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex gap-4 rounded-[10px] border border-border/60 bg-white dark:bg-card p-4 transition-all hover:border-border"
              >
                <Link
                  href={`/product/${item.productId}`}
                  className="relative h-[72px] w-[60px] shrink-0 overflow-hidden rounded-[8px] border border-border/50 bg-muted/30"
                >
                  <Image
                    src={item.productImage}
                    alt={item.productName}
                    fill
                    className="object-cover"
                    sizes="60px"
                  />
                </Link>
                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <Link
                    href={`/product/${item.productId}`}
                    className="line-clamp-2 text-[13px] font-medium text-foreground hover:text-primary transition-colors leading-snug"
                  >
                    {item.productName}
                  </Link>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[15px] font-semibold tabular-nums">{formatPrice(item.price)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMoveToCart(item)}
                        className="flex items-center gap-1.5 rounded-[8px] bg-primary/8 px-3 py-1.5 text-[12px] font-semibold text-primary hover:bg-primary/15 transition-colors"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Add to Cart
                      </button>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground/50 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
