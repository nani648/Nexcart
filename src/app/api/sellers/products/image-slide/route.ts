import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { revalidateTag } from "next/cache";

/**
 * PATCH /api/sellers/products/image-slide
 *
 * Sets whether a product's storefront card auto-slides through all of its
 * photos on a timer (see cardImageAutoSlide on the Product model).
 *
 * Body (one of):
 *   { productId: "...", enabled: true | false }  — single product
 *   { enabled: true | false, applyToAll: true }  — every product at once
 *
 * Mirrors the single-vs-applyToAll shape of /api/sellers/products/border.
 */
export async function PATCH(req: NextRequest) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await db.seller.findFirst({
      where: { user: { firebaseUid } },
      select: { id: true },
    });
    if (!seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

    let body: { productId?: string; enabled?: boolean; applyToAll?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { productId, applyToAll } = body;
    const enabled = !!body.enabled;

    if (applyToAll) {
      const result = await db.product.updateMany({
        where: { sellerId: seller.id },
        data: { cardImageAutoSlide: enabled },
      });

      revalidateTag("sellers");
      revalidateTag("products");
      return NextResponse.json({ success: true, updated: result.count, enabled });
    }

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    // Ownership is enforced by the sellerId in the same statement that
    // writes, so no separate lookup is needed. count === 0 means not found
    // or not theirs.
    const result = await db.product.updateMany({
      where: { id: productId, sellerId: seller.id },
      data: { cardImageAutoSlide: enabled },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    revalidateTag("sellers");
    revalidateTag("products");
    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error("[PATCH /api/sellers/products/image-slide] Error:", error);
    return NextResponse.json({ error: "Failed to update image slide setting" }, { status: 500 });
  }
}
