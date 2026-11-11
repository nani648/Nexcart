"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  Loader2,
  CheckCheck,
  Truck,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ReturnRow {
  id: string;
  returnId: string;
  reason: string;
  description: string | null;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDED";
  refundAmount: number;
  sellerNote: string | null;
  shippingChargedTo: string;
  reverseAwb: string | null;
  customerTrackingId: string | null;
  codRefundRef: string | null;
  createdAt: string;
  approvedAt: string | null;
  order:   { orderId: string; isCOD: boolean };
  product: { name: string; images: string[] };
  buyer:   { name: string | null; email: string };
  seller:  { storeName: string; sellerId: string; storeAddress: string | null };
}

const STATUS_STYLES: Record<ReturnRow["status"], string> = {
  REQUESTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40",
  APPROVED:  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40",
  REJECTED:  "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40",
  REFUNDED:  "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/40",
};

const REASON_LABELS: Record<string, string> = {
  DAMAGED:          "Damaged",
  WRONG_ITEM:       "Wrong Item",
  NOT_AS_DESCRIBED: "Not as Described",
  DEFECTIVE:        "Defective",
  CHANGE_OF_MIND:   "Change of Mind",
  OTHER:            "Other",
};

const SELLER_FAULT_REASONS = ["DEFECTIVE", "WRONG_ITEM", "NOT_AS_DESCRIBED", "DAMAGED"];

