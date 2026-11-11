"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { BankAccountForm } from "@/components/seller/BankAccountForm";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Clock,
  CheckCircle2, XCircle, Loader2, TrendingUp, IndianRupee, AlertCircle, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  initiatedAt: string;
}

interface WalletData {
  walletBalance: number;
  pendingPayouts: number;
  heldForReturns: number;
  activeReturnsCount: number;
  availableBalance: number;
  transactions: Transaction[];
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }>; cls: string }> = {
  PENDING:    { label: "Pending",    icon: Clock,        cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30" },
  PROCESSING: { label: "Processing", icon: Loader2,      cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30" },
  PROCESSED:  { label: "Paid",       icon: CheckCircle2, cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30" },
  FAILED:     { label: "Failed",     icon: XCircle,      cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30" },
};

const PAYOUTS_CACHE_KEY = "nxc-payouts-v1";

export default function PayoutsPage() {
  const { user } = useAuthContext();

  // Seed instantly from localStorage cache — no spinner on repeat visits
  const cached = (() => {
    try {
      const raw = localStorage.getItem(PAYOUTS_CACHE_KEY);
      return raw ? (JSON.parse(raw) as { wallet: WalletData | null; payouts: Payout[] }) : null;
    } catch {
      return null;
    }
  })();

  const [wallet, setWallet] = useState<WalletData | null>(cached?.wallet ?? null);
  const [payouts, setPayouts] = useState<Payout[]>(cached?.payouts ?? []);
  const [loading, setLoading] = useState(!cached);
  const [requesting, setRequesting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");

  const fetchData = async () => {
    if (!user) return;
    const token = user.uid;
    const [wRes, pRes] = await Promise.all([
      fetch("/api/sellers/wallet", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/sellers/payout",  { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    let nextWallet = wallet;
    let nextPayouts = payouts;
    if (wRes.ok) { nextWallet = await wRes.json(); setWallet(nextWallet); }
    if (pRes.ok) { const d = await pRes.json(); nextPayouts = d.payouts ?? []; setPayouts(nextPayouts); }
    try { localStorage.setItem(PAYOUTS_CACHE_KEY, JSON.stringify({ wallet: nextWallet, payouts: nextPayouts })); } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestPayout = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 500) { toast.error("Minimum payout is ₹500"); return; }
    if (!user) return;
    setRequesting(true);
    try {
      const res = await fetch("/api/sellers/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.uid}` },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Payout request submitted! NexCart will transfer within 2–3 business days.");
      setShowForm(false);
      setAmount("");
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request payout");
    } finally {
      setRequesting(false);
    }
  };

  const available  = wallet?.availableBalance ?? 0;
  const balance    = wallet?.walletBalance ?? 0;
  const pending    = wallet?.pendingPayouts ?? 0;
  const held       = wallet?.heldForReturns ?? 0;
  const activeReturnsCount = wallet?.activeReturnsCount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Wallet &amp; Payouts</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your earnings and request withdrawals</p>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Balance cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/50 p-5 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Wallet Balance</span>
              </div>
              <p className={cn("text-2xl font-bold", balance < 0 ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                {formatPrice(balance)}
              </p>
              <p className="text-xs text-muted-foreground">Total earnings credited</p>
            </div>

            <div className="rounded-xl border border-border/50 p-5 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Pending Payouts</span>
              </div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatPrice(pending)}</p>
              <p className="text-xs text-muted-foreground">Awaiting processing</p>
            </div>

            <div className="rounded-xl border border-border/50 p-5 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <RotateCcw className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Held for Returns</span>
              </div>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatPrice(held)}</p>
              <p className="text-xs text-muted-foreground">
                {activeReturnsCount > 0
                  ? `Reserved for ${activeReturnsCount} active return${activeReturnsCount === 1 ? "" : "s"}`
                  : "No active returns"}
              </p>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Available to Withdraw</span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatPrice(available)}</p>
              <p className="text-xs text-muted-foreground">Ready for payout</p>
            </div>
          </div>

          {/* Info banner */}
          <div className="rounded-xl border border-border/50 p-4 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">How it works: </span>
              When a customer places an order, the product amount is credited to your wallet.
              A delivery fee of <span className="font-semibold text-foreground">₹54</span> is deducted when you ship via Shiprocket.
              If a customer requests a return, the refund amount (and return shipping, if the issue was on your end)
              is held from your available balance until the return is resolved — this keeps your withdrawable balance accurate
              and avoids surprise deductions later.
              Request a payout anytime (minimum ₹500) and NexCart will transfer to your bank account within 2–3 business days.
            </p>
          </div>

          {/* Request payout */}
          <div className="rounded-xl border border-border/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Request Payout</h2>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  disabled={available < 500}
                  className="flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <IndianRupee className="h-3.5 w-3.5" />
                  Request Payout
                </button>
              )}
            </div>

            {available < 500 && !showForm && (
              <p className="text-xs text-muted-foreground">Minimum payout is ₹500. Keep selling to unlock withdrawals!</p>
            )}

            {showForm && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Amount (₹)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount (min ₹500)"
                      max={available}
                      className="flex h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => setAmount(String(Math.floor(available)))}
                      className="shrink-0 rounded-xl border border-border/60 px-3 text-xs font-medium hover:bg-muted/40 transition-colors"
                    >
                      Max
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Available: {formatPrice(available)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={requestPayout}
                    disabled={requesting}
                    className="flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {requesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirm Request
                  </button>
                  <button
                    onClick={() => { setShowForm(false); setAmount(""); }}
                    className="rounded-xl border border-border/60 px-4 py-2 text-xs font-medium hover:bg-muted/40 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payout history */}
          {payouts.length > 0 && (
            <div className="rounded-xl border border-border/50 divide-y divide-border/40">
              <div className="px-5 py-3">
                <h2 className="font-semibold text-sm">Payout History</h2>
              </div>
              {payouts.map((p) => {
                const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.PENDING;
                const Icon = cfg.icon;
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{formatPrice(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.initiatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", cfg.cls)}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Transaction history */}
          {(wallet?.transactions ?? []).length > 0 && (
            <div className="rounded-xl border border-border/50 divide-y divide-border/40">
              <div className="px-5 py-3">
                <h2 className="font-semibold text-sm">Transaction History</h2>
              </div>
              {(wallet?.transactions ?? []).map((t) => {
                const isCredit = t.type === "ORDER_CREDIT";
                return (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-4">
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      isCredit ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                    )}>
                      {isCredit
                        ? <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                        : <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <p className={cn("text-sm font-semibold shrink-0", isCredit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                      {isCredit ? "+" : "-"}{formatPrice(t.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {(wallet?.transactions ?? []).length === 0 && payouts.length === 0 && (
            <div className="rounded-xl border border-border/50 py-16 text-center space-y-2">
              <Wallet className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium">No transactions yet</p>
              <p className="text-xs text-muted-foreground">Earnings will appear here once customers place orders</p>
            </div>
          )}

          {/* Bank account section */}
          <div id="bank-account">
            <h2 className="font-semibold mb-4">Bank Account</h2>
            <BankAccountForm />
          </div>
        </>
      )}
    </div>
  );
}
