"use client";

import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { ShieldCheck, Truck } from "lucide-react";
import type { CartItemLocal } from "@/types";

interface OrderSummaryProps {
  items: CartItemLocal[];
  couponDiscount?: number;
  couponCode?: string;
}

const TAX_RATE = 0.18;
const FREE_SHIPPING_THRESHOLD = 499;

export function OrderSummary({ items, couponDiscount = 0, couponCode }: OrderSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 49;
  const taxable = subtotal - couponDiscount;
  const tax = Math.round(taxable * TAX_RATE * 100) / 100;
  const total = taxable + shipping + tax;

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="font-semibold text-sm">Order Summary</h3>
      </div>

      {/* Items */}
      <div className="px-5 py-4 space-y-3 max-h-64 overflow-y-auto">
        {items.map((item) => (
          <div key={`${item.productId}-${item.variantId}`} className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted">
              {item.image && (
                <Image src={item.image} alt={item.name} fill className="object-cover" />
              )}
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              {item.variantId && (
                <p className="text-xs text-muted-foreground">Variant selected</p>
              )}
            </div>
            <span className="text-sm font-medium shrink-0">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <Separator />

      {/* Price breakdown */}
      <div className="px-5 py-4 space-y-2.5">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        {couponDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
            <span className="flex items-center gap-1.5">
              Coupon
              {couponCode && (
                <Badge variant="success" className="text-[10px] px-1.5 py-0">{couponCode}</Badge>
              )}
            </span>
            <span>− {formatPrice(couponDiscount)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            Shipping
          </span>
          <span className={shipping === 0 ? "text-green-600 dark:text-green-400" : ""}>
            {shipping === 0 ? "Free" : formatPrice(shipping)}
          </span>
        </div>

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Tax (18% GST)</span>
          <span>{formatPrice(tax)}</span>
        </div>

        {subtotal < FREE_SHIPPING_THRESHOLD && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            Add {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for free shipping
          </p>
        )}

        <Separator />

        <div className="flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      {/* Trust badges */}
      <div className="border-t border-border/50 px-5 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
          Secure checkout · 256-bit SSL encryption
        </div>
      </div>
    </div>
  );
}
