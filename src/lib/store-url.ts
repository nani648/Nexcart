/**
 * Canonical public URL path for a seller's storefront — the vanity handle
 * when set, else the legacy `/store/[sellerId]` route that stays alive
 * forever because sellers have printed QR codes pointing at it.
 *
 * Pure and dependency-free (no Prisma, no next/navigation, no next/cache) —
 * unlike lib/store-view.tsx, which pulls in the database client, this file
 * is safe to import from a "use client" component too (e.g. the seller
 * Settings page's "My Store" card).
 */
export function storeUrlFor(seller: { sellerId: string; storeHandle?: string | null }): string {
  return seller.storeHandle ? `/${seller.storeHandle}` : `/store/${seller.sellerId}`;
}
