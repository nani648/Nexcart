-- Enables Supabase Realtime (live change notifications) for the Seller
-- table, so open storefront tabs can be told "this seller's row changed,
-- go re-fetch" instead of only ever seeing the snapshot loaded on page
-- open — see src/hooks/useSellerRealtimeSync.ts for the client side.
--
-- Supabase provisions a publication named "supabase_realtime" on every
-- project; adding a table to it is what turns on the live-change feed for
-- that table. Wrapped in a DO block + duplicate_object exception guard
-- (rather than a plain ALTER PUBLICATION) so this migration is safe to
-- re-run and won't fail if the table was already added (e.g. manually via
-- the Supabase dashboard) before this migration ran.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE "Seller";
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- already added — nothing to do
    WHEN undefined_object THEN
      -- The "supabase_realtime" publication doesn't exist. This happens if
      -- Realtime has never been enabled on this project at all (rare — it's
      -- on by default on Supabase), or when running against a plain
      -- Postgres instance in local dev/testing. Not a fatal error: the app
      -- degrades gracefully (see getSupabaseBrowserClient() in
      -- lib/supabase-client.ts) — live sync is simply unavailable until an
      -- operator creates the publication or enables Realtime for the
      -- project in the Supabase dashboard.
      RAISE NOTICE 'supabase_realtime publication not found — skipping (live sync will be unavailable until it exists)';
  END;
END $$;
