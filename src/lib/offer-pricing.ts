import { calcDiscount } from "@/lib/product-utils";

/**
 * Combines a product's own price/comparePrice discount with the seller's
 * active "Offers" (see OffersManager.tsx / SellerOffer model) so a shopper
 * sees — and is actually charged — the STACKED discount, not just the
 * product's own one.
 *
 * Example (this is the exact behaviour a seller asked for): a product is
 * already ₹100 -> ₹80 (20% off, via its own price/comparePrice). The seller
 * then turns on a "20% Discount" Offer for it. The two stack ADDITIVELY on
 * the reference (comparePrice) price: 20% + 20% = 40% off ₹100 = ₹60 — not
 * a compounded 20%-of-₹80 (which would only be 36% off / ₹64).
 *
 * Only PERCENT_OFF and FLAT_OFF offers have a plain numeric value that can
 * be combined into a price this way. The other offer types are handled
 * differently by their callers:
 *  - BUY_X_GET_Y is a cart-quantity promotion, not a per-unit price cut —
 *    see computeFreeUnits() below, applied at checkout once a real quantity
 *    is known.
 *  - FREE_SHIPPING affects the delivery fee, not the item price.
 *  - CUSTOM, DEALS_OF_THE_DAY and FLASH_SALE carry no discount number on the
 *    offer record itself (CUSTOM is free text; DEALS_OF_THE_DAY and
 *    FLASH_SALE are just product groupings/badges) — there is nothing to
 *    fold into a price for these, so they stay exactly as they already are
 *    today: a display badge, unrelated to this calculation.
 */

/** Minimal shape needed from a SellerOffer row to compute price stacking. */
export interface PricingOffer {
  offerType: string;
  discountVal: number | null;
}

/**
 * Shape needed by offersForProduct() below — PricingOffer plus the two
 * fields it filters on. Kept as one concrete interface (not generic)
 * because a generic version tripped TypeScript's inference into collapsing
 * to the bare constraint at some call sites — this is simpler and just as
 * safe structurally (every caller's Prisma `select` is a superset of this).
 */
export interface SellerOfferForPricing extends PricingOffer {
  isActive: boolean;
  linkedProductId: string | null;
  buyQty?: number | null;
  getQty?: number | null;
}

export interface EffectivePricing {
  /** Final per-unit price after stacking every active PERCENT_OFF / FLAT_OFF
   * offer on top of the product's own price/comparePrice discount. */
  price: number;
  /** Reference "was" price to show struck through — null when there's no
   * discount at all (nothing to strike through). */
  comparePrice: number | null;
  /** Total % off vs the reference price (rounded), product's own discount +
   * every stacked offer. */
  discountPercent: number;
}

// Safety floor — even with several offers stacked, a price should never be
// driven all the way to (or past) zero. Caps the PERCENT portion of the
// stack; flat-amount offers are subtracted afterwards and separately
// floored at ₹1 below.
const MAX_STACKED_DISCOUNT_PERCENT = 90;

export function computeEffectivePrice(
  price: number,
  comparePrice: number | null | undefined,
  offers: PricingOffer[]
): EffectivePricing {
  const referencePrice = comparePrice && comparePrice > price ? comparePrice : price;
  const ownDiscountPercent = calcDiscount(price, comparePrice ?? null);

  const percentOffSum = offers
    .filter((o) => o.offerType === "PERCENT_OFF" && (o.discountVal ?? 0) > 0)
    .reduce((sum, o) => sum + (o.discountVal ?? 0), 0);

  const flatOffSum = offers
    .filter((o) => o.offerType === "FLAT_OFF" && (o.discountVal ?? 0) > 0)
    .reduce((sum, o) => sum + (o.discountVal ?? 0), 0);

  // Nothing stacking — pass the product's own price/comparePrice through
  // completely unchanged (no rounding drift on the common case).
  if (percentOffSum === 0 && flatOffSum === 0) {
    return {
      price,
      comparePrice: comparePrice && comparePrice > price ? comparePrice : null,
      discountPercent: ownDiscountPercent,
    };
  }

  const totalPercent = Math.min(MAX_STACKED_DISCOUNT_PERCENT, ownDiscountPercent + percentOffSum);
  let effective = referencePrice * (1 - totalPercent / 100);
  effective = effective - flatOffSum;
  effective = Math.max(1, Math.round(effective * 100) / 100); // never below ₹1

  const finalPercent =
    referencePrice > effective ? Math.round(((referencePrice - effective) / referencePrice) * 100) : 0;

  return {
    price: effective,
    comparePrice: referencePrice > effective ? referencePrice : null,
    discountPercent: finalPercent,
  };
}

/**
 * Offers that actually apply to a given product: seller-wide offers
 * (linkedProductId === null) plus any offer specifically linked to this
 * product — matches the same "product-specific + store-wide" rule already
 * used for the product page's Promotions carousel.
 */
export function offersForProduct(
  allOffers: SellerOfferForPricing[],
  productId: string
): SellerOfferForPricing[] {
  return allOffers.filter(
    (o) => o.isActive && (o.linkedProductId === null || o.linkedProductId === productId)
  );
}

/** Minimal shape needed from a BUY_X_GET_Y SellerOffer row. */
export interface BuyXGetYOffer {
  buyQty?: number | null;
  getQty?: number | null;
}

/**
 * How many of `quantity` purchased units are free under a "Buy X Get Y"
 * offer — one free bundle per complete (buyQty + getQty) group. E.g. "Buy 3
 * Get 1 Free" (bundle size 4): buying 8 gives 2 free units; buying 5 gives
 * only 1 free unit (the 5th doesn't complete a second bundle).
 */
export function computeFreeUnits(quantity: number, offer: BuyXGetYOffer): number {
  const buy = offer.buyQty ?? 0;
  const get = offer.getQty ?? 0;
  if (buy <= 0 || get <= 0 || quantity <= 0) return 0;
  const bundleSize = buy + get;
  const bundles = Math.floor(quantity / bundleSize);
  return bundles * get;
}
