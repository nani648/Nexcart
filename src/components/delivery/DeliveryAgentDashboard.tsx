"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Loader2, Package, MapPin, Phone, User, RefreshCw,
  CheckCircle2, AlertCircle, Banknote, KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { name: string; images: string[] };
}

interface DeliveryOrder {
  id: string;
  orderId: string;
  status: string;
  deliveryStatus: string;
  isCOD: boolean;
  totalAmount: number;
  codCollectedAt: string | null;
  createdAt: string;
  user: { name: string | null; phone: string | null };
  address: {
    name: string; phone: string; line1: string; line2?: string;
    city: string; state: string; pincode: string;
  } | null;
  items: OrderItem[];
}

const DS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  FAILED: "Failed",
};

const DS_COLOR: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  PREPARING: "bg-yellow-100 text-yellow-700",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-700",
  DELIVERED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export function DeliveryAgentDashboard() {
  const { user } = useAuthContext();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otpMap, setOtpMap] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/delivery/orders", {
        headers: { Authorization: `Bearer ${user.uid}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const confirmDelivery = async (orderId: string) => {
    const otp = otpMap[orderId]?.trim();
    if (!otp || otp.length !== 6) {
      toast.error("Enter the 6-digit OTP from the customer");
      return;
    }
    if (!user) return;
    setConfirming((p) => ({ ...p, [orderId]: true }));
    try {
      const res = await fetch(`/api/delivery/orders/${orderId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.uid}`,
        },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm");
      toast.success("Delivery confirmed! Cash recorded.");
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, deliveryStatus: "DELIVERED", status: "DELIVERED", codCollectedAt: new Date().toISOString() }
            : o
        )
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Confirmation failed");
    } finally {
      setConfirming((p) => ({ ...p, [orderId]: false }));
    }
  };

  const pending = orders.filter((o) => o.deliveryStatus !== "DELIVERED" && o.deliveryStatus !== "FAILED");
  const done    = orders.filter((o) => o.deliveryStatus === "DELIVERED" || o.deliveryStatus === "FAILED");

  if (fetching) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">{error}</p>
        <button onClick={load} className="text-xs text-muted-foreground underline underline-offset-2">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My Deliveries</h1>
          <p className="text-sm text-muted-foreground">{pending.length} pending · {done.length} done</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {orders.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <Package className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No deliveries assigned yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Your seller will assign orders to you</p>
        </div>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active</h2>
          {pending.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              otp={otpMap[order.id] ?? ""}
              onOtpChange={(v) => setOtpMap((p) => ({ ...p, [order.id]: v }))}
              onConfirm={() => confirmDelivery(order.id)}
              confirming={!!confirming[order.id]}
            />
          ))}
        </section>
      )}

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completed</h2>
          {done.map((order) => (
            <OrderCard key={order.id} order={order} otp="" onOtpChange={() => {}} onConfirm={() => {}} confirming={false} />
          ))}
        </section>
      )}
    </div>
  );
}

function OrderCard({
  order, otp, onOtpChange, onConfirm, confirming,
}: {
  order: DeliveryOrder;
  otp: string;
  onOtpChange: (v: string) => void;
  onConfirm: () => void;
  confirming: boolean;
}) {
  const isOutForDelivery = order.deliveryStatus === "OUT_FOR_DELIVERY";
  const isDelivered      = order.deliveryStatus === "DELIVERED";
  const isCodPending     = order.isCOD && isOutForDelivery && !order.codCollectedAt;

  const addr = order.address
    ? `${order.address.line1}${order.address.line2 ? ", " + order.address.line2 : ""}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}`
    : null;

  return (
    <div className={cn(
      "rounded-xl border bg-background p-4 space-y-3 transition-colors",
      isCodPending ? "border-orange-200 dark:border-orange-800/40" : "border-border/60"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">
              #{order.orderId.slice(-8).toUpperCase()}
            </span>
            {order.isCOD && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Banknote className="h-2.5 w-2.5" />
                COD ₹{order.totalAmount.toFixed(0)}
              </span>
            )}
            {!order.isCOD && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                Online Paid
              </span>
            )}
          </div>
          <span className={cn(
            "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
            DS_COLOR[order.deliveryStatus] ?? "bg-gray-100 text-gray-700"
          )}>
            {DS_LABEL[order.deliveryStatus] ?? order.deliveryStatus}
          </span>
        </div>
        {isDelivered && (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
        )}
      </div>

      {/* Customer & Address */}
      <div className="space-y-1 text-[13px]">
        {order.user.name && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span>{order.user.name}</span>
          </div>
        )}
        {order.address?.phone && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <a href={`tel:${order.address.phone}`} className="underline underline-offset-2">
              {order.address.phone}
            </a>
          </div>
        )}
        {addr && (
          <div className="flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{addr}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-lg bg-muted/40 p-2.5 space-y-1">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-[12px]">
            <span className="text-foreground truncate max-w-[180px]">{item.product.name}</span>
            <span className="text-muted-foreground ml-2 shrink-0">×{item.quantity} · ₹{item.price}</span>
          </div>
        ))}
      </div>

      {/* COD OTP confirmation */}
      {isCodPending && (
        <div className="space-y-2 rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-800/40 dark:bg-orange-900/10">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
            <p className="text-[12px] font-semibold text-orange-700 dark:text-orange-300">
              Ask customer for their delivery OTP to confirm cash collection
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, ""))}
              className="h-9 w-full rounded-lg border border-orange-200 bg-white px-3 text-sm font-mono tracking-widest dark:border-orange-700 dark:bg-background focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={onConfirm}
              disabled={confirming || otp.length !== 6}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
            >
              {confirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* COD collected confirmation */}
      {order.isCOD && isDelivered && order.codCollectedAt && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-[12px] font-medium text-green-700 dark:text-green-400">
            Cash collected · ₹{order.totalAmount.toFixed(0)}
          </p>
        </div>
      )}

      {/* Non-COD delivered */}
      {!order.isCOD && isDelivered && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-[12px] font-medium text-green-700 dark:text-green-400">Delivered successfully</p>
        </div>
      )}
    </div>
  );
}
