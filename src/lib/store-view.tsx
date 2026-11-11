/**
 * Shared storefront data-loading and rendering.
 *
 * Two routes render a storefront:
 *   /<handle>            — the vanity URL sellers share
 *   /store/<sellerId>    — the original URL, kept alive forever because
 *                          sellers have PRINTED QR codes pointing at it
 *
 * Both must produce byte-identical pages, so the loader and the view live here
 * rather than being copied into each route.
 */
import { notFound } from "next/navigation";
import Image from "next/image";
import { PauseCircle } from "lucide-react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { SellerStoreClient } from "@/components/seller/SellerStoreClient";
import { storeUrlFor } from "@/lib/store-url";
import { isMissingColumnError } from "@/lib/pg-errors";
import { computeEffectivePrice, offersForProduct } from "@/lib/offer-pricing";

type StoreCollectionRow = {
  id: string;
  name: string;
  image: string | null;
  filterTag: string;
  productIds: string;
  sortOrder: number;
  fontStyle: string | null;
  iconShape: string | null;
};

// "fontStyle" and "iconShape" are both newer, optional StoreCollection
// columns added via raw SQL migrations rather than schema.prisma (see
// src/lib/collection-shapes.ts's file doc comment) — a migration file
// existing in the repo doesn't guarantee it has actually been run against a
// given database yet. Collections are a non-critical section of the page,
// so this degrades gracefully column-by-column (retrying without whichever
// one Postgres reports missing — not assumed in a fixed order) rather than
// letting one optional field take the whole storefront down.
async function fetchStoreCollections(sellerId: string): Promise<StoreCollectionRow[]> {
  let tryFontStyle = true;
  let tryIconShape = true;
  for (;;) {
    const cols = ["id", "name", "image", `"filterTag"`, `"productIds"`, `"sortOrder"`]
      .concat(tryFontStyle ? [`"fontStyle"`] : [], tryIconShape ? [`"iconShape"`] : []);
    try {
      const rows = (await db.$queryRawUnsafe(
        `SELECT ${cols.join(", ")}
         FROM "StoreCollection" WHERE "sellerId" = $1
         ORDER BY "sortOrder" ASC, "createdAt" ASC`,
        sellerId
      )) as Array<Record<string, unknown>>;
      return rows.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        image: (r.image as string | null) ?? null,
        filterTag: r.filterTag as string,
        productIds: r.productIds as string,
        sortOrder: r.sortOrder as number,
        fontStyle: tryFontStyle ? ((r.fontStyle as string | null) ?? null) : null,
        iconShape: tryIconShape ? ((r.iconShape as string | null) ?? null) : null,
      }));
    } catch (e) {
      if (tryIconShape && isMissingColumnError(e, "iconShape")) { tryIconShape = false; continue; }
      if (tryFontStyle && isMissingColumnError(e, "fontStyle")) { tryFontStyle = false; continue; }
      // Collections aren't worth failing the whole store page over — any
      // other unexpected error just means "show no collections this time".
      return [];
    }
  }
}

export const getSeller = unstable_cache(
  async (sellerId: string) => {
    // NOT catching DB errors here — a transient failure must throw so
    // unstable_cache never stores it. It previously caught everything and
    // returned null on any error, which is indistinguishable from "this
    // seller genuinely doesn't exist" — a brief DB blip would get cached as
    // a real 404 for this store for a full minute (revalidate: 60 below),
    // wrongly telling every visitor (and the seller themselves) the store
    // was gone. `if (!seller) return null` below still correctly caches a
    // GENUINE not-found/not-approved result, which is fine to cache.
    const seller = await db.seller.findUnique({
      where: { sellerId, status: "APPROVED" },
      include: {
        products: {
          where: { isActive: true },
          include: {
            category: true,
            variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
          },
          orderBy: { salesCount: "desc" },
          take: 200,
        },
        _count: { select: { products: true } },
        user: { select: { phone: true, firebaseUid: true } },
      },
    });
    if (!seller) return null;

    // Fold each product's active seller Offers (% Discount / Flat Amount
    // Off — see OffersManager.tsx) into the price/comparePrice shown on
    // this store's product cards, the same stacked math checkout uses (see
    // src/app/api/orders/route.ts, the authoritative source of the actual
    // amount charged — this only keeps the browsing experience in sync
    // with it). Buy X Get Y / Free Shipping / Custom / Deals of the Day /
    // Flash Sale offers don't change a single unit's price, so they're
    // left out of this — they still show as their own promotional badges.
    const activeOffers = await db.sellerOffer.findMany({
      where: { sellerId: seller.id, isActive: true },
      select: { offerType: true, discountVal: true, linkedProductId: true, isActive: true },
    });
    const pricedProducts =
      activeOffers.length === 0
        ? seller.products
        : seller.products.map((p) => {
            const applicable = offersForProduct(activeOffers, p.id).filter(
              (o) => o.offerType === "PERCENT_OFF" || o.offerType === "FLAT_OFF"
            );
            if (applicable.length === 0) return p;
            const { price, comparePrice } = computeEffectivePrice(p.price, p.comparePrice, applicable);
            return { ...p, price, comparePrice };
          });

    const collections = await fetchStoreCollections(seller.id);

    return { ...seller, products: pricedProducts, collections };
  },
  ["store-seller"],
  { revalidate: 60, tags: ["sellers"] }
);

