/**
 * Server-side auth utilities for API routes.
 *
 * SECURITY MODEL:
 * - Client sends: Authorization: Bearer <firebase_id_token>
 * - Server verifies the token with Firebase Admin SDK
 * - Only after verification do we trust the uid and look up the DB user
 *
 * This replaces the previous insecure pattern of trusting raw UIDs.
 */
import { NextRequest } from "next/server";

/**
 * Decode the payload of a JWT without verifying the signature.
 * Used as a fallback when Firebase Admin SDK is not configured.
 * Returns the decoded payload or null on failure.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Base64url → Base64 → JSON
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Verify a Firebase ID token and return the decoded payload.
 * Returns null if token is missing, expired, or invalid.
 *
 * Strategy:
 *  1. Try full verification via Firebase Admin SDK (production).
 *  2. If Admin SDK is unavailable / not configured, fall back to
 *     decoding the JWT payload without signature verification.
 *     This keeps the app functional in dev when no service account
 *     is set up, while still extracting the real Firebase UID.
 */
export async function verifyFirebaseToken(token: string, checkRevoked = false) {
  try {
    // Dynamically import to keep firebase-admin out of client bundles
    const { adminAuth } = await import("@/lib/firebase-admin");
    // checkRevoked=true (2nd arg) forces an EXTRA network round-trip to
    // Google's Identity Toolkit API on every single verification, not just
    // the first — that's real, permanent per-request latency, not a
    // one-time cold-start cost. Routine reads (presence/notifications/etc.)
    // don't need revocation checking; it defaults to false everywhere so
    // this stays a no-op for the vast majority of routes. Only a short list
    // of genuinely sensitive routes (payouts, bank account changes) opt in
    // via getVerifiedUid(req, { checkRevoked: true }) — those are the ones
    // where accepting a token from an account that was JUST logged-out/
    // disabled/had all sessions revoked for a few extra minutes is worth
    // trading away for the latency.
    const decoded = await adminAuth.verifyIdToken(token, checkRevoked);
    return decoded;
  } catch (err) {
    const msg = (err as Error).message ?? "";
    console.warn("[auth] Firebase Admin token verification failed:", msg);

    // Never fall back to an unverified decode on a real deployment — treat
    // as unauthenticated. NODE_ENV alone isn't a reliable signal here: a
    // misconfigured staging/preview environment could leave it unset or
    // wrong, which would silently downgrade every route using
    // getVerifiedUid() to trust an unverified token. VERCEL is injected
    // automatically by Vercel on every deployment (preview and production
    // alike) and can't be misconfigured the way NODE_ENV can, so requiring
    // BOTH "not production" AND "not on Vercel" before ever using the
    // fallback closes that gap without touching real local development —
    // VERCEL is never set on a developer's own machine, so this is a no-op
    // there and local dev keeps working exactly as before.
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      return null;
    }

    // Fallback (non-production only): decode JWT payload without signature verification.
    // This allows the app to work in development / when Admin SDK credentials
    // are not configured, without leaking production security.
    const payload = decodeJwtPayload(token);
    if (payload && typeof payload.sub === "string" && payload.sub) {
      console.warn(
        "[auth] Falling back to unverified JWT decode. " +
          "Set FIREBASE_SERVICE_ACCOUNT_JSON for full token verification."
      );
      // Return a minimal decoded token shape compatible with DecodedIdToken
      return { uid: payload.sub, ...payload } as { uid: string } & Record<string, unknown>;
    }

    // Last-resort dev fallback: accept raw Firebase UIDs (token has no dots = not a JWT).
    // Validates the UID exists in the database so arbitrary strings can't be used.
    // Migrate client to `user.getIdToken()` before going to production.
    if (!token.includes(".")) {
      try {
        const { db } = await import("@/lib/db");
        const dbUser = await db.user.findUnique({
          where: { firebaseUid: token },
          select: { firebaseUid: true },
        });
        if (dbUser) {
          console.warn("[auth] Accepting raw UID (dev-only). Switch client to user.getIdToken() before deploying.");
          return { uid: token } as { uid: string } & Record<string, unknown>;
        }
      } catch {
        // DB unreachable — fall through to null
      }
    }

    return null;
  }
}

/**
 * Extract and verify the Firebase ID token from the request.
 * Returns the verified Firebase UID, or null if invalid.
 */
export async function getVerifiedUid(
  req: NextRequest,
  options?: { checkRevoked?: boolean }
): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const decoded = await verifyFirebaseToken(token, options?.checkRevoked ?? false);
  return decoded?.uid ?? null;
}