const STATUS_TABS = ["ALL", "REQUESTED", "APPROVED", "REJECTED", "REFUNDED"] as const;

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminReturnsPage() {
  const { user, loading: authLoading } = useAuthContext();

  const [returns, setReturns]           = useState<ReturnRow[]>([]);
  const [total, setTotal]               = useState(0);
  const [pages, setPages]               = useState(1);
  const [page, setPage]                 = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [fetching, setFetching]         = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const [selected, setSelected]   = useState<ReturnRow | null>(null);
  const [action, setAction]       = useState<"APPROVE" | "REJECT" | "MARK_REFUNDED" | "RECORD_COD_REFUND" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [codRefundRef, setCodRefundRef] = useState("");
  const [acting, setActing]       = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        ...(filterStatus !== "ALL" ? { status: filterStatus } : {}),
      });
      const res = await fetch(`/api/admin/returns?${params}`, {
        headers: { Authorization: `Bearer ${user.uid}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
      const data = await res.json();
      setReturns(data.returns ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load returns");
    } finally {
      setFetching(false);
    }
  }, [user, page, filterStatus]);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  const openAction = (row: ReturnRow, act: "APPROVE" | "REJECT" | "MARK_REFUNDED" | "RECORD_COD_REFUND") => {
    setSelected(row);
    setAction(act);
    setAdminNote("");
    setCodRefundRef("");
  };

  const closeDialog = () => {
    setSelected(null);
    setAction(null);
    setAdminNote("");
    setCodRefundRef("");
  };

  const handleAction = async () => {
    if (!selected || !action || !user) return;
    setActing(true);
    try {
      if (action === "RECORD_COD_REFUND") {
        if (!codRefundRef.trim()) { toast.error("Enter a refund reference"); setActing(false); return; }
        const res = await fetch(`/api/admin/returns/${selected.id}/cod-refund`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.uid}` },
          body: JSON.stringify({ refundRef: codRefundRef.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to record refund");
        setReturns((prev) =>
          prev.map((r) =>
            r.id === selected.id ? { ...r, status: "REFUNDED", codRefundRef: codRefundRef.trim() } : r
          )
        );
        toast.success("COD refund recorded — buyer notified");
        closeDialog();
        return;
      }

      const res = await fetch("/api/admin/returns", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.uid}`,
        },
        body: JSON.stringify({ returnId: selected.id, action, adminNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");

      const newStatus =
        action === "APPROVE" ? "APPROVED" :
        action === "REJECT"  ? "REJECTED" : "REFUNDED";

      setReturns((prev) =>
        prev.map((r) => {
          if (r.id !== selected.id) return r;
          const patch: Partial<ReturnRow> = {
            status: newStatus as ReturnRow["status"],
            sellerNote: adminNote || r.sellerNote,
          };
          // Sync server-computed fields so table is correct without reload
          if (action === "APPROVE" && data.return) {
            patch.shippingChargedTo = data.return.shippingChargedTo;
            patch.refundAmount      = data.return.refundAmount;
          }
          return { ...r, ...patch };
        })
      );

      toast.success(
        action === "APPROVE" ? "Return approved — seller notified" :
        action === "REJECT"  ? "Return rejected"                   : "Marked as refunded"
      );
      closeDialog();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  const counts = returns.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (authLoading || fetching) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-semibold">Could not load returns</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground">
            <RotateCcw className="h-4 w-4 text-background" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Returns & Disputes</h1>
            <p className="text-sm text-muted-foreground">
              {total} return request{total !== 1 ? "s" : ""} across all sellers
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={load} className="gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setFilterStatus(tab); setPage(1); }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              filterStatus === tab
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            {tab !== "ALL" && counts[tab] ? (
              <span className="ml-1.5 opacity-70">({counts[tab]})</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Table */}
      {returns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <RotateCcw className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No returns found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {filterStatus !== "ALL"
              ? `No ${filterStatus.toLowerCase()} returns at the moment.`
              : "No return requests have been submitted yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {["Return ID", "Order", "Product", "Buyer", "Seller", "Reason", "Refund", "Shipping", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {returns.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        #{row.id.slice(-8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        #{row.order.orderId.slice(-8).toUpperCase()}
                      </span>
                      {row.order.isCOD && (
                        <span className="ml-1 text-[10px] text-amber-600">COD</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[130px]">
                      <div className="truncate text-[13px] font-medium" title={row.product.name}>
                        {row.product.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px]">{row.buyer.name || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{row.buyer.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium">{row.seller.storeName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px]">{REASON_LABELS[row.reason] ?? row.reason}</div>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium">
                      {fmt(row.refundAmount ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "APPROVED" || row.status === "REFUNDED" ? (
                        <span className={cn(
                          "text-[10px] font-medium rounded-full px-2 py-0.5 border",
                          row.shippingChargedTo === "SELLER"
                            ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400"
                            : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400"
                        )}>
                          {row.shippingChargedTo === "SELLER" ? "Seller pays ₹70" : "Customer pays ₹70"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {SELLER_FAULT_REASONS.includes(row.reason) ? "Seller" : "Customer"}
                        </span>
                      )}
                      {row.customerTrackingId && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-600">
                          <Truck className="h-2.5 w-2.5" />
                          {row.customerTrackingId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        STATUS_STYLES[row.status]
                      )}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                      {fmtDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {row.status === "REQUESTED" && (
                          <button
                            onClick={() => openAction(row, "APPROVE")}
                            className="flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400"
                          >
                            <CheckCheck className="h-3 w-3" />
                            Approve
                          </button>
                        )}
                        {(row.status === "REQUESTED" || row.status === "APPROVED") && (
                          <button
                            onClick={() => openAction(row, "REJECT")}
                            className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400"
                          >
                            <XCircle className="h-3 w-3" />
                            Reject
                          </button>
                        )}
                        {row.status === "APPROVED" && row.order.isCOD && (
                          <button
                            onClick={() => openAction(row, "RECORD_COD_REFUND")}
                            className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400"
                          >
                            <Banknote className="h-3 w-3" />
                            Record Refund
                          </button>
                        )}
                        {row.status === "APPROVED" && !row.order.isCOD && (
                          <button
                            onClick={() => openAction(row, "MARK_REFUNDED")}
                            className="flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-800/40 dark:bg-green-900/20 dark:text-green-400"
                          >
                            Override
                          </button>
                        )}
                        {row.status === "REFUNDED" && (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 text-[11px] text-green-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Refunded
                            </span>
                            {row.codRefundRef && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {row.codRefundRef}
                              </span>
                            )}
                          </div>
                        )}
                        {row.status === "REJECTED" && (
                          <span className="text-[11px] text-muted-foreground">Closed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-muted-foreground">
            Page {page} of {pages} · {total} total
          </span>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 gap-1 px-2 text-xs">
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="h-8 gap-1 px-2 text-xs">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Action dialog */}
      <Dialog open={!!selected && !!action} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {action === "APPROVE"          && <><CheckCheck className="h-5 w-5 text-blue-600" />Approve Return</>}
              {action === "REJECT"           && <><XCircle className="h-5 w-5 text-red-600" />Reject Return</>}
              {action === "MARK_REFUNDED"    && <><CheckCircle2 className="h-5 w-5 text-green-600" />Override: Mark as Refunded</>}
              {action === "RECORD_COD_REFUND"&& <><Banknote className="h-5 w-5 text-amber-600" />Record COD Refund</>}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-[13px]">
                <div className="font-medium">{selected.product.name}</div>
                <div className="mt-0.5 text-muted-foreground">
                  {selected.buyer.name || selected.buyer.email} · {fmt(selected.refundAmount ?? 0)}
                </div>
                <div className="mt-0.5 text-muted-foreground">Seller: {selected.seller.storeName}</div>
                {selected.seller.storeAddress && (
                  <div className="mt-0.5 text-[12px] text-muted-foreground">
                    Address: {selected.seller.storeAddress}
                  </div>
                )}
              </div>

              {action === "APPROVE" && (
                <>
                  <div className={cn(
                    "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12px]",
                    SELLER_FAULT_REASONS.includes(selected.reason)
                      ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/40 dark:bg-orange-900/20 dark:text-orange-400"
                      : "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/40 dark:bg-purple-900/20 dark:text-purple-400"
                  )}>
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {SELLER_FAULT_REASONS.includes(selected.reason)
                      ? `Seller fault (${REASON_LABELS[selected.reason] ?? selected.reason}): seller pays ₹70 return shipping. Customer gets full refund of ${fmt(selected.refundAmount ?? 0)}.`
                      : `Customer fault (${REASON_LABELS[selected.reason] ?? selected.reason}): customer pays ₹70 shipping. Customer refund will be ${fmt(Math.max(0, (selected.refundAmount ?? 0) - 70))}.`}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    After approval, the customer will be asked to ship the product to the seller&apos;s address. Once the seller confirms receipt, the refund is automatically triggered.
                  </div>
                </>
              )}

              {action === "MARK_REFUNDED" && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Emergency override only. No Razorpay refund will be triggered — use this only after manually processing the refund elsewhere.
                </div>
              )}

              {action === "RECORD_COD_REFUND" && (
                <>
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    This is a COD order. Manually transfer the refund amount to the customer via UPI/bank and enter the transaction reference below.
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Refund reference <span className="text-red-500">*</span></Label>
                    <input
                      type="text"
                      placeholder="e.g. UPI/2406101234/ABC or bank ref number"
                      value={codRefundRef}
                      onChange={(e) => setCodRefundRef(e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-foreground/20"
                    />
                  </div>
                </>
              )}

              {action !== "RECORD_COD_REFUND" && (
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Admin note (optional)</Label>
                  <Textarea
                    placeholder={
                      action === "APPROVE" ? "e.g. Approved after reviewing evidence..." :
                      action === "REJECT"  ? "e.g. Item condition is acceptable, return rejected..." :
                      "e.g. Refund processed manually via Razorpay dashboard..."
                    }
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="min-h-[72px] resize-none text-[13px]"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={acting} className="text-[13px]">
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={acting || (action === "RECORD_COD_REFUND" && !codRefundRef.trim())}
              className={cn(
                "gap-1.5 text-[13px]",
                action === "APPROVE"           ? "bg-blue-600 hover:bg-blue-700 text-white" :
                action === "REJECT"            ? "bg-red-600 hover:bg-red-700 text-white"   :
                action === "RECORD_COD_REFUND" ? "bg-amber-600 hover:bg-amber-700 text-white" :
                "bg-green-600 hover:bg-green-700 text-white"
              )}
            >
              {acting ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Processing…</>
              ) : action === "APPROVE" ? (
                "Approve Return"
              ) : action === "REJECT" ? (
                "Confirm Rejection"
              ) : action === "RECORD_COD_REFUND" ? (
                "Record COD Refund"
              ) : (
                "Mark as Refunded"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
