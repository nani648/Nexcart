"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function PushNotificationSetup() {
  useEffect(() => {
    // Bail out early if VAPID key not configured or browser doesn't support it
    if (!VAPID_KEY) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (!("serviceWorker" in navigator)) return;

    let unsubscribed = false;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (unsubscribed || !user) return;
      if (Notification.permission === "denied") return;

      // Only register once per browser session to avoid spamming the user
      if (sessionStorage.getItem("nxc-fcm-ok")) return;

      try {
        // Dynamically import Firebase Messaging to avoid SSR issues
        const { getMessaging, getToken } = await import("firebase/messaging");
        const { getApp } = await import("firebase/app");

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const messaging = getMessaging(getApp());
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (!token) return;

        const res = await fetch("/api/fcm-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.uid}`,
          },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          sessionStorage.setItem("nxc-fcm-ok", "1");
          // Store token so we can remove it on logout
          sessionStorage.setItem("nxc-fcm-token", token);
        }
      } catch (err) {
        // Silently fail — push notifications are non-critical
        console.warn("[PushNotificationSetup]", err);
      }
    });

    return () => {
      unsubscribed = true;
      unsub();
    };
  }, []);

  // Remove FCM token on sign-out
  useEffect(() => {
    if (!VAPID_KEY) return;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) return; // user is still logged in
      const token = sessionStorage.getItem("nxc-fcm-token");
      if (!token) return;
      try {
        await fetch("/api/fcm-token", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      } catch { /* silent */ } finally {
        sessionStorage.removeItem("nxc-fcm-ok");
        sessionStorage.removeItem("nxc-fcm-token");
      }
    });

    return unsub;
  }, []);

  return null; // renders nothing — purely side-effect component
}
