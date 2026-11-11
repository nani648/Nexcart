"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Detects when a new version of the app has been deployed and a new
 * service worker has taken over, then prompts the user with a "Refresh"
 * toast so they can load the latest version on their own terms (no forced
 * reloads that could interrupt checkout, forms, etc.).
 *
 * No-op if service workers aren't supported, or in development (next-pwa
 * is disabled in dev via next.config.mjs).
 */
export function UpdatePrompt() {
  const promptedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const showUpdateToast = () => {
      if (promptedRef.current) return;
      promptedRef.current = true;
      toast("Update available", {
        description: "A new version of NexCart is ready.",
        duration: Infinity,
        action: {
          label: "Refresh",
          onClick: () => window.location.reload(),
        },
      });
    };

    const handleUpdateFound = () => {
      const newWorker = registration?.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        // "installed" while a controller already exists means this is a
        // NEW version replacing an active one (not the first-ever install).
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          showUpdateToast();
        }
      });
    };

    let cancelled = false;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (cancelled || !reg) return;
      registration = reg;

      // An update was already downloaded and is waiting to activate.
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateToast();
      }

      reg.addEventListener("updatefound", handleUpdateFound);

      // Trigger an immediate check in case a new version shipped while
      // this user was away (browsers throttle automatic background checks).
      reg.update().catch(() => {});
    });

    // Re-check whenever the tab/app regains focus.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        registration?.update().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      registration?.removeEventListener("updatefound", handleUpdateFound);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
