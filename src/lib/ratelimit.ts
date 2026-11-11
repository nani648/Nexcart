/**
 * Rate limiting using Upstash Redis + @upstash/ratelimit
 *
 * Setup:
 * 1. Create a free Redis database at https://console.upstash.com
 * 2. Add to .env:
 *    UPSTASH_REDIS_REST_URL=https://...upstash.io
 *    UPSTASH_REDIS_REST_TOKEN=your_token
 *
 * If env vars are missing, rate limiting is SKIPPED (fails open — requests
 * are still allowed) rather than taking the whole site down, but on a real
 * deployment that's a silent, invisible loss of abuse protection on every
 * sensitive route (login, orders, payments, coupon codes, uploads...). See
 * `warnIfMisconfigured()` below: it logs one unmissable, throttled error per
 * server instance so a missing Redis config in production shows up in your
 * logs immediately instead of only being discovered after abuse happens.
 */

import { NextRequest, NextResponse } from "next/server";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

// Same "are we on a real deployment" signal used in lib/auth.ts and lib/db.ts
// — NODE_ENV alone can be left unset/wrong on a misconfigured staging box,
// but VERCEL is injected automatically by Vercel on every deployment.
const isDeployed = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

// Logged at most once per server instance (cold start) so a busy site
// doesn't flood its logs with the same warning on every request.
let warnedMissingConfig = false;
function warnIfMisconfigured() {
  if (hasUpstash || warnedMissingConfig || !isDeployed) return;
  warnedMissingConfig = true;
  console.error(
    "[ratelimit] SECURITY WARNING: UPSTASH_REDIS_REST_URL/TOKEN are not set " +
      "on a deployed environment. Rate limiting is DISABLED on every route " +
      "using it (login, orders, payments, coupon checks, uploads, search, " +
      "reviews...) — requests are being allowed through with no abuse " +
      "protection. Set both env vars in your hosting provider's dashboard. " +
      "Failing OPEN (not blocking real users) rather than taking the whole " +
      "site down, but this must be fixed before real traffic arrives."
  );
}

type RateLimitOptions = {
  /** Max requests per window */
  limit: number;
  /** Window duration in seconds */
  window: number;
  /** Key prefix — use the route name e.g. "orders" */
  prefix: string;
};

type RateLimitResult = { success: boolean; remaining: number; resetAt: number };

/**
 * Low-level check: does this identifier (IP, uid, or any string you choose)
 * still have budget left under the given limit? Doesn't build a response —
 * use this when a route needs its own custom 429 body/shape. For the common
 * case (standard JSON 429 response), use `rateLimit()` below instead.
 */
export async function checkRateLimit(
  identifier: string,
  { limit, window, prefix }: RateLimitOptions
): Promise<RateLimitResult> {
  if (!hasUpstash) {
    warnIfMisconfigured();
    return { success: true, remaining: limit, resetAt: Date.now() + window * 1000 };
  }

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${window} s`),
      prefix: `nexcart:${prefix}`,
    });

    const { success, remaining, reset } = await ratelimit.limit(identifier);
    return { success, remaining, resetAt: reset };
  } catch (err) {
    // Redis is unreachable/erroring — fail open (don't block real users
    // over an infra blip), but this is just as worth knowing about as the
    // "never configured" case above.
    console.error("[ratelimit] Redis error:", err);
    return { success: true, remaining: limit, resetAt: Date.now() + window * 1000 };
  }
}

/** Best-effort client IP extraction, shared by every caller of rateLimit(). */
function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous"
  );
}

/**
 * Apply rate limiting to a request.
 * Returns a 429 Response if limit exceeded, or null if allowed.
 *
 * Usage in API route:
 * ```ts
 * const limited = await rateLimit(req, { prefix: "orders", limit: 10, window: 60 });
 * if (limited) return limited;
 * ```
 */
export async function rateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const { limit } = options;
  const { success, resetAt } = await checkRateLimit(clientIp(req), options);

  if (!success) {
    return NextResponse.json(
      {
        error: "Too many requests. Please slow down.",
        retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(resetAt),
        },
      }
    );
  }

  return null; // Allowed
}

// Pre-configured limiters for each sensitive route
export const RATE_LIMITS = {
  /** Order creation — 10 per minute per IP */
  orders: { prefix: "orders", limit: 10, window: 60 },
  /** Payment initiation — 5 per minute per IP */
  payments: { prefix: "payments", limit: 5, window: 60 },
  /** Seller registration — 3 per hour per IP */
  sellerRegister: { prefix: "seller-register", limit: 3, window: 3600 },
  /** Auth endpoints — 10 per minute per IP */
  auth: { prefix: "auth", limit: 10, window: 60 },
  /** Product creation — 30 per minute per IP */
  productCreate: { prefix: "product-create", limit: 30, window: 60 },
  /** Upload — 20 per minute per IP */
  upload: { prefix: "upload", limit: 20, window: 60 },
  /** Review submission — 8 per hour per IP */
  reviews: { prefix: "reviews", limit: 8, window: 3600 },
  /** Seller CSV product import — 5 per hour per IP */
  csvImport: { prefix: "csv-import", limit: 5, window: 3600 },
  /** Storefront search — 30 per minute per IP */
  search: { prefix: "search", limit: 30, window: 60 },
  /** Search-as-you-type autocomplete — 60 per minute per IP */
  autocomplete: { prefix: "autocomplete", limit: 60, window: 60 },
  /** Store handle availability check — 30 per minute per IP */
  checkHandle: { prefix: "check-handle", limit: 30, window: 60 },
  /** Coupon code validation at checkout — 10 per minute per IP */
  couponCheck: { prefix: "coupon-check", limit: 10, window: 60 },
  /**
   * COD delivery OTP verification — 5 attempts per 15 minutes, keyed per
   * ORDER (not per IP). A 6-digit OTP has only 1,000,000 combinations, so an
   * IP-only limit isn't enough — a dishonest agent could still grind through
   * guesses against one order from a single device. Keying by order id caps
   * total guesses against that specific OTP regardless of who's guessing.
   */
  codOtp: { prefix: "cod-otp", limit: 5, window: 900 },
} as const;
