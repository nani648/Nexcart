import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sellerId: string } }
) {
  const seller = await db.seller.findUnique({
    where: { sellerId: params.sellerId, status: "APPROVED" },
    select: { id: true },
  });

  if (!seller) return NextResponse.json({ offers: [] });

  const offers = await db.sellerOffer.findMany({
    where: { sellerId: seller.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      offerType: true,
      buyQty: true,
      getQty: true,
      discountVal: true,
      badgeColor: true,
      linkedProductId: true,
      selectedProductIds: true,
    },
  });

  return NextResponse.json({ offers }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
