"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const CartSidebar = dynamic(
  () => import("@/components/layout/CartSidebar").then((mod) => ({ default: mod.CartSidebar })),
  { ssr: false, loading: () => null }
);

const SearchCommand = dynamic(
  () => import("@/components/shared/SearchCommand").then((mod) => ({ default: mod.SearchCommand })),
  { ssr: false, loading: () => null }
);

const InstallPWA = dynamic(
  () => import("@/components/shared/InstallPWA").then((mod) => ({ default: mod.InstallPWA })),
  { ssr: false, loading: () => null }
);

const PushNotificationSetup = dynamic(
  () => import("@/components/shared/PushNotificationSetup").then((mod) => ({ default: mod.PushNotificationSetup })),
  { ssr: false, loading: () => null }
);

const SellerPresencePing = dynamic(
  () => import("@/components/shared/SellerPresencePing").then((mod) => ({ default: mod.SellerPresencePing })),
  { ssr: false, loading: () => null }
);

const DevSWCleanup = dynamic(
  () => import("@/components/shared/DevSWCleanup").then((mod) => ({ default: mod.DevSWCleanup })),
  { ssr: false, loading: () => null }
);

const UpdatePrompt = dynamic(
  () => import("@/components/shared/UpdatePrompt").then((mod) => ({ default: mod.UpdatePrompt })),
  { ssr: false, loading: () => null }
);

export function DeferredOptionalUI() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const start = () => {
      if (!cancelled) setReady(true);
    };

    const win = typeof window !== "undefined" ? window : undefined;

    if (win && "requestIdleCallback" in win) {
      const handle = win.requestIdleCallback(start, { timeout: 800 });
      return () => {
        cancelled = true;
        win.cancelIdleCallback(handle);
      };
    }

    const timeoutId = globalThis.setTimeout(start, 800);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      <CartSidebar />
      <SearchCommand />
      <InstallPWA />
      <PushNotificationSetup />
      <SellerPresencePing />
      <DevSWCleanup />
      <UpdatePrompt />
    </>
  );
}
