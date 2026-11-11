"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Loader2,
  Truck,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ReturnRequestForm } from "@/components/returns/ReturnRequestForm";

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { id: string; productId: string; name: string; images: string[] };
}

interface OrderDetail {
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  address: { name: string; line1: string; city: string; state: string; pincode: string } | null;
  payment: { method: string; status: string } | null;
}

interface ReturnInfo {
  id: string;
  productId: string;
  orderId: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDED";
  refundAmount: number | null;
  sellerNote: string | null;
  customerTrackingId: string | null;
  shippingChargedTo: string;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { user, loading } = useAuthContext();
  const router  = useRouter();
  const params  = useParams();
  const orderId = params.id as string;

  const [order,   setOrder]   = useState<Record<string, unknown> | null>(null);
  const [fetching, setFetching] = useState(true);

  // return flow state
  const [orderReturns,       setOrderReturns]       = useState<ReturnInfo[]>([]);
  const [returnsFetching,    setReturnsFetching]    = useState(false);
  const [returningItem,      setReturningItem]      = useState<{ productId: string; productName: string } | null>(null);
  const [trackingInputs,     setTrackingInputs]     = useState<Record<string, string>>({});
  const [submittingTracking, setSubmittingTracking] = useState<Record<string, boolean>>({});
  const [trackingErrors,     setTrackingErrors]     = useState<Record<string, string>>({});

