/**
 * Browser-side Supabase client, used ONLY for Realtime (listening for live
 * database changes) — not for querying data, which still goes through
 * Prisma/the API routes as everywhere else in the app.
 *
 * Deliberately uses the PUBLIC anon key (NEXT_PUBLIC_*), which is meant to
 * be exposed to the browser — it's how every Supabase client-side app
 * authenticates its realtime/API connection. It is NOT the same as
 * DATABASE_URL's password or the service-role key, neither of which should
 * ever reach the browser. Row-level access for realtime is controlled by
 * the publication/RLS setup on the database side, not by keeping this key
 * secret.
 *
 * Returns null (rather than throwing) when the env vars aren't configured,
 * so any feature built on top of this can no-op gracefully instead of
 * crashing the whole app for sellers/developers who haven't set it up yet.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn(
      "[supabase-client] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — " +
        "live cross-device updates are disabled. See .env for setup instructions."
    );
    client = null;
    return client;
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: false }, // this client is realtime-only, never used for login
  });
  return client;
}
