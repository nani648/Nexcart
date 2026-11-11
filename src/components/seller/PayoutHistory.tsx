"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IndianRupee, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Payout {
  payoutId: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED";
  failureReason: string | null;
  razorpayPayoutId: string | null;
  initiatedAt: string;
  processedAt: string | null;
  order: { orderId: string; totalAmount: number; createdAt: string } | null;
}

interface Summary {
  totalEarned: number;
  totalPaidOut: number;
  pendingAmount: number;
  totalPlatformFee: number;
}

const statusConfig = {
  PENDING: { label: "Pending", icon: Clock, className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  PROCESSING: { label: "Processing", icon: Loader2, className: "bg-blue-100 text-blue-700 border-blue-200" },
  PROCESSED: { label: "Paid", icon: CheckCircle, className: "bg-green-100 text-green-700 border-green-200" },
  FAILED: { label: "Failed", icon: XCircle, className: "bg-red-100 text-red-700 border-red-200" },
};

function fmt(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function PayoutHistory() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [requesting, setRequesting] = useState<string | null>(null);

  const fetchPayouts = useCallback(async () => {
    try {
      const token = user?.uid;
      const res = await fetch(
        `/api/seller/payouts?status=${statusFilter === "all" ? "" : statusFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setPayouts(data.payouts || []);
      setSummary(data.summary || null);
    } catch {
      toast.error("Failed to load payout history");
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  async function requestPayout(orderId: string) {
    setRequesting(orderId);
    try {
      const token = user?.uid;
      const res = await fetch("/api/seller/payouts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Payout requested! Admin will process it shortly.");
      fetchPayouts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request payout");
    } finally {
      setRequesting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Earned", value: fmt(summary.totalEarned), color: "text-foreground" },
            { label: "Total Paid Out", value: fmt(summary.totalPaidOut), color: "text-green-600" },
            { label: "Pending", value: fmt(summary.pendingAmount), color: "text-yellow-600" },
            { label: "Platform Fee Paid", value: fmt(summary.totalPlatformFee), color: "text-muted-foreground" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter + table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <IndianRupee className="w-4 h-4" />
            Payout History
          </CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-sm">
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : payouts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No payouts yet. Payouts are created automatically when orders are confirmed.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Order</th>
                    <th className="pb-2 font-medium text-right">Gross</th>
                    <th className="pb-2 font-medium text-right">Fee</th>
                    <th className="pb-2 font-medium text-right">Net</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                    <th className="pb-2 font-medium">Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payouts.map((p) => {
                    const s = statusConfig[p.status];
                    const Icon = s.icon;
                    return (
                      <tr key={p.payoutId} className="hover:bg-muted/30">
                        <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                          {new Date(p.initiatedAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs">
                          {p.order?.orderId?.slice(0, 10) || "—"}
                        </td>
                        <td className="py-3 pr-4 text-right">{fmt(p.amount)}</td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">
                          {p.platformFee > 0 ? fmt(p.platformFee) : "—"}
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold">{fmt(p.netAmount)}</td>
                        <td className="py-3 pr-4 text-center">
                          <Badge className={`${s.className} gap-1 text-xs`}>
                            <Icon className="w-3 h-3" />
                            {s.label}
                          </Badge>
                        </td>
                        <td className="py-3 text-xs text-muted-foreground font-mono">
                          {p.razorpayPayoutId
                            ? p.razorpayPayoutId.slice(0, 12) + "…"
                            : p.status === "PENDING"
                            ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs px-2"
                                disabled={requesting === p.order?.orderId}
                                onClick={() =>
                                  p.order && requestPayout(p.order.orderId)
                                }
                              >
                                {requesting === p.order?.orderId ? "…" : "Request"}
                              </Button>
                            )
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
