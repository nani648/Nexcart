"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IndianRupee, CheckCircle, XCircle, Clock, Loader2, Building2, CopyIcon } from "lucide-react";
import { toast } from "sonner";

interface BankAccount {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string | null;
  accountType: string;
}

interface Payout {
  payoutId: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED";
  failureReason: string | null;
  razorpayPayoutId: string | null;
  narration: string | null;
  initiatedAt: string;
  processedAt: string | null;
  seller: {
    storeName: string;
    sellerId: string;
    walletBalance: number;
    user: { name: string | null; email: string };
    bankAccount: BankAccount | null;
  };
  order: { orderId: string; totalAmount: number } | null;
}

const statusConfig = {
  PENDING: { label: "Pending", icon: Clock, className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  PROCESSING: { label: "Processing", icon: Loader2, className: "bg-blue-100 text-blue-700 border-blue-200" },
  PROCESSED: { label: "Paid", icon: CheckCircle, className: "bg-green-100 text-green-700 border-green-200" },
  FAILED: { label: "Failed", icon: XCircle, className: "bg-red-100 text-red-700 border-red-200" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function AdminPayoutsPage() {
  const { user } = useAuthContext();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [pendingSummary, setPendingSummary] = useState({ count: 0, totalAmount: 0 });

  const fetchPayouts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(
        `/api/admin/payouts?status=${statusFilter === "all" ? "" : statusFilter}&limit=50`,
        { headers: { Authorization: `Bearer ${user.uid}` } }
      );
      const data = await res.json();
      setPayouts(data.payouts || []);
      setPendingSummary(data.pendingSummary || { count: 0, totalAmount: 0 });
    } catch {
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  async function callAction(payoutId: string, action: "process" | "fail", failureReason?: string) {
    setProcessing(payoutId + action);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { Authorization: `Bearer ${user!.uid}`, "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId, action, failureReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (action === "process") {
        toast.success(data.mode === "automatic" ? "Payout initiated via Razorpay" : "Marked as paid — seller wallet updated");
      } else {
        toast.success("Payout marked as failed");
      }
      fetchPayouts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setProcessing(null);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payout Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Review and pay seller payout requests.</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="PROCESSED">Paid</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Pending Requests</p>
            <p className="text-2xl font-bold text-amber-600">{pendingSummary.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Pending Amount</p>
            <p className="text-2xl font-bold text-amber-600">{fmt(pendingSummary.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IndianRupee className="w-4 h-4" />
            Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : payouts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No payouts found.</div>
          ) : (
            <div className="space-y-4">
              {payouts.map((p) => {
                const s = statusConfig[p.status];
                const Icon = s.icon;
                const bank = p.seller.bankAccount;
                const isProcessing = processing === p.payoutId + "process";
                const isFailing = processing === p.payoutId + "fail";

                return (
                  <div key={p.payoutId} className="rounded-xl border border-border/60 p-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-sm">{p.seller.storeName}</p>
                        <p className="text-xs text-muted-foreground">{p.seller.user.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Requested: {new Date(p.initiatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{fmt(p.netAmount)}</p>
                        <Badge className={`${s.className} gap-1 text-xs mt-1`}>
                          <Icon className="w-3 h-3" />
                          {s.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Bank account details */}
                    {bank ? (
                      <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          <Building2 className="w-3.5 h-3.5" />
                          Transfer to
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground">Account Holder</span>
                            <p className="font-medium">{bank.accountHolderName}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Bank</span>
                            <p className="font-medium">{bank.bankName ?? "—"}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Account Number</span>
                            <div className="flex items-center gap-1.5">
                              <p className="font-mono font-semibold">{bank.accountNumber}</p>
                              <button onClick={() => copy(bank.accountNumber, "Account number")} className="text-muted-foreground hover:text-foreground transition-colors">
                                <CopyIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">IFSC Code</span>
                            <div className="flex items-center gap-1.5">
                              <p className="font-mono font-semibold">{bank.ifscCode}</p>
                              <button onClick={() => copy(bank.ifscCode, "IFSC code")} className="text-muted-foreground hover:text-foreground transition-colors">
                                <CopyIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{bank.accountType} account</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
                        No bank account added by seller — cannot process payout.
                      </div>
                    )}

                    {/* Failure reason */}
                    {p.status === "FAILED" && p.failureReason && (
                      <p className="text-xs text-red-600 dark:text-red-400">Reason: {p.failureReason}</p>
                    )}

                    {/* Razorpay payout ID */}
                    {p.razorpayPayoutId && (
                      <p className="text-xs text-muted-foreground font-mono">Razorpay ID: {p.razorpayPayoutId}</p>
                    )}

                    {/* Actions — only for PENDING */}
                    {p.status === "PENDING" && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          disabled={!!processing || !bank}
                          onClick={() => callAction(p.payoutId, "process")}
                        >
                          {isProcessing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                          Mark as Paid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          disabled={!!processing}
                          onClick={() => callAction(p.payoutId, "fail", "Rejected by admin")}
                        >
                          {isFailing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          Mark as Failed
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
