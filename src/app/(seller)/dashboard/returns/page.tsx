"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { ReturnsClient } from "@/components/seller/ReturnsClient";
import { Loader2, RotateCcw } from "lucide-react";

const SELLER_RETURNS_CACHE_KEY = "nxc-seller-returns-v1";

export default function SellerReturnsPage() {
  const { user } = useAuthContext();
  const [returns, setReturns] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem(SELLER_RETURNS_CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [fetching, setFetching] = useState(() => returns.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use cached uid immediately — no Firebase wait, no getIdToken() network call
    const uid = user?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
    if (!uid) return;
    if (user?.uid) { try { localStorage.setItem("nxc-uid", user.uid); } catch {} }

    setError(null);
    fetch("/api/returns?filter=seller", { headers: { Authorization: `Bearer ${uid}` } })
      .then(async (res) => {
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to load returns"); }
        return res.json();
      })
      .then((data) => {
        const list = data.returns ?? [];
        setReturns(list);
        try { localStorage.setItem(SELLER_RETURNS_CACHE_KEY, JSON.stringify(list)); } catch {}
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load returns"))
      .finally(() => setFetching(false));
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (fetching) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
        <p className="text-[14px] font-semibold text-foreground">Could not load returns</p>
        <p className="text-[13px] text-muted-foreground">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-1 flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-[13px] font-medium hover:bg-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground">
            <RotateCcw className="h-4 w-4 text-background" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-foreground">
              Returns
            </h1>
            <p className="text-[13px] text-muted-foreground">
              {returns.length === 0
                ? "No return requests yet"
                : `${returns.length} return request${returns.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
      </div>

      {/* Returns table / cards */}
      <ReturnsClient initialReturns={returns} />
    </div>
  );
}
