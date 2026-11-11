/**
 * The httpOnly session cookie name (see api/auth/session/route.ts,
 * lib/admin-auth.ts, and middleware.ts).
 *
 * Deliberately its own file with ZERO other imports. middleware.ts needs
 * this name but runs in the Edge runtime, which cannot load lib/admin-auth.ts
 * (it pulls in firebase-admin, a Node-only SDK) or lib/db.ts — importing
 * either into middleware would break the Edge bundle. Keeping this constant
 * isolated means middleware can know the cookie's name without ever risking
 * pulling in something Edge-incompatible.
 */
export const SESSION_COOKIE_NAME = "nxc_session";
