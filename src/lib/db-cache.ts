import { unstable_cache } from "next/cache";

const DEFAULT_TIMEOUT_MS = 5000;

/** Wraps any DB promise with a hard timeout. Returns null on timeout/error. */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms = DEFAULT_TIMEOUT_MS,
  fallback: T | null = null
): Promise<T | null> {
  try {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), ms)
    );
    const result = await Promise.race([promise, timeout]);
    return result ?? fallback;
  } catch {
    return fallback;
  }
}

/** Same as withTimeout but returns empty array on failure. */
export async function withTimeoutArray<T>(
  promise: Promise<T[]>,
  ms = DEFAULT_TIMEOUT_MS
): Promise<T[]> {
  return (await withTimeout(promise, ms, [])) ?? [];
}

/** Cache tag constants */
export const CACHE_TAGS = {
  products: "products",
  product: (id: string) => `product-${id}`,
  categories: "categories",
  sellers: "sellers",
  seller: (id: string) => `seller-${id}`,
  homepage: "homepage",
};

type CacheOptions = {
  revalidate?: number;
  tags?: string[];
};

/** Creates a cached version of an async function using Next.js unstable_cache. */
export function createCachedQuery<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  keyParts: string[],
  opts: CacheOptions = {}
) {
  return unstable_cache(fn, keyParts, {
    revalidate: opts.revalidate ?? 300,
    tags: opts.tags ?? [],
  });
}
