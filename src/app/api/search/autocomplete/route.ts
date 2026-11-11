import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/rate-limit";
import { checkRateLimit, RATE_LIMITS } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  // 60 autocomplete calls per minute per IP. Redis-backed (lib/ratelimit) so
  // the limit is durable across serverless instances, not reset on cold start.
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`autocomplete:${ip}`, RATE_LIMITS.autocomplete);
  if (!rl.success) {
    return NextResponse.json({ suggestions: [] }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().slice(0, 100) || ""; // cap query length

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    // Run all queries in parallel
    const [productSuggestions, categories, sellers] = await Promise.all([
      // Products
      db.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { tags: { hasSome: [q.toLowerCase()] } },
          ],
        },
        select: {
          id: true,
          name: true,
          productId: true,
          images: true,
          price: true,
          salesCount: true,
        },
        orderBy: { salesCount: "desc" },
        take: 5,
      }),
      // Categories
      db.category.findMany({
        where: {
          isActive: true,
          name: { contains: q, mode: "insensitive" },
        },
        select: { id: true, name: true, slug: true },
        take: 3,
      }),
      // Sellers — includes local stores so they are discoverable by name or ID
      db.seller.findMany({
        where: {
          status: "APPROVED",
          OR: [
            { storeName: { contains: q, mode: "insensitive" } },
            { sellerId: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { sellerId: true, storeName: true, logo: true },
        take: 3,
      }),
    ]);

    const suggestions = [
      // Seller suggestions first so local stores surface prominently
      ...sellers.map((s) => ({
        type: "seller" as const,
        id: s.sellerId,
        title: s.storeName,
        subtitle: "Store",
        image: s.logo || null,
      })),
      // Product suggestions
      ...productSuggestions.map((p) => ({
        type: "product" as const,
        id: p.productId,
        title: p.name,
        subtitle: `₹${p.price.toFixed(0)}`,
        image: p.images[0] || null,
      })),
      // Category suggestions
      ...categories.map((c) => ({
        type: "category" as const,
        id: c.slug,
        title: c.name,
        subtitle: "Category",
        image: null,
      })),
    ];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
