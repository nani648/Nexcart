import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 60; // cache 60s

export async function GET() {
  try {
    // Fetch all active DEALS_OF_THE_DAY offers
    const offers = await db.sellerOffer.findMany({
      where: { offerType: "DEALS_OF_THE_DAY", isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (offers.length === 0) {
      return NextResponse.json({ deals: [] });
    }

    // Collect all product IDs from all sellers' deal offers
    const productIds: string[] = [];
    for (const offer of offers) {
      if (offer.selectedProductIds) {
        try {
          const ids = JSON.parse(offer.selectedProductIds) as string[];
          productIds.push(...ids);
        } catch {
          // ignore bad JSON
        }
      }
      if (offer.linkedProductId) {
        productIds.push(offer.linkedProductId);
      }
    }

    // Remove duplicates
    const uniqueIds = [...new Set(productIds)];

    if (uniqueIds.length === 0) {
      return NextResponse.json({ deals: [] });
    }

    // Fetch the actual products
    const products = await db.product.findMany({
      where: {
        id: { in: uniqueIds },
        isActive: true,
        stock: { gt: 0 },
      },
      select: {
        id: true,
        productId: true,
        name: true,
        price: true,
        comparePrice: true,
        images: true,
        stock: true,
        seller: { select: { storeName: true, id: true, sellerId: true } },
        variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
      },
    });

    // Build deal items with discount %
    const deals = products
      .filter((p) => p.comparePrice && p.comparePrice > p.price)
      .map((p) => ({
        id: p.id,
        productId: p.productId,
        name: p.name,
        price: p.price,
        comparePrice: p.comparePrice!,
        images: p.images,
        stock: p.stock,
        storeName: p.seller.storeName,
        sellerId: p.seller.sellerId,
        discount: Math.round(((p.comparePrice! - p.price) / p.comparePrice!) * 100),
        variants: p.variants,
      }))
      .sort((a, b) => b.discount - a.discount);

    return NextResponse.json({ deals }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    });
  } catch (err) {
    console.error("deals-of-the-day error:", err);
    return NextResponse.json({ deals: [] });
  }
}
