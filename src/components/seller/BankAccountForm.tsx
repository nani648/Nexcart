"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Landmark, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string | null;
  branchName: string | null;
  accountType: string;
  isVerified: boolean;
}

export function BankAccountForm() {
  const { user } = useAuth();
  const [existing, setExisting] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [ifscLoading, setIfscLoading] = useState(false);

  const [form, setForm] = useState({
    accountHolderName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    accountType: "savings",
    bankName: "",
    branchName: "",
  });

  const accountHolderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBankAccount();
  }, []);

  // If arriving via "#bank-account" link, reveal the form (if an account
  // already exists) so there's something to focus.
  useEffect(() => {
    if (loading) return;
    if (typeof window === "undefined" || window.location.hash !== "#bank-account") return;
    if (existing) setShowForm(true);
  }, [loading, existing]);

  // Scroll the section into view and focus the first field of the form.
  useEffect(() => {
    if (loading) return;
    if (typeof window === "undefined" || window.location.hash !== "#bank-account") return;
    const el = document.getElementById("bank-account");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!existing || showForm) {
      const t = setTimeout(() => accountHolderRef.current?.focus(), 400);
      return () => clearTimeout(t);
    }
  }, [loading, existing, showForm]);

  async function fetchBankAccount() {
    try {
      const token = user?.uid;
      const res = await fetch("/api/seller/bank-account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setExisting(data.bankAccount);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function lookupIFSC(ifsc: string) {
    if (ifsc.length !== 11) return;
    setIfscLoading(true);
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);
      if (res.ok) {
        const data = await res.json();
        setForm((f) => ({
          ...f,
          bankName: data.BANK || "",
          branchName: data.BRANCH || "",
        }));
      }
    } catch {
      // ignore
    } finally {
      setIfscLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.accountNumber !== form.confirmAccountNumber) {
      toast.error("Account numbers do not match");
      return;
    }
    setSaving(true);
    try {
      const token = user?.uid;
      const res = await fetch("/api/seller/bank-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountHolderName: form.accountHolderName,
          accountNumber: form.accountNumber,
          ifscCode: form.ifscCode.toUpperCase(),
          accountType: form.accountType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Bank account saved successfully");
      setShowForm(false);
      fetchBankAccount();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save bank account");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Remove your bank account details?")) return;
    try {
      const token = user?.uid;
      await fetch("/api/seller/bank-account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setExisting(null);
      toast.success("Bank account removed");
    } catch {
      toast.error("Failed to remove bank account");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading bank details…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="w-5 h-5" />
          Bank Account for Payouts
        </CardTitle>
        <CardDescription>
          Your earnings will be transferred to this account, after NexCart&apos;s
          category-based commission is deducted from each order.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {existing && !showForm ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{existing.accountHolderName}</span>
                  {existing.isVerified ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                      <AlertCircle className="w-3 h-3 mr-1" /> Pending verification
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {existing.bankName || "Bank"} • {existing.accountNumber} •{" "}
                  {existing.ifscCode}
                </p>
                {existing.branchName && (
                  <p className="text-xs text-muted-foreground">{existing.branchName}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                  Update
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              To request a payout, go to your Payout History tab and click &quot;Request Payout&quot; on
              any delivered order.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Account Holder Name</Label>
                <Input
                  ref={accountHolderRef}
                  placeholder="As per bank records"
                  value={form.accountHolderName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accountHolderName: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Account Number</Label>
                <Input
                  type="password"
                  placeholder="Enter account number"
                  value={form.accountNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accountNumber: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm Account Number</Label>
                <Input
                  placeholder="Re-enter account number"
                  value={form.confirmAccountNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, confirmAccountNumber: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>IFSC Code</Label>
                <Input
                  placeholder="e.g. SBIN0001234"
                  value={form.ifscCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setForm((f) => ({ ...f, ifscCode: val }));
                    if (val.length === 11) lookupIFSC(val);
                  }}
                  maxLength={11}
                  required
                />
                {ifscLoading && (
                  <p className="text-xs text-muted-foreground">Looking up bank details…</p>
                )}
                {form.bankName && (
                  <p className="text-xs text-green-600">
                    ✓ {form.bankName} — {form.branchName}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Account Type</Label>
                <Select
                  value={form.accountType}
                  onValueChange={(v) => setForm((f) => ({ ...f, accountType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Bank Account"}
              </Button>
              {existing && (
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
