"use client";

import { useState, useRef, useEffect } from "react";
import { ShoppingCart, Heart, Minus, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore, useWishlistStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Variant {
  id: string;
  name: string;
  value: string;
  stock: number;
  price?: number | null;
}

interface Props {
  productId: string;
  productName: string;
  productImage: string;
  sellerId: string;
  sellerName: string;
  price: number;
  stock: number;
  variants: Variant[];
}

export function AddToCartButton({
  productId,
  productName,
  productImage,
  sellerId,
  sellerName,
  price,
  stock,
  variants,
}: Props) {
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  // "added" state resets after a short visual flash — no "loading" state needed
  const [added, setAdded] = useState(false);

  const [mounted, setMounted] = useState(false);
  const addToCart = useCartStore((s) => s.addItem);
  const { addItem: addToWishlist, removeItem: removeFromWishlist, hasItem } = useWishlistStore();
  const isWishlisted = mounted ? hasItem(productId) : false;

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const effectiveStock = selectedVariant ? selectedVariant.stock : stock;
  const effectivePrice = selectedVariant?.price ?? price;

  const handleAddToCart = () => {
    if (effectiveStock === 0 || added) return;

    // Haptic feedback on mobile
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }

    // ✅ OPTIMISTIC: Add to cart INSTANTLY — no delay
    addToCart({
      productId,
      productName,
      productImage,
      sellerId,
      sellerName,
      price: effectivePrice,
      quantity: qty,
      stock: effectiveStock,
      variantId: selectedVariant?.id,
      variantName: selectedVariant
        ? `${selectedVariant.name}: ${selectedVariant.value}`
        : undefined,
    });

    // Flash "Added!" immediately
    setAdded(true);
    resetTimerRef.current = setTimeout(() => setAdded(false), 1500);
  };

  const handleWishlist = () => {
    if (isWishlisted) {
      removeFromWishlist(productId);
      toast.success("Removed from wishlist");
    } else {
      addToWishlist({ productId, productName, productImage, price: effectivePrice, sellerId });
      toast.success("Added to wishlist");
    }
  };

  // Group variants by name
  const variantGroups = variants.reduce<Record<string, Variant[]>>((acc, v) => {
    if (!acc[v.name]) acc[v.name] = [];
    acc[v.name].push(v);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Variants */}
      {Object.entries(variantGroups).map(([name, options]) => (
        <div key={name}>
          <div className="mb-2 text-sm font-medium">{name}</div>
          <div className="flex flex-wrap gap-2">
            {options.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors min-h-[44px]",
                  selectedVariant?.id === v.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/40",
                  v.stock === 0 && "cursor-not-allowed opacity-40 line-through"
                )}
                disabled={v.stock === 0}
              >
                {v.value}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Quantity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border border-border">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-medium">{qty}</span>
          <button
            onClick={() => setQty(Math.min(effectiveStock, qty + 1))}
            className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground min-h-[44px]"
            disabled={qty >= effectiveStock}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {effectiveStock} available
        </span>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <Button
          className={cn(
            "btn-bounce flex-1 gap-2 transition-all duration-150",
            added && "bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
          )}
          onClick={handleAddToCart}
          disabled={effectiveStock === 0}
          size="lg"
        >
          {added ? (
            <>
              <Check className="h-4 w-4" />
              Added!
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              {effectiveStock === 0 ? "Out of Stock" : "Add to Cart"}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={handleWishlist}
          className="btn-bounce min-h-[44px]"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isWishlisted ? "fill-red-500 text-red-500" : ""
            )}
          />
        </Button>
      </div>
    </div>
  );
}
