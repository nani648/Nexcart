// Category-based seller commission — NexCart's cut of each order line,
// deducted from the seller's wallet credit at order-creation time (see
// /api/orders/route.ts). Rates are intentionally below Amazon/Flipkart's
// typical referral fees (which range ~5-18% depending on category) to stay
// competitive for sellers, while still charging more on higher-margin,
// discretionary categories than on low-margin essentials.
//
// Keyed by the real Category.slug values, sourced from the same 27-category
// taxonomy that drives the Add Product picker (see category-config.ts) —
// NOT the older, smaller CATEGORY_PREFIXES list in constants.ts.
export const CATEGORY_COMMISSION_PERCENT: Record<string, number> = {
  // Essentials / low-margin — keep near-zero to encourage volume
  grocery: 3,
  "fresh-food": 3,

  // Everyday / functional
  baby: 4,
  health: 4,
  stationery: 4,
  books: 4,

  // General merchandise
  electronics: 5,
  appliances: 5,
  "computer-parts": 5,
  automotive: 5,
  tools: 5,
  sports: 5,
  toys: 5,
  garden: 5,
  pets: 5,

  // Mid-margin lifestyle
  furniture: 6,
  "home-kitchen": 6,
  musical: 6,
  optical: 6,
  photography: 6,
  travel: 6,
  religious: 6,
  handicrafts: 6,

  // Higher-margin / discretionary
  accessories: 7,
  beauty: 7,

  // Highest — fashion & occasion-driven, highest typical retail margin
  fashion: 8,
  "wedding-events": 8,
  collectibles: 8,
};

// Applied to any product with no category, or a category slug not present
// above (e.g. a category created after this table was last updated).
export const DEFAULT_COMMISSION_PERCENT = 5;

// New sellers pay ZERO commission on every order for their first 30 days on
// the platform, counted from Seller.createdAt (registration), regardless of
// category — lets them sell as many products as they want, commission-free,
// while they're getting started. Product listing has no cap for any seller
// (there is no subscription/plan system on this platform), so nothing else
// needs to change for the "no product limit" half of this.
export const FREE_COMMISSION_DAYS = 30;

export function isInFreeCommissionWindow(sellerCreatedAt: Date | null | undefined): boolean {
  if (!sellerCreatedAt) return false;
  const elapsedMs = Date.now() - new Date(sellerCreatedAt).getTime();
  return elapsedMs >= 0 && elapsedMs < FREE_COMMISSION_DAYS * 24 * 60 * 60 * 1000;
}

export function getCommissionPercent(categorySlug: string | null | undefined): number {
  if (!categorySlug) return DEFAULT_COMMISSION_PERCENT;
  return CATEGORY_COMMISSION_PERCENT[categorySlug] ?? DEFAULT_COMMISSION_PERCENT;
}

// Returns { percent, commission, netAmount } rounded to paise, given a line
// total, the product's category slug, and the selling seller's registration
// date. netAmount is what gets credited to the seller's wallet. Pass
// sellerCreatedAt whenever it's available so the first-30-days free window
// is honored; omitting it (undefined) means "not exempt" — always charge.
export function computeCommission(
  lineTotal: number,
  categorySlug: string | null | undefined,
  sellerCreatedAt?: Date | null
) {
  if (isInFreeCommissionWindow(sellerCreatedAt)) {
    return { percent: 0, commission: 0, netAmount: Math.round(lineTotal * 100) / 100 };
  }
  const percent = getCommissionPercent(categorySlug);
  const commission = Math.round(lineTotal * percent) / 100; // (lineTotal * percent / 100), rounded to paise
  const netAmount = Math.round((lineTotal - commission) * 100) / 100;
  return { percent, commission, netAmount };
}
