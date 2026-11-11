"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Package, Truck, MapPin, Phone, Clock, CheckCircle2,
  Navigation, ChevronDown, ChevronUp, User, Calendar,
  Download, Copy, ExternalLink, Zap, AlertTriangle, Radio, Home,
  ShoppingBag, QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { CourierBadge, CourierStatusBadge, CourierTimeline, type CourierTrackingData } from "@/components/delivery/DeliveryTimeline";
import { formatDate, formatPrice, ORDER_STATUS_COLORS } from "@/lib/utils";
import { DeliveryTimeline, DeliveryProgressBar, LiveLocationDot, type DeliveryStatus } from "@/components/delivery/DeliveryTimeline";
import { cn } from "@/lib/utils";

interface OrderData {
  orderId: string;
  orderDbId: string;
  status: string;
  deliveryMethod: "SELF" | "COURIER" | "PICKUP" | null;
  deliveryStatus: string;
  trackingId: string | null;
  courierName: string | null;
  estimatedDelivery: string | null;
  estimatedArrival: string | null;
  selfDeliveryEnabled: boolean;
  sellerLatitude: number | null;
  sellerLongitude: number | null;
  mapsRoute: string | null;
  pickupCode: string | null;
  pickupPayment: string | null;
  isCOD: boolean;
  createdAt: string;
  updatedAt: string;
  customer: { name: string | null; email: string; phone: string | null };
  address: {
    name: string; phone: string; line1: string; line2?: string;
    city: string; state: string; pincode: string;
  } | null;
  items: Array<{
    id: string; price: number; quantity: number;
    product: { name: string; images: string[]; productId: string };
    variant: { name: string; value: string } | null;
  }>;
}

const DELIVERY_STATUS_STEPS: DeliveryStatus[] = [
  "PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED",
];

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: "Pending",
  PREPARING: "Preparing Package",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  FAILED: "Failed",
};

function getNextStatus(current: DeliveryStatus): DeliveryStatus | null {
  const idx = DELIVERY_STATUS_STEPS.indexOf(current);
  if (idx === -1 || idx >= DELIVERY_STATUS_STEPS.length - 1) return null;
  return DELIVERY_STATUS_STEPS[idx + 1];
}

/* ── CourierSection ─────────────────────────────────────────────────────────*/

interface CourierSectionProps {
  order: OrderData;
  token: string;
  onUpdate: (updates: Partial<OrderData>) => void;
}

