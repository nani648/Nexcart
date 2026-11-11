/**
 * Next.js instrumentation hook — runs ONCE when the server process boots,
 * before it accepts any requests (Next.js 14, requires
 * experimental.instrumentationHook in next.config.mjs).
 *
 * WHY THIS EXISTS:
 * Dev server logs showed the same pattern on every route that hits the DB:
 * the FIRST request after startup takes 9+ seconds, every request after
 * that takes well under a second, with compile time already at 0ms. That's
 * the signature of a lazily-established connection, not a slow query —
 * Prisma doesn't open a real connection to Postgres until the first query
 * runs, and our DB is a remote Supabase pooler in ap-south-1, so that first
 * TCP+TLS handshake over the network is genuinely slow. Every query after
 * that reuses the already-open pooled connection.
 *
 * Pre-warming it here moves that one-time cost to server startup instead
 * of onto whichever request happens to run first.
 *
 * NOTE: We deliberately do NOT pre-warm firebase-admin here. Importing it
 * inside instrumentation.ts pulls its `remote-config` submodule into this
 * webpack build target (which doesn't externalize node_modules the way
 * normal route handlers do), and that submodule depends on a native
 * `farmhash-modern` .wasm binary that fails to bundle — a real
 * build-breaking error, not just a warning. Firebase's first-request cost
 * is already reduced separately (removed the extra `checkRevoked` network
 * call in src/lib/auth.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { db } = await import("@/lib/db");
    await db.$connect?.();
    await db.$queryRaw`SELECT 1`;
  } catch (err) {
    console.warn("[instrumentation] DB pre-warm skipped:", (err as Error)?.message);
  }
}
