import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { revalidateTag } from "next/cache";

// GET — seller's products with flash sale status
export async function GET(req: NextRequest) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid: uid },
    include: { seller: { select: { id: true } } },
  });
  if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const products = await db.product.findMany({
    where: { sellerId: user.seller.id, isActive: true },
    select: {
      id: true, productId: true, name: true, price: true,
      comparePrice: true, images: true, stock: true, isFlashSale: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}

// PATCH — toggle isFlashSale for a product
export async function PATCH(req: NextRequest) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid: uid },
    include: { seller: { select: { id: true } } },
  });
  if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const { productId, isFlashSale } = await req.json();
  if (!productId || typeof isFlashSale !== "boolean")
    return NextResponse.json({ error: "productId and isFlashSale required" }, { status: 400 });

  // Ensure the product belongs to this seller
  const product = await db.product.findFirst({
    where: { id: productId, sellerId: user.seller.id },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const updated = await db.product.update({
    where: { id: productId },
    data: { isFlashSale },
    select: { id: true, isFlashSale: true },
  });

  revalidateTag("sellers");
  revalidateTag("products");
  revalidateTag("flash-sale");
  return NextResponse.json({ product: updated });
}
