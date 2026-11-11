import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type CollectionRow = { id: string; name: string; image: string | null; filterTag: string; productIds: string; sortOrder: number };

export async function GET(_req: NextRequest, { params }: { params: { sellerId: string } }) {
  const seller = await db.seller.findUnique({
    where: { sellerId: params.sellerId },
    select: { id: true },
  });
  if (!seller) return NextResponse.json({ collections: [] });

  const rows = (await db.$queryRawUnsafe(
    `SELECT id, name, image, "filterTag", "productIds", "sortOrder"
     FROM "StoreCollection"
     WHERE "sellerId" = $1
     ORDER BY "sortOrder" ASC, "createdAt" ASC`,
    seller.id
  )) as CollectionRow[];
  return NextResponse.json({ collections: rows }, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
  });
}
