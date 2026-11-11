"use client";

import { useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Package,
  CheckCircle2,
  XCircle,
  Truck,
  Loader2,
  AlertCircle,
  Clock,
  DollarSign,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ReturnItem {
  id: string;
  returnId: string;
  reason: string;
  description: string | null;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDED";
  refundAmount: number;
  sellerNote: string | null;
  shippingChargedTo: string;
  reverseAwb?: string | null;
  customerTrackingId?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  product: { name: string; images: string[] };
  buyer: { name: string | null; email: string; phone: string | null };
  order: { id: string; orderId?: string; isCOD?: boolean };
}

interface ReturnsClientProps {
  initialReturns: ReturnItem[];
}

const STATUS_CONFIG: Record<
  ReturnItem["status"],
  { label: string; color: string; icon: React.ElementType }
> = {
  REQUESTED: {
    label: "Pending",
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40",
    icon: Truck,
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40",
    icon: XCircle,
  },
  REFUNDED: {
    label: "Refunded",
    color: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/40",
    icon: DollarSign,
  },
};

const REASON_LABELS: Record<string, string> = {
  DAMAGED:          "Item Damaged",
  WRONG_ITEM:       "Wrong Item",
  NOT_AS_DESCRIBED: "Not as Described",
  DEFECTIVE:        "Defective Product",
  CHANGE_OF_MIND:   "Change of Mind",
  OTHER:            "Other",
};

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function ReturnsClient({ initialReturns }: ReturnsClientProps) {
  const { user } = useAuthContext();
  const [returns, setReturns]         = useState<ReturnItem[]>(initialReturns);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [confirmTarget, setConfirmTarget] = useState<ReturnItem | null>(null);
  const [confirming, setConfirming]   = useState(false);

  const openConfirm  = (ret: ReturnItem) => setConfirmTarget(ret);
  const closeConfirm = () => setConfirmTarget(null);

  const handleConfirmReceipt = async () => {
    if (!confirmTarget || !user) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/sellers/returns/${confirmTarget.id}/confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.uid}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm receipt");

      setReturns((prev) =>
        prev.map((r) => (r.id === confirmTarget.id ? { ...r, status: "REFUNDED" } : r))
      );
      toast.success("Receipt confirmed — refund initiated for customer");
      closeConfirm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setConfirming(false);
    }
  };

  const filtered =
    filterStatus === "ALL" ? returns : returns.filter((r) => r.status === filterStatus);

  const statusCounts = returns.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (returns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-[15px] font-semibold text-foreground">No return requests</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          When customers request returns, they&apos;ll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["REQUESTED", "APPROVED", "REJECTED", "REFUNDED"] as const).map((status) => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? "ALL" : status)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                filterStatus === status
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", filterStatus === status ? "bg-background/20" : "bg-muted")}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">{statusCounts[status] ?? 0}</div>
                <div className={cn("truncate text-[11px]", filterStatus === status ? "text-background/70" : "text-muted-foreground")}>
                  {cfg.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filterStatus !== "ALL" && (
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">
            Showing {STATUS_CONFIG[filterStatus as ReturnItem["status"]].label} returns
          </span>
          <button onClick={() => setFilterStatus("ALL")} className="text-[12px] font-medium text-foreground underline underline-offset-2">
            Clear filter
          </button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[12px] font-semibold">Return ID</TableHead>
              <TableHead className="text-[12px] font-semibold">Product</TableHead>
              <TableHead className="text-[12px] font-semibold">Customer</TableHead>
              <TableHead className="text-[12px] font-semibold">Reason</TableHead>
              <TableHead className="text-[12px] font-semibold">Refund</TableHead>
              <TableHead className="text-[12px] font-semibold">Status</TableHead>
              <TableHead className="text-[12px] font-semibold">Shipping</TableHead>
              <TableHead className="text-[12px] font-semibold">Date</TableHead>
              <TableHead className="text-right text-[12px] font-semibold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((ret) => {
              const cfg = STATUS_CONFIG[ret.status];
              const Icon = cfg.icon;
              const walletDeduction =
                (ret.refundAmount ?? 0) + (ret.shippingChargedTo === "SELLER" ? 70 : 0);

              return (
                <TableRow key={ret.id} className="group hover:bg-muted/30">
                  <TableCell className="font-mono text-[12px] text-muted-foreground">
                    #{ret.id.slice(-8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[160px]">
                      <div className="truncate text-[13px] font-medium">{ret.product.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        Order #{(ret.order.orderId || ret.order.id).slice(-8).toUpperCase()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[13px] font-medium">{ret.buyer.name || "—"}</div>
                    <div className="text-[11px] text-muted-foreground">{ret.buyer.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[13px]">{REASON_LABELS[ret.reason] || ret.reason}</div>
                    {ret.description && (
                      <div className="mt-0.5 max-w-[140px] truncate text-[11px] text-muted-foreground" title={ret.description}>
                        {ret.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-[13px] font-medium">
                    {formatPrice(ret.refundAmount ?? 0)}
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium", cfg.color)}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px]">
                    {ret.status === "APPROVED" ? (
                      <div className="space-y-0.5">
                        <div className={cn("text-[10px] font-medium", ret.shippingChargedTo === "SELLER" ? "text-orange-600" : "text-purple-600")}>
                          {ret.shippingChargedTo === "SELLER" ? "You pay ₹70" : "Customer pays ₹70"}
                        </div>
                        {ret.customerTrackingId && (
                          <div className="font-mono text-[10px] text-muted-foreground">
                            Tracking: {ret.customerTrackingId}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {formatDate(ret.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {ret.status === "APPROVED" && (
                      <Button
                        size="sm"
                        onClick={() => openConfirm(ret)}
                        className="h-7 gap-1 bg-green-600 hover:bg-green-700 text-[11px] font-medium text-white"
                      >
                        <CheckCheck className="h-3 w-3" />
                        Received — Refund {formatPrice(walletDeduction)}
                      </Button>
                    )}
                    {ret.status === "REQUESTED" && (
                      <span className="text-[11px] text-muted-foreground">Awaiting admin</span>
                    )}
                    {(ret.status === "REJECTED" || ret.status === "REFUNDED") && (
                      <span className="text-[12px] text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-[13px] text-muted-foreground">
            No {filterStatus.toLowerCase()} returns found.
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((ret) => {
          const cfg = STATUS_CONFIG[ret.status];
          const Icon = cfg.icon;
          const walletDeduction =
            (ret.refundAmount ?? 0) + (ret.shippingChargedTo === "SELLER" ? 70 : 0);

          return (
            <div key={ret.id} className="rounded-xl border border-border bg-background p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{ret.product.name}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    #{ret.id.slice(-8).toUpperCase()}
                  </div>
                </div>
                <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", cfg.color)}>
                  <Icon className="h-2.5 w-2.5" />
                  {cfg.label}
                </span>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <span className="text-muted-foreground">Customer</span>
                  <div className="font-medium">{ret.buyer.name || ret.buyer.email}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Refund</span>
                  <div className="font-medium">{formatPrice(ret.refundAmount ?? 0)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Reason</span>
                  <div className="font-medium">{REASON_LABELS[ret.reason] || ret.reason}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <div className="font-medium">{formatDate(ret.createdAt)}</div>
                </div>
              </div>

              {ret.status === "APPROVED" && ret.customerTrackingId && (
                <div className="mb-3 flex items-center gap-1.5 text-[12px] text-blue-600">
                  <Truck className="h-3.5 w-3.5" />
                  Tracking: <span className="font-mono">{ret.customerTrackingId}</span>
                </div>
              )}

              {ret.status === "APPROVED" && (
                <Button
                  size="sm"
                  onClick={() => openConfirm(ret)}
                  className="h-8 w-full gap-1 bg-green-600 hover:bg-green-700 text-[12px] font-medium text-white"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Product Received — Trigger Refund {formatPrice(walletDeduction)}
                </Button>
              )}
              {ret.status === "REQUESTED" && (
                <p className="text-center text-[12px] text-muted-foreground">Awaiting admin approval</p>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-8 text-center text-[13px] text-muted-foreground">
            No {filterStatus.toLowerCase()} returns found.
          </div>
        )}
      </div>

      {/* Confirm Receipt Dialog */}
      <Dialog open={!!confirmTarget} onOpenChange={closeConfirm}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[16px]">
              <CheckCheck className="h-5 w-5 text-green-600" />
              Confirm Product Received
            </DialogTitle>
            <DialogDescription>
              This triggers an automatic refund to the customer.
            </DialogDescription>
          </DialogHeader>

          {confirmTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-[13px]">
                <div className="mb-1 font-medium">{confirmTarget.product.name}</div>
                <div className="text-muted-foreground">
                  {confirmTarget.buyer.name || confirmTarget.buyer.email}
                </div>
                <div className="mt-1 text-muted-foreground">
                  Refund to customer: <span className="font-medium">{formatPrice(confirmTarget.refundAmount ?? 0)}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20 px-3 py-2.5 text-[12px] text-amber-700 dark:text-amber-400">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Your wallet will be debited{" "}
                  <strong>
                    {formatPrice(
                      (confirmTarget.refundAmount ?? 0) +
                        (confirmTarget.shippingChargedTo === "SELLER" ? 70 : 0)
                    )}
                  </strong>
                  {confirmTarget.shippingChargedTo === "SELLER"
                    ? " (product price + ₹70 return shipping, seller fault)"
                    : " (product price only, customer paid shipping)"}
                  .
                </span>
              </div>

              {confirmTarget.order.isCOD && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800/40 dark:bg-blue-900/20 px-3 py-2.5 text-[12px] text-blue-700 dark:text-blue-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  This was a COD order. The support team will arrange the customer refund manually.
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={closeConfirm} disabled={confirming} className="text-[13px]">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReceipt}
              disabled={confirming}
              className="gap-1.5 text-[13px] bg-green-600 hover:bg-green-700 text-white"
            >
              {confirming ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Processing…</>
              ) : (
                <><CheckCircle2 className="h-3.5 w-3.5" />Confirm & Trigger Refund</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
