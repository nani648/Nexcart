"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

// Silently pings /api/sellers/presence every 2 minutes when a seller is logged in.
// This keeps their lastSeenAt fresh so the store page shows accurate online status.
// Mounts in root layout — does nothing for non-seller users.
export function SellerPresencePing() {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const ping = async (user: { uid: string }) => {
      try {
        await fetch("/api/sellers/presence", {
          method: "PATCH",
          headers: { Authorization: `Bearer ${user.uid}` },
        });
      } catch { /* silent — never crash the app */ }
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      if (interval) clearInterval(interval);
      interval = null;
      if (!user) return;

      ping(user); // immediate ping on login
      interval = setInterval(() => ping(user), 2 * 60 * 1000); // then every 2 min
    });

    return () => {
      unsub();
      if (interval) clearInterval(interval);
    };
  }, []);

  return null;
}