function CourierSection({ order, token, onUpdate }: CourierSectionProps) {
  const [shipping, setShipping] = useState(false);
  const [shipError, setShipError] = useState<string | null>(null);
  const [courierTracking, setCourierTracking] = useState<CourierTrackingData | null>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const hasShipment = !!(order.trackingId && order.courierName);

  const loadTracking = async () => {
    if (!order.trackingId || loadingTracking) return;
    setLoadingTracking(true);
    setTrackingError(null);
    try {
      const res = await fetch(`/api/orders/${order.orderDbId}/tracking`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.courierTracking) setCourierTracking(data.courierTracking);
      else setTrackingError("Live tracking not available yet");
    } catch {
      setTrackingError("Failed to fetch tracking details");
    } finally {
      setLoadingTracking(false);
    }
  };

  const handleShip = async () => {
    if (shipping) return;
    setShipping(true);
    setShipError(null);
    try {
      const res = await fetch(`/api/sellers/orders/${order.orderDbId}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pickup_location: "Primary" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ship failed");
      onUpdate({
        trackingId: data.order.trackingId,
        courierName: data.order.courierName,
        deliveryMethod: "COURIER",
        deliveryStatus: "PREPARING",
        status: "SHIPPED",
      });
      toast.success("Shipment created!", {
        description: `AWB: ${data.shipment.awb_code} · ${data.shipment.courier_name}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setShipError(msg);
      toast.error("Failed to create shipment", { description: msg });
    } finally {
      setShipping(false);
    }
  };

  const copyTracking = () => {
    if (!order.trackingId) return;
    navigator.clipboard.writeText(order.trackingId).then(() =>
      toast.success("Tracking ID copied!")
    );
  };

  if (!hasShipment) {
    return (
      <div className="space-y-3">
        {/* COD badge */}
        {order.isCOD && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-400">
            💵 Cash on Delivery — collect payment at door
          </div>
        )}
        <div className="rounded-xl border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30 shrink-0">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Ship via Shiprocket</p>
              <p className="text-xs text-muted-foreground">Auto-assign courier, AWB, pickup & label</p>
            </div>
          </div>
          <button
            onClick={handleShip}
            disabled={shipping}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 sm:py-3 text-sm font-semibold transition-all",
              "bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
            )}
          >
            {shipping ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating shipment…</>
            ) : (
              <><Zap className="h-4 w-4" /> Create Shiprocket Shipment</>
            )}
          </button>
          {shipError && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-400">{shipError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* COD badge */}
      {order.isCOD && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-400">
          💵 Cash on Delivery — collect payment at door
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Tracking ID</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{order.trackingId}</span>
            <button onClick={copyTracking} className="text-muted-foreground hover:text-foreground transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {order.courierName && <CourierBadge courierName={order.courierName} />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
          <Package className="h-3 w-3" /> Courier Shipment
        </span>
      </div>
      <button
        onClick={() => {
          const next = !expanded;
          setExpanded(next);
          if (next && !courierTracking) loadTracking();
        }}
        className="flex w-full items-center justify-between rounded-xl border border-border/60 px-4 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Live Tracking
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="rounded-xl border border-border/60 px-4 py-4">
          <CourierTimeline
            trackingData={courierTracking}
            loading={loadingTracking}
            error={trackingError}
          />
        </div>
      )}
    </div>
  );
}

/* ── SelfDeliverySection ────────────────────────────────────────────────────*/

interface SelfDeliverySectionProps {
  order: OrderData;
  token: string;
  saving: boolean;
  onAdvanceStatus: () => void;
  onShareLocation: () => void;
  onOpenMaps: () => void;
  locating: boolean;
  locationActive: boolean;
}

function SelfDeliverySection({
  order, saving, onAdvanceStatus, onShareLocation, onOpenMaps, locating, locationActive,
}: SelfDeliverySectionProps) {
  const dsStatus = order.deliveryStatus as DeliveryStatus;
  const nextStatus = getNextStatus(dsStatus);
  const isDelivered = order.deliveryStatus === "DELIVERED";
  const isOutForDelivery = order.deliveryStatus === "OUT_FOR_DELIVERY";

  const deliveryAddressStr = order.address
    ? `${order.address.line1}, ${order.address.city}, ${order.address.state} ${order.address.pincode}`
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
          <Truck className="h-3 w-3" /> Self Delivery
        </span>
        {isDelivered && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </span>
        )}
        {locationActive && isOutForDelivery && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 px-3 py-1 text-xs font-medium text-orange-700 dark:text-orange-300">
            <LiveLocationDot active /> Sharing live location
          </span>
        )}
      </div>

      <DeliveryProgressBar deliveryStatus={dsStatus} />

      {!isDelivered && (
        <div className="flex flex-wrap gap-2">
          {nextStatus && (
            <button
              onClick={onAdvanceStatus}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50 flex-1 sm:flex-none justify-center",
                nextStatus === "DELIVERED"
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Mark: {STATUS_LABELS[nextStatus]}
            </button>
          )}
          {isOutForDelivery && (
            <>
              <button
                onClick={onOpenMaps}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-all"
              >
                <Navigation className="h-3.5 w-3.5" /> Navigate
              </button>
              <button
                onClick={onShareLocation}
                disabled={locating}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50",
                  locationActive
                    ? "border-orange-300 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                    : "border-border hover:bg-muted/40"
                )}
              >
                {locating
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : locationActive
                    ? <Radio className="h-3.5 w-3.5 animate-pulse" />
                    : <MapPin className="h-3.5 w-3.5" />
                }
                {locationActive ? "Update Location" : "Share Location"}
              </button>
            </>
          )}
        </div>
      )}

      {order.address && (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deliver to</p>
          <p className="text-sm font-medium">{order.address.name}</p>
          <p className="text-sm text-muted-foreground">
            {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city}, {order.address.state} – {order.address.pincode}
          </p>
          {order.address.phone && (
            <a href={`tel:${order.address.phone}`} className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 mt-1">
              <Phone className="h-3.5 w-3.5" /> {order.address.phone}
            </a>
          )}
        </div>
      )}

      {order.estimatedArrival && isOutForDelivery && (
        <div className="flex items-center gap-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 px-4 py-3">
          <Clock className="h-4 w-4 text-orange-500 shrink-0" />
          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
            ETA: {new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(order.estimatedArrival))}
          </span>
        </div>
      )}

      {/* Delivery timeline in card itself */}
      <DeliveryTimeline
        deliveryStatus={dsStatus}
        updatedAt={order.updatedAt}
        estimatedArrival={order.estimatedArrival}
        sellerLatitude={order.sellerLatitude}
        sellerLongitude={order.sellerLongitude}
        deliveryAddress={deliveryAddressStr}
        compact
      />
    </div>
  );
}