  // ─── Auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
  }, [user, loading, router]);

  // ─── Fetch order ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !orderId) return;
    fetch(`/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${user.uid}` } })
      .then((r) => r.ok ? r.json() : null)
      .then(setOrder)
      .finally(() => setFetching(false));
  }, [user, orderId]);

  // ─── Fetch returns for this order ─────────────────────────────────────────
  useEffect(() => {
    if (!user || !orderId) return;
    setReturnsFetching(true);
    fetch("/api/returns?filter=buyer", { headers: { Authorization: `Bearer ${user.uid}` } })
      .then((r) => r.ok ? r.json() : { returns: [] })
      .then((data) => {
        setOrderReturns(
          (data.returns ?? []).filter((r: ReturnInfo) => r.orderId === orderId)
        );
      })
      .finally(() => setReturnsFetching(false));
  }, [user, orderId]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const refreshReturns = () => {
    if (!user || !orderId) return;
    fetch("/api/returns?filter=buyer", { headers: { Authorization: `Bearer ${user.uid}` } })
      .then((r) => r.ok ? r.json() : { returns: [] })
      .then((data) => {
        setOrderReturns(
          (data.returns ?? []).filter((r: ReturnInfo) => r.orderId === orderId)
        );
      });
  };

  const handleTrackingSubmit = async (returnId: string) => {
    const trackingId = (trackingInputs[returnId] ?? "").trim();
    if (!trackingId || !user) return;
    setSubmittingTracking((p) => ({ ...p, [returnId]: true }));
    setTrackingErrors((p) => ({ ...p, [returnId]: "" }));
    try {
      const res = await fetch(`/api/returns/${returnId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.uid}`,
        },
        body: JSON.stringify({ customerTrackingId: trackingId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit tracking");
      }
      setOrderReturns((prev) =>
        prev.map((r) => r.id === returnId ? { ...r, customerTrackingId: trackingId } : r)
      );
    } catch (err) {
      setTrackingErrors((p) => ({
        ...p,
        [returnId]: err instanceof Error ? err.message : "Failed to submit",
      }));
    } finally {
      setSubmittingTracking((p) => ({ ...p, [returnId]: false }));
    }
  };

  // ─── Loading / not-found guards ───────────────────────────────────────────

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (!order) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h2 className="mt-4 font-medium">Order not found</h2>
          <Link href="/orders" className="mt-4 inline-block text-sm underline underline-offset-4">
            Back to Orders
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const o = order as unknown as OrderDetail;

  // 7-day return window — based on when the order was last updated (delivery time)
  const returnDeadline = o.status === "DELIVERED"
    ? new Date(new Date(o.updatedAt).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const withinReturnWindow = returnDeadline ? new Date() <= returnDeadline : false;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 space-y-6">

        {/* Back + title */}
        <div className="flex items-center gap-3">
          <Link href="/orders" className="rounded-lg border border-border/50 p-2 hover:bg-muted/30">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Order #{o.orderId?.slice(-8).toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground">{formatDate(new Date(o.createdAt))}</p>
          </div>
          <span className="ml-auto rounded-full bg-muted px-3 py-1 text-xs font-medium">{o.status}</span>
        </div>

        {/* Track Order */}
        <Link
          href={`/orders/${orderId}/track`}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Truck className="h-4 w-4" /> Track This Order
        </Link>

        {/* Invoice */}
        <Link
          href={`/orders/${orderId}/invoice`}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-border/50 px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
        >
          <CreditCard className="h-4 w-4" /> View / Download Invoice
        </Link>

        {/* Items */}
        <div className="rounded-xl border border-border/50 divide-y divide-border/50">
          {o.items?.map((item) => (
            <div key={item.id} className="flex gap-3 p-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={item.product.images?.[0] || "/placeholder.jpg"}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                />
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
        </div>

        {/* Address + Payment */}
        <div className="grid gap-4 sm:grid-cols-2">
          {o.address && (
            <div className="rounded-xl border border-border/50 p-4 space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <MapPin className="h-4 w-4" /> Delivery Address
              </div>
              <p className="text-sm text-muted-foreground">
                {o.address.name}, {o.address.line1}, {o.address.city}, {o.address.state} – {o.address.pincode}
              </p>
            </div>
          )}
          {o.payment && (
            <div className="rounded-xl border border-border/50 p-4 space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <CreditCard className="h-4 w-4" /> Payment
              </div>
              <p className="text-sm text-muted-foreground capitalize">
                {o.payment.method} · {o.payment.status}
              </p>
              <p className="text-lg font-semibold">{formatPrice(o.totalAmount)}</p>
            </div>
          )}
        </div>

        {/* ── Returns section (DELIVERED orders only) ── */}
        {o.status === "DELIVERED" && (
          <div className="rounded-xl border border-border/50 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Returns</h3>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {withinReturnWindow && returnDeadline
                  ? `Window open until ${returnDeadline.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                  : "Return window closed"}
              </span>
            </div>

            {returnsFetching ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {o.items.map((item) => {
                  const ret = orderReturns.find((r) => r.productId === item.product.id);

                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-3"
                    >
                      {/* Product thumb */}
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={item.product.images?.[0] || "/placeholder.jpg"}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{item.product.name}</p>

                        {/* No return yet */}
                        {!ret && withinReturnWindow && (
                          <button
                            onClick={() => setReturningItem({ productId: item.product.id, productName: item.product.name })}
                            className="mt-1 flex items-center gap-1 text-[12px] font-medium text-primary underline underline-offset-2 hover:no-underline"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Request Return
                          </button>
                        )}
                        {!ret && !withinReturnWindow && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">Return window expired</p>
                        )}

                        {/* REQUESTED */}
                        {ret?.status === "REQUESTED" && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                            <span className="text-[12px] text-amber-600">Return requested — awaiting admin review</span>
                          </div>
                        )}

                        {/* APPROVED — show shipping info + tracking input */}
                        {ret?.status === "APPROVED" && (
                          <div className="mt-1.5 space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Truck className="h-3 w-3 text-blue-500 shrink-0" />
                              <span className="text-[12px] text-blue-600 font-medium">
                                Approved — ship the product back to the seller
                              </span>
                            </div>
                            {ret.shippingChargedTo === "CUSTOMER" && (
                              <p className="text-[11px] text-muted-foreground">
                                Note: ₹70 return shipping was deducted from your refund.
                              </p>
                            )}
                            {/* Already submitted tracking */}
                            {ret.customerTrackingId ? (
                              <div className="flex items-center gap-1.5 text-[12px] text-green-600">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                Tracking submitted:
                                <span className="font-mono">{ret.customerTrackingId}</span>
                              </div>
                            ) : (
                              /* Tracking input */
                              <div className="space-y-1">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Enter your shipment tracking number"
                                    value={trackingInputs[ret.id] ?? ""}
                                    onChange={(e) =>
                                      setTrackingInputs((p) => ({ ...p, [ret.id]: e.target.value }))
                                    }
                                    className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-[12px] placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  />
                                  <button
                                    onClick={() => handleTrackingSubmit(ret.id)}
                                    disabled={submittingTracking[ret.id] || !trackingInputs[ret.id]?.trim()}
                                    className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {submittingTracking[ret.id]
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : "Submit"}
                                  </button>
                                </div>
                                {trackingErrors[ret.id] && (
                                  <p className="text-[11px] text-red-600">{trackingErrors[ret.id]}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* REJECTED */}
                        {ret?.status === "REJECTED" && (
                          <div className="mt-1 flex items-start gap-1.5">
                            <XCircle className="mt-0.5 h-3 w-3 text-red-500 shrink-0" />
                            <span className="text-[12px] text-red-600">
                              Return rejected{ret.sellerNote ? `: ${ret.sellerNote}` : ""}
                            </span>
                          </div>
                        )}

                        {/* REFUNDED */}
                        {ret?.status === "REFUNDED" && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                            <span className="text-[12px] text-green-600 font-medium">
                              Refund processed
                              {ret.refundAmount != null ? ` · ₹${ret.refundAmount.toFixed(0)}` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />

      {/* Return Request Dialog */}
      <Dialog
        open={!!returningItem}
        onOpenChange={(open) => { if (!open) setReturningItem(null); }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Request Return</DialogTitle>
            <DialogDescription className="text-[13px]">
              Fill in the details below. Your request will be reviewed within 24–48 hours.
            </DialogDescription>
          </DialogHeader>
          {returningItem && (
            <ReturnRequestForm
              orderId={orderId}
              productId={returningItem.productId}
              productName={returningItem.productName}
              onSuccess={() => {
                setReturningItem(null);
                refreshReturns();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
