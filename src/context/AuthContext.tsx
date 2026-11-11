"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, onAuthStateChanged, signOut, type User } from "@/lib/firebase";

interface SellerInfo {
  id: string;
  sellerId: string;
  storeName: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED" | string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  seller: SellerInfo | null;
  sellerLoading: boolean;
  isSeller: boolean;
  isApprovedSeller: boolean;
  logout: () => Promise<void>;
  refreshSeller: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  seller: null,
  sellerLoading: false,
  isSeller: false,
  isApprovedSeller: false,
  logout: async () => {},
  refreshSeller: async () => {},
});

/**
 * Mirrors the Firebase client login into an httpOnly cookie the SERVER can
 * read on a plain page load (see api/auth/session/route.ts and
 * lib/admin-auth.ts for why this exists — Server Components can't see the
 * Authorization header this app normally uses, since that only gets
 * attached once client JS runs a fetch call). Runs on every sign-in and on
 * every app load where Firebase already has a session, so the cookie never
 * drifts out of sync with the real login state. Best-effort: if it fails
 * (network hiccup), the user just won't be able to open admin pages until
 * it succeeds on a later load — it never blocks normal use of the site.
 */
async function syncSessionCookie(firebaseUser: User) {
  try {
    const idToken = await firebaseUser.getIdToken(true);
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
  } catch {
    // Non-fatal — see comment above.
  }
}

async function clearSessionCookie() {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch {
    // Non-fatal — cookie will simply expire on its own (5-day max age).
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [sellerLoading, setSellerLoading] = useState(false);

  const fetchSeller = async (uid: string) => {
    setSellerLoading(true);
    try {
      const res = await fetch("/api/sellers/profile", {
        headers: { Authorization: `Bearer ${uid}` },
      });
      if (res.ok) {
        const data = await res.json();
        // API returns { seller: { id, sellerId, storeName, status }, dashboard: {...} }
        const s = data?.seller;
        if (s?.id) {
          setSeller({
            id: s.id,
            sellerId: s.sellerId,
            storeName: s.storeName,
            status: s.status,
          });
        } else {
          setSeller(null);
        }
      } else {
        setSeller(null);
      }
    } catch {
      setSeller(null);
    } finally {
      setSellerLoading(false);
    }
  };

  const refreshSeller = async () => {
    if (user) await fetchSeller(user.uid);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        try { localStorage.setItem("nxc-uid", firebaseUser.uid); } catch {}
        fetchSeller(firebaseUser.uid);
        syncSessionCookie(firebaseUser);
      } else {
        try { localStorage.removeItem("nxc-uid"); } catch {}
        setSeller(null);
        clearSessionCookie();
      }
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    // Unregister this device's push token WHILE still signed in — once
    // signOut() runs, the request can no longer be authenticated and the
    // token would stay attached to this account (so a shared device would
    // keep receiving the previous user's notifications).
    try {
      const fcmToken = typeof window !== "undefined" ? sessionStorage.getItem("nxc-fcm-token") : null;
      if (fcmToken && auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken();
        await fetch("/api/fcm-token", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ token: fcmToken }),
        });
      }
    } catch {
      /* best-effort — never block logout */
    }
    await signOut(auth);
    setUser(null);
    setSeller(null);
    await clearSessionCookie();
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      seller,
      sellerLoading,
      isSeller: !!seller,
      isApprovedSeller: seller?.status === "APPROVED",
      logout,
      refreshSeller,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}

export const useAuth = useAuthContext;