/* ── OrderCard ──────────────────────────────────────────────────────────────*/

/* ── PickupSection ──────────────────────────────────────────────────────────*/

const PICKUP_STEPS = ["PENDING", "PACKED", "READY_FOR_PICKUP", "PICKED_UP"] as const;
type PickupStep = typeof PICKUP_STEPS[number];

const PICKUP_STEP_LABELS: Record<PickupStep, string> = {
  PENDING:          "Order Received",
  PACKED:           "Packed",
  READY_FOR_PICKUP: "Ready for Pickup",
  PICKED_UP:        "Picked Up ✓",
};

const PICKUP_STEP_COLORS: Record<PickupStep, string> = {
  PENDING:          "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/30",
  PACKED:           "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30",
  READY_FOR_PICKUP: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30",
  PICKED_UP:        "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700/30",
};

function PickupSection({ order, token, onUpdate }: {
  order: OrderData;
  token: string;
  onUpdate: (updates: Partial<OrderData>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const currentStep = (PICKUP_STEPS.includes(order.deliveryStatus as PickupStep)
    ? order.deliveryStatus
    : "PENDING") as PickupStep;
  const currentIdx = PICKUP_STEPS.indexOf(currentStep);
  const isDone = currentStep === "PICKED_UP";

  const advance = async () => {
    const nextStep = PICKUP_STEPS[currentIdx + 1];
    if (!nextStep || isDone) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sellers/orders/${order.orderDbId}/pickup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStep }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onUpdate({ deliveryStatus: nextStep });
      if (nextStep === "PACKED") {
        toast.success("Customer notified — they'll know their order is being packed!");
      } else if (nextStep === "READY_FOR_PICKUP") {
        toast.success("Customer notified — order is ready for pickup!");
      } else if (nextStep === "PICKED_UP") {
        toast.success("Order completed!");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Pickup code badge */}
      {order.pickupCode && (
        <div className="flex items-center gap-3 rounded-xl bg-primary/8 border border-primary/20 px-4 py-3">
          <QrCode className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">Pickup Code</p>
            <p className="text-xl font-bold tracking-widest text-primary">{order.pickupCode}</p>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(order.pickupCode!); toast.success("Code copied!"); }}
            className="ml-auto p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
          >
            <Copy className="h-4 w-4 text-primary" />
          </button>
        </div>
      )}

      {/* Payment method badge */}
      <div className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        order.pickupPayment === "ONLINE"
          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30"
          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30"
      )}>
        {order.pickupPayment === "ONLINE" ? "💳 Pre-paid (Online)" : "💵 Cash on Delivery — collect payment"}
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-1.5">
        {PICKUP_STEPS.map((step, idx) => {
          const done = idx <= currentIdx;
          return (
            <div key={step} className="flex items-center gap-1.5 flex-1">
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0 transition-all",
                done ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}>
                {done && idx < currentIdx ? "✓" : idx + 1}
              </div>
              <p className={cn("text-[10px] font-medium leading-tight hidden sm:block", done ? "text-foreground" : "text-muted-foreground")}>
                {PICKUP_STEP_LABELS[step]}
              </p>
              {idx < PICKUP_STEPS.length - 1 && (
                <div className={cn("flex-1 h-0.5 mx-1 rounded-full", idx < currentIdx ? "bg-primary" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Current status badge */}
      <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", PICKUP_STEP_COLORS[currentStep])}>
        <ShoppingBag className="h-3.5 w-3.5" />
        {PICKUP_STEP_LABELS[currentStep]}
      </div>

      {/* Action button */}
      {!isDone && (
        <button
          onClick={advance}
          disabled={saving}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-60",
            currentStep === "PENDING"          && "bg-blue-600 hover:bg-blue-700 text-white",
            currentStep === "PACKED"           && "bg-green-600 hover:bg-green-700 text-white",
            currentStep === "READY_FOR_PICKUP" && "bg-primary hover:bg-primary/90 text-white",
          )}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {currentStep === "PENDING"          && "Mark as Packed"}
          {currentStep === "PACKED"           && "Mark Ready for Pickup (notify customer)"}
          {currentStep === "READY_FOR_PICKUP" && "Mark as Picked Up ✓"}
        </button>
      )}

      {isDone && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800/30 py-2.5 text-sm font-semibold text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Order Completed
        </div>
      )}
    </div>
  );
}

/* ── OrderCard ──────────────────────────────────────────────────────────────*/

function OrderCard({ order, token, onUpdate }: {
  order: OrderData;
  token: string;
  onUpdate: (id: string, updates: Partial<OrderData>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationActive, setLocationActive] = useState(false);
  const [localOrder, setLocalOrder] = useState(order);
  const watchIdRef = useRef<number | null>(null);

  const patch = useCallback(async (body: Record<string, unknown>, endpoint: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sellers/orders/${order.orderDbId}/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } finally {
      setSaving(false);
    }
  }, [order.orderDbId, token]);

  const chooseMethod = async (method: "SELF" | "COURIER") => {
    const data = await patch({ deliveryMethod: method, selfDeliveryEnabled: method === "SELF" }, "delivery");
    if (data.success) {
      const updated = { ...localOrder, deliveryMethod: method, selfDeliveryEnabled: method === "SELF" };
      setLocalOrder(updated);
      onUpdate(order.orderDbId, updated);
      setExpanded(true);
    }
  };

  const advanceStatus = async () => {
    const next = getNextStatus(localOrder.deliveryStatus as DeliveryStatus);
    if (!next) return;
    const arrivalTime = next === "OUT_FOR_DELIVERY"
      ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
      : undefined;
    const body: Record<string, unknown> = { deliveryStatus: next };
    if (arrivalTime) body.estimatedArrival = arrivalTime;
    const data = await patch(body, "delivery");
    if (data.success) {
      const updated = { ...localOrder, deliveryStatus: next, estimatedArrival: arrivalTime ?? localOrder.estimatedArrival };
      setLocalOrder(updated);
      onUpdate(order.orderDbId, updated);
      // If out for delivery, auto-start location sharing
      if (next === "OUT_FOR_DELIVERY") {
        startLocationWatch();
      }
    }
  };

  // One-shot location push
  const shareLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const arrival = new Date(Date.now() + 45 * 60 * 1000).toISOString();
          await patch({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, estimatedArrival: arrival }, "location");
          const updated = {
            ...localOrder,
            sellerLatitude: pos.coords.latitude,
            sellerLongitude: pos.coords.longitude,
            estimatedArrival: arrival,
          };
          setLocalOrder(updated);
          onUpdate(order.orderDbId, updated);
          setLocationActive(true);
          toast.success("Location shared!", { description: "Customer can now see your live location on map." });
        } catch {
          toast.error("Failed to push location");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        toast.error("Location access denied", { description: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Continuous watch - pushes every position change
  const startLocationWatch = () => {
    if (!navigator.geolocation || watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await fetch(`/api/sellers/orders/${order.orderDbId}/location`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          });
          setLocalOrder((prev) => ({
            ...prev,
            sellerLatitude: pos.coords.latitude,
            sellerLongitude: pos.coords.longitude,
          }));
          setLocationActive(true);
        } catch { /* silent */ }
      },
      () => { /* silent */ },
      { enableHighAccuracy: true, maximumAge: 15000 }
    );
  };

  // Stop watch when delivered
  useEffect(() => {
    if (localOrder.deliveryStatus === "DELIVERED" && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setLocationActive(false);
    }
  }, [localOrder.deliveryStatus]);

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  const openMaps = () => {
    if (!localOrder.address) return;
    const dest = encodeURIComponent(`${localOrder.address.line1}, ${localOrder.address.city}, ${localOrder.address.state} ${localOrder.address.pincode}`);
    const origin = localOrder.sellerLatitude
      ? `&origin=${localOrder.sellerLatitude},${localOrder.sellerLongitude}`
      : "";
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}${origin}&travelmode=driving`, "_blank");
  };

  const isDelivered = localOrder.deliveryStatus === "DELIVERED";

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">#{localOrder.orderId.slice(-8).toUpperCase()}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(localOrder.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "hidden sm:inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
            ORDER_STATUS_COLORS[localOrder.status as keyof typeof ORDER_STATUS_COLORS] ?? "bg-muted text-muted-foreground"
          )}>
            {localOrder.status}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg border border-border/50 p-1.5 hover:bg-muted/40 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Items summary */}
      <div className="px-4 sm:px-5 py-3 flex items-center gap-3 border-b border-border/30">
        <div className="flex -space-x-2 shrink-0">
          {localOrder.items.slice(0, 3).map((item) => (
            <div key={item.id} className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-lg border-2 border-background overflow-hidden bg-muted">
              {item.product.images[0] && (
                <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" sizes="40px" />
              )}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{localOrder.items[0]?.product.name}</p>
          {localOrder.items.length > 1 && (
            <p className="text-xs text-muted-foreground">+{localOrder.items.length - 1} more</p>
          )}
        </div>
        <p className="text-sm font-semibold shrink-0">
          {formatPrice(localOrder.items.reduce((s, i) => s + i.price * i.quantity, 0))}
        </p>
      </div>

      {/* Customer */}
      <div className="px-4 sm:px-5 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/30">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{localOrder.customer.name || localOrder.customer.email}</span>
        </div>
        {localOrder.customer.phone && (
          <a href={`tel:${localOrder.customer.phone}`} className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            <Phone className="h-3.5 w-3.5" />{localOrder.customer.phone}
          </a>
        )}
      </div>

      {/* Delivery section */}
      <div className="px-4 sm:px-5 py-4">
        {!localOrder.deliveryMethod ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Choose delivery method:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => chooseMethod("SELF")}
                disabled={saving}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 p-3 sm:p-4 transition-all disabled:opacity-50"
              >
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
                  <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm font-semibold">Deliver Yourself</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">You handle delivery</p>
                </div>
              </button>
              <button
                onClick={() => chooseMethod("COURIER")}
                disabled={saving}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 p-3 sm:p-4 transition-all disabled:opacity-50"
              >
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/20">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm font-semibold">Ship with Courier</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Shiprocket / DTDC</p>
                </div>
              </button>
            </div>
            {saving && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </div>
            )}
          </div>
        ) : localOrder.deliveryMethod === "PICKUP" ? (
          <PickupSection
            order={localOrder}
            token={token}
            onUpdate={(updates) => {
              const merged = { ...localOrder, ...updates };
              setLocalOrder(merged);
              onUpdate(order.orderDbId, merged);
            }}
          />
        ) : localOrder.deliveryMethod === "SELF" ? (
          <SelfDeliverySection
            order={localOrder}
            token={token}
            saving={saving}
            onAdvanceStatus={advanceStatus}
            onShareLocation={shareLocation}
            onOpenMaps={openMaps}
            locating={locating}
            locationActive={locationActive}
          />
        ) : (
          <CourierSection
            order={localOrder}
            token={token}
            onUpdate={(updates) => {
              const merged = { ...localOrder, ...updates };
              setLocalOrder(merged);
              onUpdate(order.orderDbId, merged);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────*/

const SELLER_ORDERS_CACHE_KEY = "nxc-seller-orders-v1";

export default function SellerOrdersPage() {
  const { user } = useAuthContext();

  // Seed instantly from localStorage cache — no spinner on repeat visits
  const [orders, setOrders] = useState<OrderData[]>(() => {
    try {
      const raw = localStorage.getItem(SELLER_ORDERS_CACHE_KEY);
      return raw ? (JSON.parse(raw) as OrderData[]) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => orders.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "SELF" | "COURIER" | "PICKUP" | "PENDING_METHOD">("ALL");

  useEffect(() => {
    const uid = user?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
    if (!uid) return;
    if (user?.uid) { try { localStorage.setItem("nxc-uid", user.uid); } catch {} }
    fetch("/api/sellers/orders", { headers: { Authorization: `Bearer ${uid}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const list: OrderData[] = data.orders ?? [];
        setOrders(list);
        try { localStorage.setItem(SELLER_ORDERS_CACHE_KEY, JSON.stringify(list)); } catch {}
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdate = useCallback((id: string, updates: Partial<OrderData>) => {
    setOrders((prev) => {
      const next = prev.map((o) => (o.orderDbId === id ? { ...o, ...updates } : o));
      try { localStorage.setItem(SELLER_ORDERS_CACHE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const filtered = orders.filter((o) => {
    if (filter === "SELF") return o.deliveryMethod === "SELF";
    if (filter === "COURIER") return o.deliveryMethod === "COURIER";
    if (filter === "PICKUP") return o.deliveryMethod === "PICKUP";
    if (filter === "PENDING_METHOD") return !o.deliveryMethod;
    return true;
  });

  const pendingCount = orders.filter((o) => !o.deliveryMethod).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive px-4 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <span className="text-muted-foreground/50 text-[12px]">/</span>
            <span className="text-[12px] text-foreground font-medium">Orders</span>
          </div>
          <h1 className="text-xl font-semibold">Orders</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {orders.length} total · {pendingCount} need delivery method
          </p>
        </div>
        <Link href="/">
          <button className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
        </Link>
      </div>

      {/* Filter tabs - horizontal scroll on mobile */}
      <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex rounded-xl border border-border/50 p-1 gap-1 bg-muted/20 w-max sm:w-auto min-w-full">
          {(["ALL", "PENDING_METHOD", "PICKUP", "SELF", "COURIER"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                filter === f
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "ALL"
                ? `All (${orders.length})`
                : f === "PENDING_METHOD"
                  ? `Needs Method${pendingCount ? ` (${pendingCount})` : ""}`
                  : f === "PICKUP"
                    ? `Pickup (${orders.filter((o) => o.deliveryMethod === "PICKUP").length})`
                    : f === "SELF"
                      ? `Self Delivery`
                      : "Courier"}
            </button>
          ))}
        </div>
      </div>

      {/* Order list */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          No orders found
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <OrderCard
              key={order.orderDbId}
              order={order}
              token={user?.uid ?? ""}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
