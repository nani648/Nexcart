import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/admin-auth";

// Session cookies can live up to 14 days per the Firebase Admin SDK; 5 days
// keeps a stolen/leaked cookie's useful window short while still meaning a
// normal user isn't forced to re-authenticate constantly.
const SESSION_EXPIRES_IN_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * POST /api/auth/session
 *
 * Mirrors the browser's Firebase login state into an httpOnly cookie the
 * SERVER can read on a plain page load — the app's usual Authorization-
 * header auth only exists once client JS makes a fetch call, which is no
 * help to a Server Component rendering the very first response. Called from
 * AuthContext.tsx right after Firebase reports a signed-in user (covers
 * every sign-in path — email/password, Google, etc. — since they all funnel
 * through the same onAuthStateChanged listener).
 *
 * Body: { idToken: string } — a fresh Firebase ID token from
 * `user.getIdToken(true)`.
 */
export async function POST(req: NextRequest) {
  let body: { idToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const idToken = body.idToken;
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "idToken required" }, { status: 400 });
  }

  try {
    // Verify the token is genuinely valid before minting a session cookie
    // from it — createSessionCookie alone doesn't re-check the signature.
    await adminAuth.verifyIdToken(idToken);

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    });

    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRES_IN_MS / 1000, // seconds
    });
    return res;
  } catch (err) {
    console.error("[api/auth/session] Failed to create session cookie:", err);
    return NextResponse.json({ error: "Could not create session" }, { status: 401 });
  }
}

/** DELETE /api/auth/session — clears the cookie on logout. */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
