"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error("[Admin Error]", error); }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="font-semibold">Admin Panel Error</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Failed to load this admin page. Check your connection.
        </p>
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-80 transition-opacity"
      >
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>
  );
}
