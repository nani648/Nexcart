"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice, formatDate } from "@/lib/utils";
import { ArrowLeft, Store, MapPin, Clock, Copy, Check, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface OrderDetail {
  id: string;
  orderId: string;
  status: string;
  deliveryStatus: string | null;
  deliveryMethod: string | null;
  pickupCode: string | null;
  pickupPayment: string | null;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: { productId: string; name: string; images: string[] };
    seller: { storeName: string; sellerId: string; storeAddress: string | null; pickupHours: string | null };
  }>;
}

const PICKUP_STEPS = [
  { key: "ORDER_PLACED", label: "Order Placed" },
  { key: "PACKED", label: "Being Packed" },
  { key: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { key: "PICKED_UP", label: "Picked Up" },
];

function pickupStepIndex(deliveryStatus: string | null): number {
  if (deliveryStatus === "PICKED_UP") return 3;
  if (deliveryStatus === "READY_FOR_PICKUP") return 2;
  if (deliveryStatus === "PACKED") return 1;
  return 0;
}

export default function CustomerPickupPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/sign-in");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !orderId) return;
    fetch(`/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${user.uid}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && data.deliveryMethod === "PICKUP") setOrder(data);
      })
      .finally(() => setFetching(false));
  }, [user, orderId]);

  const copyCode = () => {
    if (!order?.pickupCode) return;
    navigator.clipboard.writeText(order.pickupCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Pickup code copied!");
    });
  };

  if (authLoading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !order) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h2 className="mt-4 font-medium">Pickup order not found</h2>
          <Link href="/orders" className="mt-4 inline-block text-sm underline underline-offset-4">
            Back to Orders
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const stepIndex = pickupStepIndex(order.deliveryStatus);
  const seller = order.items[0]?.seller;
  const isCompleted = order.deliveryStatus === "PICKED_UP";

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-5">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <Link href="/orders" className="rounded-lg border border-border/50 p-2 hover:bg-muted/30">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Pickup Order #{order.orderId.slice(-8).toUpperCase()}</h1>
            <p className="text-xs text-muted-foreground">{formatDate(new Date(order.createdAt))}</p>
          </div>
        </div>

        {/* Completed banner */}
        {isCompleted && (
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Order collected! Thank you for shopping.</p>
          </div>
        )}

        {/* Pickup code card */}
        {order.pickupCode && !isCompleted && (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 text-center space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Pickup Code</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-bold tracking-[0.15em] text-primary">{order.pickupCode}</span>
              <button
                onClick={copyCode}
                className="rounded-lg border border-primary/30 p-2 text-primary hover:bg-primary/10 transition-colors"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Show this code at the store when collecting your order</p>
          </div>
        )}

        {/* Progress steps */}
        <div className="rounded-xl border border-border/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold">Order Status</h2>
          <div className="space-y-3">
            {PICKUP_STEPS.map((step, i) => {
              const done = i <= stepIndex;
              const current = i === stepIndex;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    done
                      ? current && !isCompleted
                        ? "bg-primary text-white shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]"
                        : "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {done && !current ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={`text-sm ${done ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                  {current && !isCompleted && (
                    <span className="ml-auto text-xs text-primary font-medium">Current</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Store info */}
        {seller && (
          <div className="rounded-xl border border-border/50 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">{seller.storeName}</h2>
            </div>
            {seller.storeAddress && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{seller.storeAddress}</span>
              </div>
            )}
            {seller.pickupHours && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{seller.pickupHours}</span>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div className="rounded-xl border border-border/50 divide-y divide-border/40">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-3 p-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image src={item.product.images?.[0] || "/placeholder.jpg"} alt={item.product.name} fill className="object-cover" sizes="56px" />
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <Link href={`/product/${item.product.productId}`} className="text-sm font-medium hover:underline">
                  {item.product.name}
                </Link>
                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                <p className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p>
              </div>
            </div>
          ))}
          <div className="px-4 py-3 flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>

        <div className={`rounded-xl border px-4 py-3 text-center text-xs font-medium ${
          order.pickupPayment === "ONLINE"
            ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-900/10 dark:text-blue-400"
            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-400"
        }`}>
          {order.pickupPayment === "ONLINE"
            ? "💳 Already paid online — just collect your items at the store"
            : "💵 Pay cash at the store when collecting your order"}
        </div>
      </main>
      <Footer />
    </>
  );
}
