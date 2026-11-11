-- Supabase Realtime relays row changes to a subscribing client only if that
-- client's database role can actually SELECT the table — the anon key used
-- by the browser (see src/lib/supabase-client.ts) authenticates as the
-- "anon" Postgres role. Without this grant, the live-change subscription in
-- src/hooks/useSellerRealtimeSync.ts silently receives nothing (no error —
-- it just never fires), which looks exactly like "it eventually updates,
-- just slowly": what's actually happening is the unrelated, pre-existing
-- 60-second background page refresh is the only thing ever refreshing it.
--
-- This is safe: Seller data is already fully public on the storefront page
-- itself (/store/[sellerId]) for any visitor, logged in or not — this grant
-- doesn't expose anything that wasn't already publicly visible, it just lets
-- the realtime relay read the same rows the storefront page already shows.
DO $$
BEGIN
  GRANT SELECT ON "Seller" TO anon, authenticated;
EXCEPTION
  WHEN undefined_object THEN
    -- "anon"/"authenticated" roles don't exist — not a real Supabase
    -- project (e.g. plain local Postgres). Nothing to grant; live sync
    -- will simply be unavailable there, same as the previous migration.
    RAISE NOTICE 'anon/authenticated roles not found — skipping grant (live sync will be unavailable)';
END $$;
