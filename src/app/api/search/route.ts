import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/rate-limit";
import { checkRateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { getOrSet, CACHE_KEYS } from "@/lib/cache";

export async function GET(req: NextRequest) {
  // 30 searches per minute per IP. Redis-backed (lib/ratelimit) so the limit
  // is durable across serverless instances, not reset on cold start.
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`search:${ip}`, RATE_LIMITS.search);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().slice(0, 200) || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const type = searchParams.get("type"); // "product" | "seller" | null (both)

  if (!q) return NextResponse.json({ results: [], total: 0 });

  // Cache search results 60 s — popular queries served from Redis, not DB
  const result = await getOrSet(
    CACHE_KEYS.search(q, type || "all"),
    async () => {
      type Result = {
        type: "product" | "seller";
        id: string;
        name: string;
        subtitle?: string;
        image?: string;
        price?: number;
        rating?: number;
      };
      const results: Result[] = [];

      const sellerIdPattern = /^[A-Z]{2,6}\d{3}$/i;
      const productIdPattern = /^[A-Z]{2,6}\d{3}-P\d+$/i;

      if (productIdPattern.test(q)) {
        const product = await db.product.findUnique({
          where: { productId: q.toUpperCase() },
          include: { seller: { select: { storeName: true } } },
        });
        if (product) {
          results.push({
            type: "product",
            id: product.productId,
            name: product.name,
            subtitle: product.seller.storeName,
            image: product.images[0],
            price: product.price,
            rating: product.rating,
          });
        }
      } else if (sellerIdPattern.test(q)) {
        const seller = await db.seller.findUnique({ where: { sellerId: q.toUpperCase() } });
        if (seller) {
          results.push({ type: "seller", id: seller.sellerId, name: seller.storeName, image: seller.logo || undefined });
        }
      } else {
        const [sellers, products] = await Promise.all([
          (!type || type === "seller")
            ? db.seller.findMany({
                where: {
                  status: "APPROVED",
                  OR: [
                    { storeName: { contains: q, mode: "insensitive" } },
                    { sellerId: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                  ],
                },
                take: Math.floor(limit / 2),
              })
            : Promise.resolve([]),
          (!type || type === "product")
            ? db.product.findMany({
                where: {
                  isActive: true,
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { productId: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                    { tags: { has: q.toLowerCase() } },
                  ],
                },
                include: { seller: { select: { storeName: true } } },
                take: limit,
                orderBy: { salesCount: "desc" },
              })
            : Promise.resolve([]),
        ]);

        sellers.forEach((s) =>
          results.push({ type: "seller", id: s.sellerId, name: s.storeName, image: s.logo || undefined })
        );
        products.forEach((p) =>
          results.push({
            type: "product",
            id: p.productId,
            name: p.name,
            subtitle: p.seller.storeName,
            image: p.images[0],
            price: p.price,
            rating: p.rating,
          })
        );
      }

      return { results, total: results.length };
    },
    60
  );

  return NextResponse.json(result);
}
