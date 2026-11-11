"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  type: "warning" | "error" | "info";
  message: string;
  action?: { label: string; href: string };
}

interface AlertBannerProps {
  alerts: Alert[];
}

const CONFIG = {
  warning: {
    bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40",
    text: "text-amber-800 dark:text-amber-300",
    icon: AlertTriangle,
    actionClass: "text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline underline-offset-2 font-semibold",
    dismiss: "text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200",
  },
  error: {
    bg: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/40",
    text: "text-red-800 dark:text-red-300",
    icon: XCircle,
    actionClass: "text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline underline-offset-2 font-semibold",
    dismiss: "text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300",
  },
  info: {
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/40",
    text: "text-blue-800 dark:text-blue-300",
    icon: Info,
    actionClass: "text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 underline underline-offset-2 font-semibold",
    dismiss: "text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300",
  },
};

export function AlertBanner({ alerts }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const visible = alerts.filter((_, i) => !dismissed.has(i));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert, i) => {
        if (dismissed.has(i)) return null;
        const cfg = CONFIG[alert.type];
        const Icon = cfg.icon;

        return (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
              cfg.bg,
              cfg.text
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{alert.message}</span>
            <div className="flex items-center gap-3 shrink-0">
              {alert.action && (
                <Link href={alert.action.href} className={cn("text-xs", cfg.actionClass)}>
                  {alert.action.label}
                </Link>
              )}
              <button
                onClick={() => setDismissed((prev) => new Set(prev).add(i))}
                className={cn("rounded p-0.5 transition-colors", cfg.dismiss)}
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
