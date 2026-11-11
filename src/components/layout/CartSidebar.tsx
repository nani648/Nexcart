"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ShoppingCart, Trash2, Plus, Minus, Package2, CheckCircle2 } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";

// Mini toast inside the sidebar
function SidebarToast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className={`
        absolute top-14 left-0 right-0 z-50 mx-4 mt-1
        flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg
        transition-all duration-300
        ${visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"}
      `}
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

export function CartSidebar() {
  const { items, removeItem, updateQuantity, getTotalItems, getTotalPrice } = useCartStore();
  const n = getTotalItems();
  const total = getTotalPrice();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsVisible(true);
    window.addEventListener("nxc:opencart", handleOpen);
    return () => window.removeEventListener("nxc:opencart", handleOpen);
  }, []);

  const close = useCallback(() => setIsVisible(false), []);

  // Track previous item count to detect additions
  const prevCountRef = useRef(n);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("Item added to cart!");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track which items are being removed for fade-out animation
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());

  // Show mini toast when item is added
  useEffect(() => {
    if (n > prevCountRef.current && isVisible) {
      setToastMsg("Item added to cart!");
      setToastVisible(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToastVisible(false), 1500);
    }
    prevCountRef.current = n;
  }, [n, isVisible]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    if (isVisible) {
      document.addEventListener("keydown", esc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [isVisible, close]);

  const handleRemove = (productId: string, variantId?: string) => {
    const key = `${productId}-${variantId ?? ""}`;
    setRemovingKeys(prev => new Set(prev).add(key));
    setTimeout(() => {
      removeItem(productId, variantId);
      setRemovingKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 150);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={close} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] transition-opacity" />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full sm:max-w-[390px] flex-col bg-white dark:bg-[hsl(220_17%_8%)] shadow-2xl border-l border-border/40 a-slr">

        {/* Mini toast */}
        <SidebarToast message={toastMsg} visible={toastVisible} />

        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 px-5">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="h-[18px] w-[18px] text-foreground/60" />
            <h2 className="text-[15px] font-semibold">
              Cart
              {n > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-[2px] text-[11px] font-semibold text-primary">
                  {n}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground tap-target"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[12px] border border-border/60 bg-muted/40">
                <Package2 className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold">Your cart is empty</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">Add items to get started</p>
              </div>
              <Link
                href="/search"
                onClick={close}
                className="rounded-[8px] bg-primary px-5 py-2 text-[13px] font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {items.map(item => {
                const key = `${item.productId}-${item.variantId ?? ""}`;
                const isRemoving = removingKeys.has(key);
                return (
                  <div
                    key={key}
                    className="flex gap-3 p-4 a-slr"
                    style={{
                      transition: isRemoving ? "opacity 0.12s ease, max-height 0.15s ease, padding 0.15s ease" : undefined,
                      opacity: isRemoving ? 0 : 1,
                      maxHeight: isRemoving ? 0 : 200,
                      overflow: "hidden",
                      paddingTop: isRemoving ? 0 : undefined,
                      paddingBottom: isRemoving ? 0 : undefined,
                    }}
                  >
                    {/* Image */}
                    <Link href={`/product/${item.productId}`} onClick={close}
                      className="relative h-[72px] w-[60px] shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted">
                      <Image
                        src={item.productImage || "/placeholder.jpg"}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="60px"
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <p className="text-[10px] text-muted-foreground">{item.sellerName}</p>
                        <Link href={`/product/${item.productId}`} onClick={close}
                          className="line-clamp-2 text-[13px] font-semibold leading-snug hover:text-primary transition-colors">
                          {item.productName}
                        </Link>
                        {item.variantName && (
                          <p className="text-[11px] text-muted-foreground">{item.variantName}</p>
                        )}
                      </div>

                      {/* Price + Controls */}
                      <div className="mt-2 flex items-center justify-between">
                        {/* Qty stepper */}
                        <div className="flex items-center overflow-hidden rounded-lg border border-border/60">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                            className="qty-btn flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-bold"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-9 text-center text-[14px] font-semibold tabular-nums">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                            disabled={item.quantity >= item.stock}
                            className="qty-btn flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-25 font-bold"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Price + Remove */}
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                          <button
                            onClick={() => handleRemove(item.productId, item.variantId)}
                            className="icon-btn flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="shrink-0 border-t border-border/50 p-4 space-y-3 bg-white dark:bg-[hsl(220_17%_8%)]">
            {/* Total row */}
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Total Amount</p>
                <p className="text-[18px] font-semibold">{formatPrice(total)}</p>
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold">FREE Delivery</p>
            </div>

            {/* CTA */}
            <Link
              href="/cart"
              onClick={close}
              className="flex w-full items-center justify-center rounded-[10px] bg-primary py-3 text-[14px] font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              View Cart &amp; Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

export default CartSidebar;