// storeUrlFor now lives in lib/store-url.ts (re-exported here so existing
// `import { storeUrlFor } from "@/lib/store-view"` call sites, if any, keep
// working) — it moved so the seller Settings page (a client component) can
// use it too without pulling this file's server-only imports (db, next/cache).
export { storeUrlFor };

export async function buildStoreMetadata(sellerId: string): Promise<Metadata> {
  // Catch HERE, not inside getSeller — generateMetadata must never throw
  // (it would crash the whole page), but a DB hiccup fetching metadata
  // shouldn't be treated as "store not found" either. Fall back to a
  // generic title; the actual page body (StoreView below) does its own
  // fresh, separately-caught fetch and shows the real content or error.
  let seller;
  try {
    seller = await getSeller(sellerId);
  } catch {
    return { title: "NexCart Store" };
  }
  if (!seller) return { title: "Store Not Found" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexcart.vercel.app";
  const ogImageUrl = `${baseUrl}/api/og/seller/${seller.sellerId}`;
  // Point canonical/OG at the handle when the seller has one, so shared links
  // and search results show the pretty URL.
  const canonicalPath = storeUrlFor(seller);

  return {
    title: `${seller.storeName} — NexCart`,
    description: seller.description || `Shop at ${seller.storeName} on NexCart`,
    alternates: { canonical: `${baseUrl}${canonicalPath}` },
    openGraph: {
      title: `${seller.storeName} — NexCart`,
      description: seller.description || `Shop at ${seller.storeName} on NexCart`,
      url: `${baseUrl}${canonicalPath}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: seller.storeName }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${seller.storeName} — NexCart`,
      description: seller.description || `Shop at ${seller.storeName} on NexCart`,
      images: [ogImageUrl],
    },
  };
}

function calcBadges(seller: {
  totalSales: number;
  rating: number;
  _count: { products: number };
}): string[] {
  const badges: string[] = [];
  if (seller.totalSales >= 1)   badges.push("FIRST_SALE");
  if (seller.totalSales >= 100) badges.push("ORDERS_100");
  if (seller.totalSales >= 500) badges.push("ORDERS_500");
  if (seller.rating >= 4.5)     badges.push("TOP_RATED");
  if (seller.rating >= 4.9)     badges.push("FIVE_STAR");
  if (seller._count.products >= 20) badges.push("BIG_CATALOGUE");
  return badges;
}

/** Renders a storefront by sellerId, or triggers notFound(). */
export async function StoreView({ sellerId }: { sellerId: string }) {
  // Catch HERE (per-request), not inside getSeller, for the same reason as
  // page.tsx's homepage fetch: this keeps a transient DB error from ever
  // being written into the 60-second cache as if it were a real result.
  // Falling back to notFound() on a genuine error matches this route's
  // pre-existing behaviour — it's not a new UX decision, just no longer one
  // that can get stuck cached.
  let data;
  try {
    data = await getSeller(sellerId);
  } catch {
    notFound();
  }
  if (!data) notFound();

  const { collections, ...seller } = data;

  // highlights is a scalar field returned by Prisma automatically
  const highlights: string[] = (seller as { highlights?: string[] }).highlights ?? [];

  // Gather unique categories from seller's products
  const categories = Array.from(
    new Set(seller.products.map((p) => p.category?.name).filter(Boolean))
  ) as string[];

  const badges = calcBadges(seller);

  if ((seller as { storePaused?: boolean }).storePaused) {
    const pausedMsg = (seller as { storePausedMsg?: string | null }).storePausedMsg;
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-5 text-center max-w-md">
          {seller.logo && (
            <Image
              src={seller.logo}
              alt={seller.storeName}
              width={72}
              height={72}
              className="rounded-2xl object-contain border border-border/50 shadow-sm"
            />
          )}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted border border-border/50">
            <PauseCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold">{seller.storeName}</h1>
            <p className="text-sm font-medium text-muted-foreground">Store Temporarily Closed</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/40 px-5 py-4">
            <p className="text-[14px] text-foreground/80">
              {pausedMsg?.trim() || "This store is temporarily unavailable. Please check back soon."}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">The seller will reopen shortly. Thank you for your patience.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <SellerStoreClient seller={{ ...seller, highlights }} categories={categories} collections={collections} badges={badges} />
    </main>
  );
}
