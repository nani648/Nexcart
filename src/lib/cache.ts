/**
 * Redis cache helper — thin wrapper around Upstash Redis for API-route caching.
 *
 * Uses the same UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN env vars as
 * the rate-limiter. Falls back to a no-op (always miss) when Redis isn't
 * configured so dev without Redis still works.
 *
 * Usage:
 *   import { getOrSet, bustCache } from "@/lib/cache";
 *
 *   // In a GET handler:
 *   const data = await getOrSet("my-key", () => db.product.findMany(...), 300);
 *
 *   // After a write:
 *   await bustCache("my-key", "other-key");
 */

import { Redis } from "@upstash/redis";

const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

// Singleton Redis client
let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!hasRedis) return null;
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

/**
 * Cache-aside: return cached value if present, otherwise run `fetcher`,
 * store the result, and return it.
 *
 * @param key     Redis key (prefix with a namespace, e.g. "product:abc")
 * @param fetcher Async function that returns the fresh value
 * @param ttl     Time-to-live in seconds (default 300 = 5 minutes)
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300
): Promise<T> {
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get<T>(key);
      if (cached !== null && cached !== undefined) return cached;
    } catch (err) {
      // Redis down or timeout — fall through to DB
      console.error(`[cache] get error for key "${key}":`, err);
    }
  }

  const fresh = await fetcher();

  if (redis && fresh !== null && fresh !== undefined) {
    try {
      await redis.set(key, fresh, { ex: ttl });
    } catch (err) {
      console.error(`[cache] set error for key "${key}":`, err);
    }
  }

  return fresh;
}

/**
 * Delete one or more cache keys (call after writes that invalidate cached data).
 */
export async function bustCache(...keys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    console.error("[cache] bust error:", err);
  }
}

/**
 * Build a cache key from a prefix + sorted query-param record.
 * Sorting params ensures ?sort=newest&page=1 and ?page=1&sort=newest hit the same key.
 */
export function cacheKey(prefix: string, params: Record<string, string | number | boolean | null | undefined>): string {
  const clean = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return clean ? `${prefix}:${clean}` : prefix;
}

/** Namespace prefixes — centralised so we don't typo keys */
export const CACHE_KEYS = {
  product: (id: string) => `nexcart:product:${id}`,
  products: (params: string) => `nexcart:products:${params}`,
  seller: (id: string) => `nexcart:seller:${id}`,
  sellers: "nexcart:sellers",
  categories: "nexcart:categories",
  search: (q: string, type: string) => `nexcart:search:${type}:${encodeURIComponent(q.toLowerCase())}`,
};
