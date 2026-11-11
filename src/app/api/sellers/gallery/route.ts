import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { revalidateTag } from "next/cache";

// GET — seller's gallery: their selected product IDs + full product data
export async function GET(req: NextRequest) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid: uid },
    include: { seller: { select: { id: true, galleryProductIds: true } } },
  });
  if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  // All active products for picking
  const allProducts = await db.product.findMany({
    where: { sellerId: user.seller.id, isActive: true },
    select: {
      id: true, productId: true, name: true, price: true,
      comparePrice: true, images: true, stock: true,
      variants: { select: { id: true, value: true, price: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    galleryProductIds: user.seller.galleryProductIds,
    products: allProducts,
  }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}

// PATCH — update gallery product IDs list
export async function PATCH(req: NextRequest) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid: uid },
    include: { seller: { select: { id: true } } },
  });
  if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const { galleryProductIds } = await req.json();
  if (!Array.isArray(galleryProductIds))
    return NextResponse.json({ error: "galleryProductIds must be an array" }, { status: 400 });

  await db.seller.update({
    where: { id: user.seller.id },
    data: { galleryProductIds },
  });

  revalidateTag("sellers");
  return NextResponse.json({ success: true, galleryProductIds });
}
