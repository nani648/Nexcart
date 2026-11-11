"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingCart, Heart, Lock, Tag } from "lucide-react";
import { useCartStore, useWishlistStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

function getDeliveryDate(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore();
  const { items: wishlistItems, removeItem: removeWishlist, addItem: addToCart } = useWishlistStore();
  const [saved, setSaved]       = useState<string[]>([]);
  const [mounted, setMounted]   = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  useEffect(() => {
    setMounted(true);
    setDeliveryDate(getDeliveryDate(2));
  }, []);
  const router = useRouter();

  const activeItems = items.filter(i => !saved.includes(`${i.productId}-${i.variantId ?? ""}`));
  const savedItems = items.filter(i => saved.includes(`${i.productId}-${i.variantId ?? ""}`));

  const subtotal = activeItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const mrpTotal = activeItems.reduce((acc, i) => acc + (i.price * 1.15) * i.quantity, 0);
  const discount = mrpTotal - subtotal;
  const platformFee = 20;
  const total = subtotal + platformFee;
  const totalItems = activeItems.reduce((acc, i) => acc + i.quantity, 0);

  const saveForLater = (productId: string, variantId?: string) => {
    setSaved(prev => [...prev, `${productId}-${variantId ?? ""}`]);
  };

  const moveToCart = (productId: string, variantId?: string) => {
    setSaved(prev => prev.filter(k => k !== `${productId}-${variantId ?? ""}`));
  };

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-border/60 bg-muted/30">
              <ShoppingCart className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <h2 className="text-[22px] font-semibold">Your cart is empty</h2>
            <p className="mt-2 text-[14px] text-muted-foreground">Add items to get started</p>
            <Link href="/search" className="mt-6 inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-8 text-sm font-bold text-white hover:bg-primary/90 transition-colors">
              Continue Shopping
            </Link>
          </div>

          {wishlistItems.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-4 text-lg font-bold">Your Wishlist Items</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {wishlistItems.map(wi => (
                  <div key={wi.productId} className="w-[160px] shrink-0 rounded-[10px] border border-border/50 p-3">
                    <div className="relative mb-2 h-24 w-full overflow-hidden rounded-lg bg-muted">
                      <Image src={wi.productImage} alt={wi.productName} fill className="object-cover" sizes="160px" />
                    </div>
                    <p className="line-clamp-2 text-[12px] font-medium">{wi.productName}</p>
                    <p className="mt-1 text-[13px] font-bold">{formatPrice(wi.price)}</p>
                    <Link href={`/product/${wi.productId}`} className="mt-2 block rounded-lg bg-primary py-1.5 text-center text-[11px] font-bold text-white">
                      Add to Cart
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[hsl(214_32%_97%)] dark:bg-[hsl(220_17%_6%)] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3 lg:hidden mb-4">
            <ShoppingCart className="h-5 w-5" />
            <h1 className="text-lg font-bold">My Cart ({totalItems} {totalItems === 1 ? "item" : "items"})</h1>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            {/* LEFT COLUMN */}
            <div className="flex-1 space-y-3">
              {/* Heading desktop */}
              <div className="hidden lg:flex items-center justify-between rounded-[10px] bg-white dark:bg-[hsl(220_17%_10%)] border border-border/40 px-5 py-4">
                <h1 className="text-xl font-semibold">My Cart ({totalItems} {totalItems === 1 ? "item" : "items"})</h1>
                <span className="text-[13px] text-muted-foreground">{activeItems.length} seller{activeItems.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Active cart items */}
              {activeItems.map(item => {
                const mrp = Math.round(item.price * 1.15);
                const discountPct = Math.round(((mrp - item.price) / mrp) * 100);
                return (
                  <div key={`${item.productId}-${item.variantId ?? ""}`} className="rounded-[10px] bg-white dark:bg-[hsl(220_17%_10%)] border border-border/40 p-4">
                    <div className="flex gap-4">
                      {/* Image */}
                      <Link href={`/product/${item.productId}`} className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image src={item.productImage || "/placeholder.jpg"} alt={item.productName} fill className="object-cover" sizes="96px" />
                      </Link>

                      {/* Details */}
                      <div className="flex flex-1 flex-col gap-1 min-w-0">
                        <p className="text-[11px] text-muted-foreground">{item.sellerName}</p>
                        <Link href={`/product/${item.productId}`} className="line-clamp-2 text-[14px] font-medium leading-snug hover:text-primary">
                          {item.productName}
                        </Link>
                        {item.variantName && <p className="text-[12px] text-muted-foreground">Variant: {item.variantName}</p>}

                        {/* Price row */}
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-[16px] font-semibold">{formatPrice(item.price)}</span>
                          <span className="text-[12px] text-muted-foreground line-through">{formatPrice(mrp)}</span>
                          <span className="text-[12px] font-bold text-emerald-600">{discountPct}% off</span>
                        </div>

                        {/* Delivery */}
                        <p className="text-[12px] font-medium text-emerald-600">
                          Free delivery by {deliveryDate || "—"}
                        </p>

                        {/* Actions row */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-0 gap-y-1 text-[13px] font-medium">
                          <button onClick={() => saveForLater(item.productId, item.variantId)} className="py-1 pr-3 text-primary hover:underline min-h-[36px]">
                            Save for Later
                          </button>
                          <span className="text-border hidden sm:inline">|</span>
                          <button onClick={() => removeItem(item.productId, item.variantId)} className="py-1 px-3 text-red-500 hover:underline min-h-[36px]">
                            Remove
                          </button>
                          <span className="text-border hidden sm:inline">|</span>
                          <Link href={`/product/${item.productId}`} className="py-1 sm:pl-3 text-primary hover:underline min-h-[36px]">
                            Buy this now
                          </Link>
                        </div>

                        {/* Quantity stepper */}
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex items-center rounded-lg border border-border/60 overflow-hidden">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                              className="qty-btn flex h-10 w-10 items-center justify-center text-muted-foreground hover:bg-muted transition-colors font-bold text-lg"
                            >
                              −
                            </button>
                            <span className="w-10 text-center text-[14px] font-semibold tabular-nums">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                              disabled={item.quantity >= item.stock}
                              className="qty-btn flex h-10 w-10 items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 font-bold text-lg"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Saved for Later */}
              {savedItems.length > 0 && (
                <div className="rounded-[10px] bg-white dark:bg-[hsl(220_17%_10%)] border border-border/40">
                  <div className="border-b border-border/40 px-5 py-3">
                    <h2 className="text-[14px] font-semibold">Saved for Later ({savedItems.length} {savedItems.length === 1 ? "item" : "items"})</h2>
                  </div>
                  <div className="space-y-0 divide-y divide-border/30">
                    {savedItems.map(item => {
                      const mrp = Math.round(item.price * 1.15);
                      const discountPct = Math.round(((mrp - item.price) / mrp) * 100);
                      return (
                        <div key={`${item.productId}-${item.variantId ?? ""}`} className="flex gap-4 p-4">
                          <Link href={`/product/${item.productId}`} className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <Image src={item.productImage || "/placeholder.jpg"} alt={item.productName} fill className="object-cover" sizes="96px" />
                          </Link>
                          <div className="flex flex-1 flex-col gap-1 min-w-0">
                            <p className="text-[11px] text-muted-foreground">{item.sellerName}</p>
                            <p className="line-clamp-2 text-[14px] font-medium">{item.productName}</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-[15px] font-semibold">{formatPrice(item.price)}</span>
                              <span className="text-[12px] text-muted-foreground line-through">{formatPrice(mrp)}</span>
                              <span className="text-[12px] font-bold text-emerald-600">{discountPct}% off</span>
                            </div>
                            <div className="mt-2 flex items-center gap-0 text-[13px] font-medium">
                              <button onClick={() => moveToCart(item.productId, item.variantId)} className="pr-3 text-primary hover:underline">
                                Move to Cart
                              </button>
                              <span className="text-border">|</span>
                              <button onClick={() => removeItem(item.productId, item.variantId)} className="pl-3 text-red-500 hover:underline">
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN — Price Details */}
            <div className="lg:w-[340px] lg:shrink-0">
              <div className="sticky top-24 space-y-3">
                <div className="rounded-[10px] bg-white dark:bg-[hsl(220_17%_10%)] border border-border/40 p-5">
                  {/* Heading */}
                  <p className="border-b border-border/40 pb-3 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Price Details ({totalItems} {totalItems === 1 ? "Item" : "Items"})
                  </p>

                  {/* Price rows */}
                  <div className="mt-3 space-y-2.5">
                    <div className="flex justify-between text-[14px]">
                      <span>Price ({totalItems} {totalItems === 1 ? "item" : "items"})</span>
                      <span>{formatPrice(mrpTotal)}</span>
                    </div>
                    <div className="flex justify-between text-[14px]">
                      <span>Discount</span>
                      <span className="font-semibold text-emerald-600">− {formatPrice(discount)}</span>
                    </div>
                    <div className="flex justify-between text-[14px]">
                      <span>Delivery Charges</span>
                      <span className="font-semibold text-emerald-600">
                        <span className="mr-1 text-muted-foreground line-through text-[12px]">₹99</span>FREE
                      </span>
                    </div>
                    <div className="flex justify-between text-[14px]">
                      <span>Platform Fee</span>
                      <span>₹{platformFee}</span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="my-3 border-t border-border/40 pt-3">
                    <div className="flex justify-between">
                      <span className="text-[15px] font-semibold">Total Amount</span>
                      <span className="text-[18px] font-semibold">{formatPrice(total)}</span>
                    </div>
                  </div>

                  {/* Savings badge */}
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 p-2.5 text-center">
                    <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
                      You will save {formatPrice(discount)} on this order
                    </p>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => router.push("/checkout")}
                    className="mt-4 w-full rounded-[10px] bg-primary py-3 text-[15px] font-semibold text-white hover:bg-primary/90 transition-colors h-12"
                  >
                    PLACE ORDER
                  </button>

                  {/* Trust text */}
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <p className="text-[11px] text-muted-foreground text-center">
                      Safe and Secure Payments. Easy returns. 100% Authentic products.
                    </p>
                  </div>
                </div>

                {/* Coupon nudge */}
                <div className="flex items-center gap-3 rounded-[10px] border border-border/40 bg-white dark:bg-[hsl(220_17%_10%)] px-4 py-3">
                  <Tag className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-[13px] font-medium">Apply coupon at checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
