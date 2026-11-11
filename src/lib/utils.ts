import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}


export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

export function generateSellerId(): string {
  const prefix = "SEL"
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  CONFIRMED:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PROCESSING: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  SHIPPED:    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  DELIVERED:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  RETURNED:   "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  REFUNDED:   "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
}

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED:    "bg-red-100 text-red-800",
}

// Levenshtein edit distance — used for "Did you mean...?" search suggestions
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[n]
}

// Common searchable terms used to power "Did you mean...?" suggestions when a
// search returns zero results (e.g. "sirts" -> "shirts").
export const SEARCH_DICTIONARY: string[] = [
  "shirts", "t-shirts", "jeans", "trousers", "kurta", "kurta set", "saree",
  "dresses", "jackets", "sweaters", "shoes", "sneakers", "sandals", "heels",
  "watches", "sunglasses", "handbags", "wallets", "belts", "jewellery",
  "smartphones", "mobiles", "laptops", "headphones", "earbuds", "smart watches",
  "cameras", "tablets", "chargers", "power banks", "speakers", "televisions",
  "cookware", "bedding", "decor", "lighting", "furniture", "curtains",
  "skin care", "makeup", "hair care", "fragrances", "perfumes",
  "cricket", "gym equipment", "yoga mats", "cycling", "fitness bands",
  "books", "novels", "textbooks", "stationery",
  "action figures", "board games", "toys", "puzzles",
  "car accessories", "helmets", "car care", "tyres",
  "fruits", "vegetables", "dairy", "snacks", "groceries", "organic food",
  "seeds", "pots", "garden tools", "outdoor furniture",
  "vitamins", "medical devices", "ayurveda", "baby care", "supplements",
  "dog food", "cat food", "pet toys", "pet grooming",
  "electronics", "fashion", "home", "kitchen", "beauty", "sports", "automotive",
]

/**
 * Returns the closest match for `query` from `dictionary` if it's within a
 * reasonable edit-distance threshold, otherwise null. Used to power
 * "Did you mean...?" prompts on zero-result searches.
 */
export function getDidYouMean(query: string, dictionary: string[] = SEARCH_DICTIONARY): string | null {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return null

  let best: { word: string; dist: number } | null = null
  for (const word of dictionary) {
    if (word === q) return null // exact match — no suggestion needed
    const dist = levenshtein(q, word)
    const threshold = q.length <= 4 ? 1 : q.length <= 7 ? 2 : 3
    if (dist <= threshold && (!best || dist < best.dist)) {
      best = { word, dist }
    }
  }
  return best ? best.word : null
}

/**
 * Builds a corrected version of a (possibly multi-word) search query by
 * checking each word against the dictionary and swapping in the closest
 * match where one is found. Returns null if no word could be improved.
 */
export function buildDidYouMeanQuery(query: string, dictionary: string[] = SEARCH_DICTIONARY): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Try the whole phrase first (handles multi-word dictionary entries like "kurta set")
  const wholeMatch = getDidYouMean(trimmed, dictionary);
  if (wholeMatch) return wholeMatch;

  // Otherwise correct word-by-word
  const words = trimmed.split(/\s+/);
  let changed = false;
  const corrected = words.map((w) => {
    const m = getDidYouMean(w, dictionary.flatMap((d) => d.split(/\s+/)));
    if (m) { changed = true; return m; }
    return w;
  });

  return changed ? corrected.join(" ") : null;
}
