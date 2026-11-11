"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { captureError } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError("client/global-error", error, { digest: error.digest });
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>

        {/* Show real error in development */}
        {isDev ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-left dark:border-red-800/40 dark:bg-red-900/20">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
              Dev Error
            </p>
            <p className="break-words font-mono text-sm text-red-700 dark:text-red-300">
              {error.message || String(error)}
            </p>
            {error.stack && (
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-red-500/80">
                {error.stack}
              </pre>
            )}
          </div>
        ) : (
          <p className="mb-6 text-sm text-muted-foreground">
            An unexpected error occurred. Our team has been notified.
          </p>
        )}

        {error.digest && (
          <p className="mb-6 font-mono text-xs text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-80"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <Home className="h-4 w-4" /> Go home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
