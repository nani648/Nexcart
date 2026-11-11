import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/sellers/check-local?sellerIds=id1,id2
// Returns local store info for given seller IDs (the sellerId field, not db id)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("sellerIds") ?? "";
  const sellerIds = raw.split(",").map((s) => s.trim()).filter(Boolean);

  if (sellerIds.length === 0) {
    return NextResponse.json({ sellers: [] });
  }

  try {
    const sellers = await db.seller.findMany({
      where: { sellerId: { in: sellerIds }, status: "APPROVED" },
      select: {
        sellerId: true,
        storeName: true,
        isLocalStore: true,
        storeAddress: true,
        pickupHours: true,
        pickupAcceptsCOD: true,
      },
    });

    return NextResponse.json({ sellers });
  } catch {
    return NextResponse.json({ sellers: [] });
  }
}
