"use client";

import { useEffect } from "react";

/**
 * Dev-only helper: a previously installed PWA service worker (from `next build`)
 * can keep serving cached pages/assets on localhost, so code changes only show
 * up after a hard refresh (Ctrl+Shift+R). This unregisters any active service
 * workers and clears the Cache Storage on mount during development so normal
 * fast-refresh/reload always reflects the latest code. No-op in production.
 */
export function DevSWCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });

    if (window.caches?.keys) {
      window.caches.keys().then((keys) => {
        keys.forEach((key) => window.caches.delete(key));
      });
    }
  }, []);

  return null;
}
