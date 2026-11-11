import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie-name";

const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  "/verify-email",
  "/verify-email-pending",
  "/about",
  "/terms",
  "/privacy",
  "/become-seller",
  "/onboarding",
];

const publicPrefixes = [
  "/product/",
  "/store/",
  "/search",
  "/categories",
  "/api/products",
  "/api/search",
  "/api/sellers",
  "/api/categories",
  "/api/webhooks",
  "/api/auth",
  "/_next",
  "/favicon",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    publicRoutes.includes(pathname) ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isPublic) return NextResponse.next();

  // Fast-path filter for /admin: bounce anyone with no session cookie at
  // all straight to sign-in, before Next.js does any rendering work.
  //
  // This is a CHEAP PRESENCE CHECK ONLY — it cannot verify the cookie is
  // genuine or that its owner is actually an admin, because that requires
  // firebase-admin (a Node-only SDK) and a DB lookup, neither of which can
  // safely run in this Edge middleware. The real, cryptographically-verified
  // check is requireAdminPage() (see lib/admin-auth.ts), which runs for
  // every admin page and every admin Server Action regardless of whether
  // this check ran — this middleware only saves a logged-out visitor (or a
  // bot) the cost of a full page render for the common case, it is never
  // the only thing standing between a visitor and admin data.
  if (pathname.startsWith("/admin")) {
    const hasSession = req.cookies.has(SESSION_COOKIE_NAME);
    if (!hasSession) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

  // Auth for everything else is handled client-side via Firebase +
  // AuthContext, and API route token verification happens inside each
  // route handler.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
