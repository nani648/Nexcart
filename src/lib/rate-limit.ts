// IP-extraction helper shared by API routes that rate limit.
//
// The rate limiting itself used to live in this file as a simple in-memory
// Map — that only ever throttles requests hitting the same warm serverless
// instance and resets on every cold start, so on Vercel (many concurrent
// instances, frequent cold starts) it provided close to zero real
// protection at volume. All call sites now use the Redis-backed limiter in
// lib/ratelimit.ts (checkRateLimit / rateLimit), which enforces a durable,
// shared limit across every instance. This file only keeps the IP helper so
// those call sites don't need to duplicate the header-parsing logic.

/** Extract the real client IP from proxy headers. */
export function getClientIp(req: Request): string {
  const forwarded = (req.headers as Headers).get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = (req.headers as Headers).get("x-real-ip");
  return realIp || "unknown";
}
