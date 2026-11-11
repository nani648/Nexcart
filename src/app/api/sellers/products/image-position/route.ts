import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { revalidateTag } from "next/cache";

// Same "X% Y%" object-position format used everywhere else this value is
// read/written (ProductCard.tsx, validations.ts, ImagePositionPicker.tsx).
const POSITION_REGEX = /^\d{1,3}% \d{1,3}%$/;

/**
 * PATCH /api/sellers/products/image-position
 *
 * Sets the storefront card focal point (cover-photo crop) for ONE of the
 * seller's own products, so what they dragged in the Product Card Design
 * preview actually shows up on the real storefront card — not just in the
 * in-browser preview, which updates instantly on its own but never touches
 * the database until this is called.
 *
 * Body: { productId: "...", position: "50% 20%" | "" }
 * An empty/omitted position clears it back to the default ("center center").
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

    let body: { productId?: string; position?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { productId } = body;
    const position = body.position ?? "";

    if (position && !POSITION_REGEX.test(position)) {
      return NextResponse.json(
        { error: 'Must be a position like "50% 50%"' },
        { status: 400 }
      );
    }
    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    // Ownership is enforced by the sellerId in the same statement that
    // writes, so no separate lookup is needed. count === 0 means not found
    // or not theirs.
    const result = await db.product.updateMany({
      where: { id: productId, sellerId: seller.id },
      data: { cardImagePosition: position || null },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    revalidateTag("sellers");
    revalidateTag("products");
    return NextResponse.json({ success: true, position });
  } catch (error) {
    console.error("[PATCH /api/sellers/products/image-position] Error:", error);
    return NextResponse.json({ error: "Failed to save photo position" }, { status: 500 });
  }
}
