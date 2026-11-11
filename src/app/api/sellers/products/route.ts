import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { firebaseUid },
      include: { seller: true },
    });
    if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

    const products = await db.product.findMany({
      where: { sellerId: user.seller.id },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        products,
        sellerId: user.seller.id,
      },
      { headers: { "Cache-Control": "private, max-age=0, stale-while-revalidate=30" } }
    );
  } catch (error) {
    console.error("[GET /api/sellers/products] Error:", error);
    return NextResponse.json({ error: "Failed to fetch seller products" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { firebaseUid },
      include: { seller: true },
    });
    if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

    let body: { productId?: string; isActive?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { productId, isActive } = body;
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

    const product = await db.product.findFirst({
      where: { id: productId, sellerId: user.seller.id },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const updated = await db.product.update({
      where: { id: productId },
      data: { isActive: typeof isActive === "boolean" ? isActive : !product.isActive },
    });

    return NextResponse.json({ success: true, isActive: updated.isActive });
  } catch (error) {
    console.error("[PATCH /api/sellers/products] Error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { firebaseUid },
      include: { seller: true },
    });
    if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

    let body: { productId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { productId } = body;
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

    const product = await db.product.findFirst({
      where: { id: productId, sellerId: user.seller.id },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    await db.cartItem.deleteMany({ where: { productId } });
    await db.wishlistItem.deleteMany({ where: { productId } });

    // Order items and reviews are the purchase/reputation record — the
    // database itself now refuses (onDelete: Restrict) to let a hard delete
    // silently take them with it. Same soft-delete fallback for both: a
    // product that has ever been ordered or reviewed is deactivated
    // (isActive=false, hidden from the storefront) instead of erased.
    const [orderItemCount, reviewCount] = await Promise.all([
      db.orderItem.count({ where: { productId } }),
      db.review.count({ where: { productId } }),
    ]);
    if (orderItemCount > 0 || reviewCount > 0) {
      await db.product.update({ where: { id: productId }, data: { isActive: false } });
      return NextResponse.json({ success: true });
    }

    await db.product.delete({ where: { id: productId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/sellers/products] Error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
