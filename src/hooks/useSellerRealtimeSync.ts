"use client";

/**
 * Live cross-device sync for a seller's storefront.
 *
 * Problem this solves: a shopper (or the seller themselves) can have the
 * storefront open on two devices at once (e.g. testing on a laptop and a
 * phone). Without this, each device only has the snapshot of seller data it
 * loaded when the page opened — editing something on one device (like
 * turning on a Scrolling Design) never appears on the other until it's
 * manually refreshed, because nothing tells the other tab anything changed.
 *
 * Fix: subscribe to Postgres's realtime change feed (via Supabase Realtime,
 * which the project's database already runs on) for UPDATEs to this
 * specific Seller row. The moment ANY field changes — from any device,
 * anywhere — every other open tab viewing that same store gets notified
 * within a second or two and calls `router.refresh()`, which re-runs the
 * page's server-side data fetch and updates the UI in place. This covers
 * every seller-editable storefront setting, not just one field, since it
 * just tells the page "something changed, go re-fetch" rather than trying
 * to patch individual fields over the wire.
 *
 * No-ops safely (does nothing, no error) if NEXT_PUBLIC_SUPABASE_URL /
 * NEXT_PUBLIC_SUPABASE_ANON_KEY aren't configured yet, or if realtime isn't
 * enabled for the Seller table — see prisma/migrations for the migration
 * that enables it, and .env for the required variables.
 *
 * Diagnostic logging below is intentionally NOT gated behind
 * `NODE_ENV !== "production"`. Two reasons: (1) this app's own .env sets
 * NODE_ENV=production even for local/staging runs (see the "STAGING
 * ENVIRONMENT" block at the top of .env), so a dev-only gate would hide
 * these logs during exactly the local testing they're needed for; (2)
 * `console.debug` calls are filtered out of Chrome DevTools by default
 * (its log-level dropdown excludes "Verbose" unless you turn it on), so
 * even in real dev mode they were easy to miss. Using console.log/warn
 * here instead makes them show up unconditionally.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

export function useSellerRealtimeSync(sellerRowId: string | undefined | null) {
  const router = useRouter();

  useEffect(() => {
    if (!sellerRowId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      console.warn("[realtime] disabled — NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY not set. Live cross-device sync is off; changes will only appear after a manual refresh or the page's background cache window.");
      return;
    }

    const channel = supabase
      .channel(`seller-sync-${sellerRowId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "Seller", filter: `id=eq.${sellerRowId}` },
        () => {
          console.log("[realtime] Seller row changed — refreshing", new Date().toISOString());
          router.refresh();
        }
      )
      .subscribe((status) => {
        // "SUBSCRIBED" = working, updates should arrive within ~1-2s.
        // "CHANNEL_ERROR" / "TIMED_OUT" almost always means the anon
        // key's database role doesn't have permission to read this table
        // yet (see the accompanying migration's GRANT statement), or the
        // "Seller" table was never added to the supabase_realtime
        // publication (see the other migration) — without both, Realtime
        // has nothing to relay, and updates only ever show up via the
        // page's unrelated 60-second background cache refresh, which
        // looks like "it eventually updates, just slowly."
        if (status === "SUBSCRIBED") {
          console.log(`[realtime] connected — live sync is ON for seller ${sellerRowId}`);
        } else {
          console.warn(`[realtime] channel status: ${status} — live sync is NOT working (changes will only show after a manual refresh). Check: 1) NEXT_PUBLIC_SUPABASE_ANON_KEY is set correctly, 2) the "enable realtime" and "grant select" migrations were actually applied to this database, 3) Realtime is turned on for the Seller table in the Supabase dashboard (Database → Replication).`);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sellerRowId, router]);
}
