"use client";

import { useState } from "react";
import { Shield, CreditCard, Smartphone, Building2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Tab = "upi" | "card" | "netbanking" | "cod";

interface UpiApp {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

const UPI_APPS: UpiApp[] = [
  { id: "phonepe", label: "PhonePe", emoji: "📱", color: "text-purple-600" },
  { id: "gpay", label: "GPay", emoji: "💚", color: "text-blue-500" },
  { id: "paytm", label: "Paytm", emoji: "🔵", color: "text-sky-500" },
  { id: "bhim", label: "BHIM", emoji: "🟡", color: "text-orange-500" },
];

const BANKS = ["SBI", "HDFC", "ICICI", "Axis", "Kotak", "Other"];

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function detectCardType(v: string): string {
  const d = v.replace(/\s/g, "")[0];
  if (d === "4") return "Visa";
  if (d === "5") return "Mastercard";
  if (d === "3") return "Amex";
  if (d === "6") return "RuPay";
  return "";
}

interface Props {
  onPayment: (method: string, details?: Record<string, string>) => void;
  loading: boolean;
  amount: number;
}

export function PaymentSection({ onPayment, loading, amount }: Props) {
  const [tab, setTab] = useState<Tab>("upi");
  const [selectedUpiApp, setSelectedUpiApp] = useState<string | null>(null);
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "upi", label: "UPI", icon: <Smartphone className="h-4 w-4" /> },
    { id: "card", label: "Card", icon: <CreditCard className="h-4 w-4" /> },
    { id: "netbanking", label: "Net Banking", icon: <Building2 className="h-4 w-4" /> },
    { id: "cod", label: "Cash on Delivery", icon: <Package className="h-4 w-4" /> },
  ];

  const handleExpiryChange = (v: string) => {
    const clean = v.replace(/\D/g, "").slice(0, 4);
    setExpiry(clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean);
  };

  const SSLBadge = () => (
    <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 py-2.5 px-4">
      <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
      <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">256-bit SSL Secured</span>
    </div>
  );

  return (
    <div className="rounded-xl border border-border/50 bg-white dark:bg-[hsl(220_17%_10%)] overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border/50 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 py-3.5 text-[12px] font-semibold transition-colors ${
              tab === t.id
                ? "border-b-2 border-primary text-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* ── UPI TAB ── */}
        {tab === "upi" && (
          <div className="space-y-4">
            <p className="text-[14px] font-bold">Pay by any UPI App</p>

            {/* UPI app buttons */}
            <div className="grid grid-cols-4 gap-2">
              {UPI_APPS.map(app => (
                <button
                  key={app.id}
                  onClick={() => setSelectedUpiApp(selectedUpiApp === app.id ? null : app.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                    selectedUpiApp === app.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border/50 hover:border-primary/40"
                  }`}
                >
                  <span className="text-2xl">{app.emoji}</span>
                  <span className={`text-[11px] font-bold ${app.color}`}>{app.label}</span>
                </button>
              ))}
            </div>

            {/* UPI ID input */}
            <div className="space-y-1.5">
              <p className="text-[12px] font-semibold text-muted-foreground">OR Enter UPI ID</p>
              <div className="flex gap-2">
                <Input
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className="flex-1 text-[14px]"
                />
                <Button variant="outline" type="button" className="text-[13px] font-bold px-4">
                  Verify
                </Button>
              </div>
            </div>

            <Button
              className="w-full h-11 text-[14px] font-semibold bg-primary hover:bg-primary/90 text-white"
              onClick={() => onPayment("UPI", { upiId: upiId || selectedUpiApp || "" })}
              disabled={loading || (!upiId && !selectedUpiApp)}
            >
              {loading ? "Processing..." : `Pay ₹${amount.toFixed(2)}`}
            </Button>
            <SSLBadge />
          </div>
        )}

        {/* ── CARD TAB ── */}
        {tab === "card" && (
          <div className="space-y-4">
            <p className="text-[14px] font-bold">Credit / Debit Card</p>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[13px]">Card Number</Label>
                {cardNumber && (
                  <span className="text-[11px] font-bold text-muted-foreground">{detectCardType(cardNumber)}</span>
                )}
              </div>
              <Input
                value={cardNumber}
                onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className="text-[14px] font-mono tracking-widest"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Expiry (MM/YY)</Label>
                <Input
                  value={expiry}
                  onChange={e => handleExpiryChange(e.target.value)}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="text-[14px] font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">CVV</Label>
                <Input
                  value={cvv}
                  onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="• • •"
                  maxLength={4}
                  type="password"
                  className="text-[14px] font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Name on Card</Label>
              <Input
                value={cardName}
                onChange={e => setCardName(e.target.value)}
                placeholder="As printed on card"
                className="text-[14px]"
              />
            </div>

            <Button
              className="w-full h-11 text-[14px] font-semibold bg-primary hover:bg-primary/90 text-white"
              onClick={() => onPayment("CARD", { cardNumber, expiry, cvv, cardName })}
              disabled={loading || !cardNumber || !expiry || !cvv || !cardName}
            >
              {loading ? "Processing..." : "Pay Securely"}
            </Button>
            <SSLBadge />
          </div>
        )}

        {/* ── NET BANKING TAB ── */}
        {tab === "netbanking" && (
          <div className="space-y-4">
            <p className="text-[14px] font-bold">Select Your Bank</p>

            <div className="grid grid-cols-3 gap-2">
              {BANKS.map(bank => (
                <button
                  key={bank}
                  onClick={() => setSelectedBank(bank)}
                  className={`rounded-xl border p-3 text-[13px] font-semibold transition-all ${
                    selectedBank === bank
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                      : "border-border/50 hover:border-primary/40"
                  }`}
                >
                  {bank}
                </button>
              ))}
            </div>

            {selectedBank && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 px-4 py-3">
                <p className="text-[13px] text-blue-700 dark:text-blue-400 font-medium">
                  You will be redirected to <strong>{selectedBank}</strong> secure payment page.
                </p>
              </div>
            )}

            <Button
              className="w-full h-11 text-[14px] font-semibold bg-primary hover:bg-primary/90 text-white"
              onClick={() => onPayment("NETBANKING", { bank: selectedBank || "" })}
              disabled={loading || !selectedBank}
            >
              {loading ? "Redirecting..." : `Pay via ${selectedBank || "Net Banking"}`}
            </Button>
            <SSLBadge />
          </div>
        )}

        {/* ── COD TAB ── */}
        {tab === "cod" && (
          <div className="space-y-4">
            <p className="text-[14px] font-bold">Cash on Delivery</p>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">COD Available at your location</p>
              </div>
              <p className="text-[12px] text-emerald-600 dark:text-emerald-500">
                Pay in cash when your order is delivered to your doorstep.
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 px-4 py-3">
              <p className="text-[13px] text-amber-700 dark:text-amber-400 font-medium">
                ₹50 COD handling fee applicable. Keep exact change ready.
              </p>
            </div>

            <Button
              className="w-full h-11 text-[14px] font-semibold bg-primary hover:bg-primary/90 text-white"
              onClick={() => onPayment("COD")}
              disabled={loading}
            >
              {loading ? "Placing Order..." : "Confirm COD Order"}
            </Button>
            <SSLBadge />
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentSection;
