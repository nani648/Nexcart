"use client";

import { useState, useEffect } from "react";
import { MapPin, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryResult {
  available: boolean;
  date: string;
  courier: string;
}

function getDeliveryDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function getMockResult(pincode: string): DeliveryResult {
  const first = parseInt(pincode[0]);
  if (first >= 1 && first <= 5) {
    return { available: true, date: getDeliveryDate(2), courier: "Shiprocket" };
  } else if (first >= 6 && first <= 9) {
    return { available: true, date: getDeliveryDate(3), courier: "DTDC" };
  }
  return { available: false, date: "", courier: "" };
}

const LS_KEY = "nexcart_pincode";

interface PincodeCheckerProps {
  productId: string;
}

export function PincodeChecker({ productId: _productId }: PincodeCheckerProps) {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<DeliveryResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved && /^\d{6}$/.test(saved)) {
        setPincode(saved);
      }
    } catch {}
  }, []);

  const handleCheck = () => {
    setError("");
    setResult(null);
    if (!/^\d{6}$/.test(pincode)) {
      setError("Please enter a valid 6-digit pincode");
      return;
    }
    // Instant result - optimistic UI
    const res = getMockResult(pincode);
    setResult(res);
    try { localStorage.setItem(LS_KEY, pincode); } catch {}
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 mb-1">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <span className="text-[13px] font-semibold text-foreground">Check Delivery</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter pincode"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setResult(null);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
        />
        <button
          onClick={handleCheck}
          disabled={pincode.length !== 6}
          className={cn(
            "shrink-0 rounded-lg px-4 py-2 text-[13px] font-bold transition-all",
            "bg-primary text-white hover:brightness-105 active:brightness-95",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center gap-1.5"
          )}
        >
          Check
        </button>
      </div>

      {error && (
        <p className="text-[12px] text-red-500 font-medium flex items-center gap-1">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <div
          className={cn(
            "rounded-lg px-3 py-2.5 text-[13px] font-medium flex items-start gap-2 border",
            result.available
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
          )}
        >
          {result.available ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
          )}
          <span>
            {result.available
              ? <>Delivery available by <span className="font-bold">{result.date}</span> via <span className="font-bold">{result.courier}</span></>
              : "Delivery not available to this pincode"}
          </span>
        </div>
      )}
    </div>
  );
}
