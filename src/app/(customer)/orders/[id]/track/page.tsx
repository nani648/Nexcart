"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  DeliveryTimeline,
  CourierTimeline,
  CourierBadge,
  CourierStatusBadge,
  LiveLocationDot,
  type DeliveryStatus,
  type CourierTrackingData,
} from "@/components/delivery/DeliveryTimeline";
import {
  ArrowLeft, Loader2, Package, Truck, MapPin, Phone,
  Clock, CheckCircle2, Navigation2, RefreshCw, Download,
  Copy, ExternalLink,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TrackingData {
  orderId: string;
  status: string;
  deliveryMethod: "SELF" | "COURIER" | null;
  deliveryStatus: DeliveryStatus;
  trackingId: string | null;
  courierName: string | null;
  shippingLabel: string | null;
  estimatedDelivery: string | null;
  estimatedArrival: string | null;
  selfDeliveryEnabled: boolean;
  sellerLatitude: number | null;
  sellerLongitude: number | null;
  mapsRoute: string | null;
  createdAt: string;
  updatedAt: string;
  address: {
    name: string; line1: string; line2?: string;
    city: string; state: string; pincode: string;
  } | null;
  seller: { storeName: string; phone: string | null } | null;
  items: Array<{ name: string; image: string | null; quantity: number; price: number }>;
  courierTracking: CourierTrackingData | null;
}

const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  PREPARING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  DELIVERED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: "Order Placed",
  PREPARING: "Preparing Package",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  FAILED: "Delivery Failed",
};

