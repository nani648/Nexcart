import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrSet, CACHE_KEYS } from "@/lib/cache";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sellerId: string } }
) {
  const seller = await getOrSet(
    CACHE_KEYS.seller(params.sellerId),
    () =>
      db.seller.findUnique({
        where: { sellerId: params.sellerId, status: "APPROVED" },
        include: {
          products: {
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { category: { select: { name: true, slug: true } } },
          },
          _count: { select: { products: true } },
        },
      }),
    300 // 5 minutes
  );

  if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

  return NextResponse.json(seller, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
