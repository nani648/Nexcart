import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";

export const revalidate = 60;

const getFlashSaleProducts = unstable_cache(
  // NOT catching DB errors here — see src/app/page.tsx for the full
  // reasoning. Letting a failure throw stops unstable_cache from storing a
  // transient blip as a cached "zero deals" result for 60 seconds.
  async () => {
    return db.product.findMany({
      where: { isFlashSale: true, isActive: true, stock: { gt: 0 } },
      select: {
        id: true, productId: true, name: true, price: true,
        comparePrice: true, images: true, stock: true, rating: true,
        reviewCount: true, condition: true, isFeatured: true,
        seller: { select: { sellerId: true, storeName: true } },
        variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
      },
      orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
      take: 60,
    });
  },
  ["flash-sale-products"],
  { revalidate: 60, tags: ["flash-sale", "products"] }
);

export async function GET() {
  try {
    const products = await getFlashSaleProducts();
    return NextResponse.json({ products }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    });
  } catch (err) {
    // Caught here (per-request), not inside getFlashSaleProducts — same
    // reasoning as above. On top of that: a real failure must NOT be
    // returned as a 200 with a cacheable "no deals" body, or CDNs/browsers
    // would cache the failure too (on top of unstable_cache). A 503 with
    // no-store tells every layer this was a failure, not real data.
    console.error("[api/flash-sale] Error:", err);
    return NextResponse.json(
      { error: "Unable to load flash sale products right now." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
