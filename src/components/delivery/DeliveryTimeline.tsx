"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2, Clock, Package, Truck, Home, XCircle,
  AlertTriangle, Loader2, Navigation2
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DeliveryStatus =
  | "PENDING"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED";

export interface CourierActivity {
  date: string;
  activity: string;
  location: string;
  "sr-status"?: string;
  "sr-status-label"?: string;
}

export interface CourierTrackingData {
  awb: string;
  current_status: string;
  current_status_id?: number;
  delivered_date?: string;
  eta?: string;
  courier: string;
  origin?: string;
  destination?: string;
  shipment_track_activities: CourierActivity[];
}

const COURIER_BRANDS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DTDC: { label: "DTDC", color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800/40" },
  Delhivery: { label: "Delhivery", color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800/40" },
  BlueDart: { label: "BlueDart", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800/40" },
  Ekart: { label: "Ekart", color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-200 dark:border-yellow-800/40" },
  Xpressbees: { label: "Xpressbees", color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800/40" },
  Shadowfax: { label: "Shadowfax", color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-800/40" },
  Shiprocket: { label: "Shiprocket", color: "text-teal-700 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-900/20", border: "border-teal-200 dark:border-teal-800/40" },
};

function getCourierBrand(name: string) {
  const key = Object.keys(COURIER_BRANDS).find((k) => name.toLowerCase().includes(k.toLowerCase()));
  return key ? COURIER_BRANDS[key] : { label: name, color: "text-gray-700 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-900/20", border: "border-gray-200 dark:border-gray-800/40" };
}

const COURIER_STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: "Pickup Scheduled", color: "text-blue-600" },
  2: { label: "In Transit", color: "text-indigo-600" },
  3: { label: "Delivered", color: "text-green-600" },
  4: { label: "Cancelled", color: "text-red-600" },
  5: { label: "Pending", color: "text-yellow-600" },
  6: { label: "Pickup Error", color: "text-red-600" },
  7: { label: "Out for Delivery", color: "text-orange-600" },
  8: { label: "Undelivered", color: "text-red-600" },
  9: { label: "Delivery Failed", color: "text-red-600" },
  10: { label: "Pickup Rescheduled", color: "text-yellow-600" },
  12: { label: "Shipment Picked Up", color: "text-blue-600" },
  14: { label: "Lost", color: "text-red-600" },
  15: { label: "Damaged", color: "text-red-600" },
};

const BG_MAP: Record<string, string> = {
  "text-green-600": "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40",
  "text-blue-600": "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40",
  "text-indigo-600": "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/40",
  "text-orange-600": "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40",
  "text-yellow-600": "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40",
  "text-red-600": "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40",
  "text-gray-600": "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800/40",
};

export function CourierBadge({ courierName, awbCode, className }: { courierName: string; awbCode?: string; className?: string }) {
  const brand = getCourierBrand(courierName);
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-1.5", brand.bg, brand.border, className)}>
      <Truck className={cn("h-3.5 w-3.5", brand.color)} />
      <span className={cn("text-xs font-semibold", brand.color)}>{brand.label}</span>
      {awbCode && (
        <>
          <span className="text-muted-foreground opacity-40">·</span>
          <span className="font-mono text-xs text-muted-foreground">{awbCode}</span>
        </>
      )}
    </div>
  );
}

export function CourierStatusBadge({ statusId, statusLabel }: { statusId?: number; statusLabel?: string }) {
  const meta = statusId ? COURIER_STATUS_MAP[statusId] : null;
  const label = statusLabel ?? meta?.label ?? "Unknown";
  const color = meta?.color ?? "text-gray-600";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", color, BG_MAP[color] ?? BG_MAP["text-gray-600"])}>
      {label}
    </span>
  );
}

export function CourierTimeline({ trackingData, loading, error }: { trackingData?: CourierTrackingData | null; loading?: boolean; error?: string | null }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading tracking details...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      </div>
    );
  }
  if (!trackingData) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
        <Package className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Tracking details will appear once the package is picked up
        </p>
      </div>
    );
  }

  const activities = [...(trackingData.shipment_track_activities ?? [])].reverse();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CourierBadge courierName={trackingData.courier} awbCode={trackingData.awb} />
        <CourierStatusBadge statusId={trackingData.current_status_id} statusLabel={trackingData.current_status} />
      </div>
      {(trackingData.origin || trackingData.destination) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {trackingData.origin && <span>{trackingData.origin}</span>}
          {trackingData.origin && trackingData.destination && <span className="opacity-40">→</span>}
          {trackingData.destination && <span>{trackingData.destination}</span>}
          {trackingData.eta && (
            <>
              <span className="opacity-40">·</span>
              <span className="font-medium text-foreground">ETA: {trackingData.eta}</span>
            </>
          )}
        </div>
      )}
      {activities.length > 0 ? (
        <div className="relative">
          <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-border/50" aria-hidden="true" />
          <div className="space-y-0">
            {activities.map((act, idx) => {
              const isFirst = idx === 0;
              const statusId = act["sr-status"] ? parseInt(act["sr-status"]) : undefined;
              const meta = statusId ? COURIER_STATUS_MAP[statusId] : null;
              const isDelivered = statusId === 3;
              const isFailed = statusId === 9 || statusId === 8;
              return (
                <div key={idx} className="flex items-start gap-4 relative">
                  <div className={cn(
                    "relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isDelivered ? "border-green-500 bg-green-500 text-white"
                      : isFailed ? "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-500"
                      : isFirst ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                  )}>
                    {isDelivered ? <CheckCircle2 className="h-4 w-4" /> : isFailed ? <XCircle className="h-4 w-4" /> : <Truck className="h-3.5 w-3.5" />}
                  </div>
                  <div className="pb-5 pt-0.5 flex-1 min-w-0">
                    <p className={cn("text-[13px] font-medium leading-snug", isFirst ? "text-foreground" : "text-muted-foreground")}>{act.activity}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {act.location && <span className="text-xs text-muted-foreground">📍 {act.location}</span>}
                      <span className="text-xs text-muted-foreground">{act.date}</span>
                    </div>
                    {meta && <span className={cn("mt-1 inline-block text-[11px] font-semibold", meta.color)}>{meta.label}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-2">No tracking events yet.</p>
      )}
    </div>
  );
}

const SELF_STEPS: { key: DeliveryStatus; label: string; desc: string; Icon: React.ElementType }[] = [
  { key: "PENDING", label: "Order Placed", desc: "Waiting for seller to confirm", Icon: Clock },
  { key: "PREPARING", label: "Preparing Package", desc: "Seller is packing your order", Icon: Package },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", desc: "Seller is on the way", Icon: Truck },
  { key: "DELIVERED", label: "Delivered", desc: "Order delivered successfully", Icon: Home },
];

const STATUS_ORDER: Record<DeliveryStatus, number> = {
  PENDING: 0, PREPARING: 1, OUT_FOR_DELIVERY: 2, DELIVERED: 3, FAILED: 3,
};

interface DeliveryTimelineProps {
  deliveryStatus: DeliveryStatus;
  updatedAt?: string | Date;
  estimatedArrival?: string | Date | null;
  sellerLatitude?: number | null;
  sellerLongitude?: number | null;
  deliveryAddress?: string | null;
  compact?: boolean;
}

export function DeliveryTimeline({
  deliveryStatus,
  updatedAt,
  estimatedArrival,
  sellerLatitude,
  sellerLongitude,
  deliveryAddress,
  compact = false,
}: DeliveryTimelineProps) {
  const currentIdx = STATUS_ORDER[deliveryStatus] ?? 0;
  const isFailed = deliveryStatus === "FAILED";
  const isOutForDelivery = deliveryStatus === "OUT_FOR_DELIVERY";

  const mapsRouteUrl = (() => {
    if (!deliveryAddress) return null;
    const dest = encodeURIComponent(deliveryAddress);
    if (sellerLatitude && sellerLongitude) {
      return `https://www.google.com/maps/dir/?api=1&origin=${sellerLatitude},${sellerLongitude}&destination=${dest}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  })();

  const [etaText, setEtaText] = useState<string>("");
  useEffect(() => {
    if (!estimatedArrival || !isOutForDelivery) return;
    const update = () => {
      const diff = new Date(estimatedArrival).getTime() - Date.now();
      if (diff <= 0) { setEtaText("Arriving now"); return; }
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      setEtaText(hrs > 0 ? `~${hrs}h ${mins % 60}m away` : `~${mins} min away`);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [estimatedArrival, isOutForDelivery]);

  return (
    <div className={cn("w-full", compact ? "space-y-3" : "space-y-4")}>
      {estimatedArrival && isOutForDelivery && (
        <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-orange-500 shrink-0 animate-bounce" />
            <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
              Arriving by {new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(estimatedArrival))}
            </span>
            {etaText && (
              <span className="ml-auto text-xs font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 rounded-full px-2 py-0.5 whitespace-nowrap">
                {etaText}
              </span>
            )}
          </div>
          {mapsRouteUrl && (
            <a
              href={mapsRouteUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 px-3 py-2 text-xs font-medium text-orange-700 dark:text-orange-300 transition-colors"
            >
              <Navigation2 className="h-3.5 w-3.5 shrink-0" />
              View route on Google Maps
              {sellerLatitude && <span className="ml-auto opacity-60 flex items-center gap-1"><LiveLocationDot active /> Live location</span>}
            </a>
          )}
        </div>
      )}

      <div className="relative">
        <div className="absolute left-[18px] top-5 bottom-5 w-0.5 bg-border/50" aria-hidden="true" />
        <div className="space-y-0">
          {SELF_STEPS.map((step, idx) => {
            const done = idx <= currentIdx && !isFailed;
            const active = idx === currentIdx && !isFailed;
            return (
              <div key={step.key} className="flex items-start gap-4 relative">
                <div className={cn(
                  "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500",
                  done ? "border-green-500 bg-green-500 text-white shadow-sm shadow-green-200 dark:shadow-green-900/30"
                    : active ? "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                    : "border-border bg-background text-muted-foreground"
                )}>
                  {done && idx < currentIdx ? <CheckCircle2 className="h-4 w-4" /> : <step.Icon className="h-4 w-4" />}
                </div>
                <div className={cn("pb-6 pt-1 flex-1", idx === SELF_STEPS.length - 1 && "pb-0")}>
                  <p className={cn("text-sm font-medium", done ? "text-foreground" : "text-muted-foreground")}>{step.label}</p>
                  {!compact && <p className="mt-0.5 text-xs text-muted-foreground">{step.desc}</p>}
                  {active && updatedAt && (
                    <p className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">
                      Updated {new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, day: "numeric", month: "short" }).format(new Date(updatedAt))}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isFailed && (
        <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 px-4 py-3">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">Delivery failed. Seller will reschedule or contact you.</p>
        </div>
      )}
    </div>
  );
}

export function DeliveryProgressBar({ deliveryStatus }: { deliveryStatus: DeliveryStatus }) {
  const steps = ["PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];
  const labels = ["Placed", "Packing", "On Way", "Done"];
  const current = STATUS_ORDER[deliveryStatus] ?? 0;
  const pct = Math.min(100, (current / (steps.length - 1)) * 100);

  return (
    <div className="w-full space-y-3">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-0 right-0 top-[10px] h-0.5 bg-border/50" />
        <div
          className="absolute left-0 top-[10px] h-0.5 bg-green-500 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
        {steps.map((step, idx) => {
          const done = idx <= current;
          return (
            <div key={step} className="relative z-10 flex flex-col items-center gap-1">
              <div className={cn(
                "h-5 w-5 rounded-full border-2 transition-all duration-500",
                done
                  ? "border-green-500 bg-green-500 shadow-sm shadow-green-300 dark:shadow-green-900/40"
                  : "border-border bg-background"
              )}>
                {done && <CheckCircle2 className="h-full w-full text-white p-0.5" />}
              </div>
              <span className={cn("text-[10px] font-medium whitespace-nowrap", done ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
                {labels[idx]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LiveLocationDot({ active }: { active?: boolean }) {
  if (!active) return null;
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
    </span>
  );
}
