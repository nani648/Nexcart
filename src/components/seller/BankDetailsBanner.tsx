"use client";

import { useState } from "react";
import Link from "next/link";
import { Landmark, FileText, X } from "lucide-react";

const DISMISS_KEY = "nxc-bank-banner-dismissed";
const DISMISS_GSTIN_KEY = "nxc-gstin-banner-dismissed";

interface BankDetailsBannerProps {
  hasBankAccount: boolean;
  hasGstin?: boolean;
  hasSales: boolean;
}

/**
 * Nudges sellers to add bank account details and GSTIN.
 * - Before any sale: a soft, dismissible reminder for each missing item.
 * - After the first sale (walletBalance has been credited at least once): a
 *   stronger, non-dismissible banner — payouts are already blocked without
 *   bank details + GSTIN (see /api/seller/payouts), so this avoids surprises.
 */
export function BankDetailsBanner({ hasBankAccount, hasGstin = true, hasSales }: BankDetailsBannerProps) {
  const [bankDismissed, setBankDismissed] = useState(
    () => {
      try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
    }
  );
  const [gstinDismissed, setGstinDismissed] = useState(
    () => {
      try { return localStorage.getItem(DISMISS_GSTIN_KEY) === "1"; } catch { return false; }
    }
  );

  const showBank = !hasBankAccount && (hasSales || !bankDismissed);
  const showGstin = !hasGstin && (hasSales || !gstinDismissed);

  const dismissBank = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setBankDismissed(true);
  };
  const dismissGstin = () => {
    try { localStorage.setItem(DISMISS_GSTIN_KEY, "1"); } catch {}
    setGstinDismissed(true);
  };

  return (
    <>
      {showBank && (
        <div
          className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${
            hasSales
              ? "border-amber-300 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10"
              : "border-border/60 bg-muted/30"
          }`}
        >
          <Landmark className={`h-4 w-4 shrink-0 mt-0.5 ${hasSales ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-[13px] font-medium ${hasSales ? "text-amber-800 dark:text-amber-300" : "text-foreground"}`}>
              {hasSales ? "Add your bank details to receive payouts" : "Add your bank account details"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasSales
                ? "You've made a sale and your wallet has been credited, but payouts are blocked until your bank account is added."
                : "Set this up now so you're ready to receive payouts as soon as you make a sale."}
            </p>
            <Link
              href="/dashboard/payouts#bank-account"
              className="mt-2 inline-flex items-center text-xs font-semibold text-primary hover:underline"
            >
              Add bank details →
            </Link>
          </div>
          {!hasSales && (
            <button
              type="button"
              onClick={dismissBank}
              aria-label="Dismiss"
              className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {showGstin && (
        <div
          className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${
            hasSales
              ? "border-amber-300 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10"
              : "border-border/60 bg-muted/30"
          }`}
        >
          <FileText className={`h-4 w-4 shrink-0 mt-0.5 ${hasSales ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-[13px] font-medium ${hasSales ? "text-amber-800 dark:text-amber-300" : "text-foreground"}`}>
              {hasSales ? "Add your GSTIN to receive payouts" : "Add your GSTIN"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasSales
                ? "You've made a sale, but payouts are blocked until your GSTIN is added."
                : "You can add this anytime, but it's required before you can request a payout."}
            </p>
            <Link
              href="/dashboard/settings#gstin"
              className="mt-2 inline-flex items-center text-xs font-semibold text-primary hover:underline"
            >
              Add GSTIN →
            </Link>
          </div>
          {!hasSales && (
            <button
              type="button"
              onClick={dismissGstin}
              aria-label="Dismiss"
              className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
