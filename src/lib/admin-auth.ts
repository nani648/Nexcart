/**
 * Server-only admin gate for the /admin section.
 *
 * Why this exists: pages under src/app/(admin)/admin/** are React Server
 * Components — they fetch straight from the database and their HTML is
 * built on the server BEFORE anything reaches the browser. The app's
 * regular auth (a Firebase ID token sent as an `Authorization` header) only
 * exists once client-side JS runs a fetch call — a plain page load/direct
 * URL visit carries no such header, so a Server Component has no way to
 * check "who is this?" using that mechanism. The previous admin gate
 * (admin/layout.tsx) ran that check in the browser, AFTER the server had
 * already fetched and sent the page's data — meaning the data was already
 * on its way to anyone who requested the URL, admin or not.
 *
 * The fix: also keep a small, httpOnly session cookie in sync with the
 * user's Firebase login (see api/auth/session/route.ts + AuthContext.tsx).
 * That cookie IS sent automatically by the browser on every request,
 * including the very first page load, so the server can check identity
 * before it fetches or renders anything.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase-admin";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie-name";

export { SESSION_COOKIE_NAME };

/**
 * Reads and verifies the session cookie, if present, and returns the
 * matching DB user (any role) — or null if there's no session, it's
 * invalid/expired/revoked, or the user no longer exists.
 *
 * checkRevoked=true costs one extra network round-trip per call, but this
 * only gates the low-traffic admin section, not every request in the app —
 * the same tradeoff already documented in lib/auth.ts for sensitive routes.
 */
async function getServerSessionUser() {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return await db.user.findUnique({ where: { firebaseUid: decoded.uid } });
  } catch {
    // Missing/expired/revoked/tampered cookie — treat as logged out.
    return null;
  }
}

/**
 * For Server Components (the admin layout and every admin page): verifies
 * the caller is a logged-in admin, or redirects away — same two-branch
 * behaviour the old client-side check had (not logged in → /sign-in; logged
 * in but not an admin → /). Call this before fetching or rendering anything
 * sensitive.
 */
export async function requireAdminPage() {
  const user = await getServerSessionUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/**
 * For Server Actions (the inline Approve/Reject/Suspend/etc. form actions
 * on admin pages): Server Actions can't navigate the way a page render can,
 * so this throws instead of redirecting. Under normal use nobody ever hits
 * this — a non-admin can't reach the page these buttons live on in the
 * first place, since requireAdminPage() already turned them away. This is
 * the defense-in-depth backstop for a directly crafted request to the
 * action itself, matching the same "every route re-verifies independently"
 * pattern already used across the API layer.
 */
export async function requireAdminAction() {
  const user = await getServerSessionUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Forbidden: admin access required");
  }
  return user;
}
