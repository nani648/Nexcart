"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useCartStore, useWishlistStore } from "@/lib/store";
import { formatPrice, cn } from "@/lib/utils";

function calcDiscount(price: number, comparePrice?: number | null): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

interface ProductListCardProps {
  id: string;
  productId: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  image: string;
  rating: number;
  reviewCount: number;
  sellerId: string;
  sellerName: string;
  stock: number;
  isFeatured?: boolean;
  isNew?: boolean;
  isAssured?: boolean;
  deliveryDate?: string;
  deliveryInfo?: string;
  bankOffer?: string;
  className?: string;
}

export function ProductListCard({
  id, productId, name, price, comparePrice, image,
  rating, reviewCount, sellerId, sellerName, stock,
  deliveryDate, deliveryInfo, className,
}: ProductListCardProps) {
  const [loaded, setLoaded]   = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const addToCart = useCartStore((s) => s.addItem);
  const closeCart = useCartStore((s) => s.closeCart);
  const { addItem: addWish, removeItem: rmWish, hasItem } = useWishlistStore();
  const wishlisted = mounted && hasItem(id);
  const disc = calcDiscount(price, comparePrice);

  const onCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stock) return;
    addToCart({ productId: id, productName: name, productImage: image, sellerId, sellerName, price, quantity: 1, stock });
    closeCart();
    toast.success("Added to cart");
  };

  const onWish = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlisted) rmWish(id);
    else addWish({ productId: id, productName: name, productImage: image, price, sellerId });
    toast(wishlisted ? "Removed from wishlist" : "Saved to wishlist");
  };

  return (
    <Link
      href={`/product/${productId}`}
      className={cn(
        "group flex w-full rounded-2xl bg-white dark:bg-card overflow-hidden",
        "border border-slate-100 dark:border-border/30",
        "transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.09)] hover:-translate-y-0.5",
        className
      )}
    >
      {/* Image */}
      <div className="relative shrink-0 bg-slate-50 dark:bg-muted/20" style={{ width: 180, minWidth: 180, overflow: "hidden" }}>
        {!loaded && <div className="absolute inset-0 bg-slate-100 dark:bg-muted animate-pulse" />}
        <Image
          src={image || "/placeholder-product.jpg"}
          alt={name}
          fill
          sizes="180px"
          className={cn("object-cover transition-transform duration-500 group-hover:scale-[1.04]", loaded ? "opacity-100" : "opacity-0")}
          onLoad={() => setLoaded(true)}
        />
        {disc > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            -{disc}%
          </span>
        )}
        {!stock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/50 z-10">
            <span className="rounded-lg bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold text-white">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 min-w-0">
        <p className="mb-0.5 text-[11px] font-medium text-slate-400 truncate">{sellerName}</p>

        <h3 className="mb-2 text-[15px] font-medium text-slate-800 dark:text-foreground leading-snug group-hover:text-slate-900 dark:group-hover:text-white transition-colors line-clamp-2">
          {name}
        </h3>

        {reviewCount > 0 && (
          <div className="mb-2 flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">{rating.toFixed(1)}</span>
              <Star className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
            </div>
            <span className="text-[11px] text-slate-400">({reviewCount.toLocaleString("en-IN")})</span>
          </div>
        )}

        <div className="mb-1.5 flex items-baseline gap-2 flex-wrap">
          <span className="text-[18px] font-bold tabular-nums text-slate-900 dark:text-foreground">{formatPrice(price)}</span>
          {comparePrice && comparePrice > price && (
            <span className="text-[13px] text-slate-400 line-through tabular-nums">{formatPrice(comparePrice)}</span>
          )}
          {disc >= 5 && (
            <span className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">{disc}% off</span>
          )}
        </div>

        {(!stock || deliveryDate || deliveryInfo) && (
          <p className="mb-3 text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
            {!stock ? <span className="text-red-500">Out of Stock</span>
              : deliveryDate ? `Delivery by ${deliveryDate}`
              : deliveryInfo}
          </p>
        )}

        <div className="mt-auto flex items-center gap-2">
          {stock > 0 ? (
            <button
              onClick={onCart}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </button>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toast("We'll notify you when available"); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-[12px] font-semibold text-slate-600 dark:text-muted-foreground hover:bg-muted transition-colors"
            >
              Notify Me
            </button>
          )}
          <button
            onClick={onWish}
            aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-border bg-white dark:bg-card",
              "hover:border-red-300 transition-all duration-200"
            )}
          >
            <Heart className={cn("h-4 w-4", wishlisted ? "fill-red-500 text-red-500" : "text-slate-400 hover:text-red-400")} />
          </button>
        </div>
      </div>
    </Link>
  );
}