export default function OrderTrackingPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [data, setData] = useState<TrackingData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (!authLoading && !user) router.replace("/sign-in");
  }, [user, authLoading, router]);

  const fetchTracking = useCallback(async (silent = false) => {
    if (!user || !orderId) return;
    if (!silent) setFetching(true); else setRefreshing(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/tracking`, {
        headers: { Authorization: `Bearer ${user.uid}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdated(new Date());
      }
    } finally {
      setFetching(false);
      setRefreshing(false);
    }
  }, [user, orderId]);

  useEffect(() => { fetchTracking(); }, [fetchTracking]);

  // Poll every 30s when out for delivery
  useEffect(() => {
    if (data?.deliveryStatus !== "OUT_FOR_DELIVERY") return;
    const interval = setInterval(() => fetchTracking(true), 30000);
    return () => clearInterval(interval);
  }, [data?.deliveryStatus, fetchTracking]);

  const copyTracking = () => {
    if (!data?.trackingId) return;
    navigator.clipboard.writeText(data.trackingId).then(() =>
      toast.success("Tracking ID copied!")
    );
  };

  // Build Google Maps route URL for customer
  const mapsRouteUrl = (() => {
    if (!data?.address) return null;
    const dest = encodeURIComponent(
      `${data.address.line1}, ${data.address.city}, ${data.address.state} ${data.address.pincode}`
    );
    if (data.sellerLatitude && data.sellerLongitude) {
      return `https://www.google.com/maps/dir/?api=1&origin=${data.sellerLatitude},${data.sellerLongitude}&destination=${dest}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  })();

  const deliveryAddressStr = data?.address
    ? `${data.address.line1}, ${data.address.city}, ${data.address.state} ${data.address.pincode}`
    : null;

  if (authLoading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;

  if (!data) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h2 className="mt-4 font-medium">Order not found</h2>
          <Link href="/orders" className="mt-4 inline-block text-sm underline underline-offset-4">Back to Orders</Link>
        </main>
        <Footer />
      </>
    );
  }

  const isDelivered = data.deliveryStatus === "DELIVERED";
  const isOutForDelivery = data.deliveryStatus === "OUT_FOR_DELIVERY";
  const isCourier = data.deliveryMethod === "COURIER";
  const isSelf = data.deliveryMethod === "SELF";
  const hasLiveLocation = !!(data.sellerLatitude && data.sellerLongitude);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8 sm:px-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/orders" className="rounded-lg border border-border/50 p-2 hover:bg-muted/30 transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold">Track Order</h1>
            <p className="text-xs text-muted-foreground">#{data.orderId.slice(-8).toUpperCase()}</p>
          </div>
          <button
            onClick={() => fetchTracking(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-2 text-xs font-medium hover:bg-muted/30 transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Delivered banner */}
        {isDelivered && (
          <div className="rounded-2xl bg-green-500 p-4 text-white flex items-center gap-3">
            <CheckCircle2 className="h-10 w-10 shrink-0" />
            <div>
              <p className="font-semibold">Order Delivered!</p>
              <p className="text-sm text-green-100">Your order was delivered successfully.</p>
            </div>
          </div>
        )}

        {/* Out for delivery banner (self) */}
        {isOutForDelivery && isSelf && (
          <div className="rounded-2xl bg-orange-500 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Your order is on the way!</p>
                  {hasLiveLocation && (
                    <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5">
                      <LiveLocationDot active /> Live
                    </span>
                  )}
                </div>
                {data.estimatedArrival && (
                  <p className="text-sm text-orange-100">
                    Arriving by {new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(data.estimatedArrival))}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              {data.seller?.phone && (
                <a
                  href={`tel:${data.seller.phone}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2.5 text-sm font-medium transition-all"
                >
                  <Phone className="h-4 w-4" /> Call Seller
                </a>
              )}
              {mapsRouteUrl && (
                <a
                  href={mapsRouteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 px-4 py-2.5 text-sm font-medium transition-all"
                >
                  <Navigation2 className="h-4 w-4" />
                  {hasLiveLocation ? "Live Route" : "View on Map"}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Status card */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              {isCourier
                ? <Package className="h-4 w-4 text-purple-500" />
                : <Truck className="h-4 w-4 text-blue-500" />}
              <span className="text-sm font-medium">
                {isCourier ? (data.courierName ?? "Courier Delivery") : "Self Delivery"}
              </span>
              {isSelf && isOutForDelivery && hasLiveLocation && (
                <LiveLocationDot active />
              )}
            </div>
            <span className={cn("rounded-full px-3 py-0.5 text-xs font-medium", DELIVERY_STATUS_COLORS[data.deliveryStatus])}>
              {DELIVERY_STATUS_LABELS[data.deliveryStatus]}
            </span>
          </div>

          {/* Tracking ID (courier) */}
          {isCourier && data.trackingId && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 bg-muted/20">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tracking ID</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{data.trackingId}</span>
                  <button onClick={copyTracking} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {data.courierName && <CourierBadge courierName={data.courierName} />}
            </div>
          )}

          {/* Estimated delivery (courier) */}
          {isCourier && data.estimatedDelivery && (
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border/30">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Estimated delivery:{" "}
                <span className="font-medium text-foreground">
                  {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(data.estimatedDelivery))}
                </span>
              </span>
            </div>
          )}

          {/* Seller */}
          {data.seller && (
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
              <div>
                <p className="text-xs text-muted-foreground">Seller</p>
                <p className="text-sm font-medium">{data.seller.storeName}</p>
              </div>
              {data.seller.phone && (
                <a
                  href={`tel:${data.seller.phone}`}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-muted/30 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
              )}
            </div>
          )}

          {/* ETA (self delivery out for delivery) */}
          {data.estimatedArrival && isOutForDelivery && isSelf && (
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border/30 bg-orange-50/50 dark:bg-orange-900/10">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                ETA: {new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, day: "numeric", month: "short" }).format(new Date(data.estimatedArrival))}
              </span>
              {hasLiveLocation && mapsRouteUrl && (
                <a
                  href={mapsRouteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium"
                >
                  <Navigation2 className="h-3.5 w-3.5" /> Live Route
                </a>
              )}
            </div>
          )}

          {/* Shipping label (courier) */}
          {isCourier && data.shippingLabel && (
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                Shipping label available
              </div>
              <a
                href={data.shippingLabel}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/30 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            </div>
          )}

          {/* Last updated */}
          <div className="px-5 py-2 bg-muted/10 flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Updated: {new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(lastUpdated)}
              {data.deliveryStatus === "OUT_FOR_DELIVERY" && " · Auto-refreshing every 30s"}
            </p>
            {isSelf && isOutForDelivery && hasLiveLocation && (
              <span className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 font-medium">
                <LiveLocationDot active /> Seller sharing live location
              </span>
            )}
          </div>
        </div>

        {/* Courier Live Tracking */}
        {isCourier && (
          <div className="rounded-2xl border border-border/60 bg-card px-5 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Live Courier Tracking</h2>
              {data.courierTracking && (
                <CourierStatusBadge
                  statusId={data.courierTracking.current_status_id}
                  statusLabel={data.courierTracking.current_status}
                />
              )}
            </div>
            <CourierTimeline
              trackingData={data.courierTracking}
              loading={false}
              error={null}
            />
          </div>
        )}

        {/* Self-delivery Timeline */}
        {isSelf && (
          <div className="rounded-2xl border border-border/60 bg-card px-5 py-5">
            <h2 className="text-sm font-semibold mb-4">Delivery Timeline</h2>
            <DeliveryTimeline
              deliveryStatus={data.deliveryStatus}
              updatedAt={data.updatedAt}
              estimatedArrival={data.estimatedArrival}
              sellerLatitude={data.sellerLatitude}
              sellerLongitude={data.sellerLongitude}
              deliveryAddress={deliveryAddressStr}
            />
          </div>
        )}

        {/* No method yet */}
        {!data.deliveryMethod && (
          <div className="rounded-2xl border border-border/60 bg-card px-5 py-5 text-center space-y-2">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium">Waiting for seller to arrange delivery</p>
            <p className="text-xs text-muted-foreground">You&apos;ll get live tracking once shipping is confirmed.</p>
          </div>
        )}

        {/* Items */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/30">
            <h2 className="text-sm font-semibold">Items in this order</h2>
          </div>
          {data.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 px-5 py-3 border-b border-border/30 last:border-0">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold shrink-0">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>

        {/* Address */}
        {data.address && (
          <div className="rounded-2xl border border-border/60 bg-card px-5 py-4 space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Delivery Address</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {data.address.name}, {data.address.line1}
              {data.address.line2 ? `, ${data.address.line2}` : ""},{" "}
              {data.address.city}, {data.address.state} – {data.address.pincode}
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
