import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { revalidateTag } from "next/cache";

// Same "#rrggbb" or "#rrggbb,#rrggbb" gradient format as every other colour
// field in this app (see lib/store-color.ts).
const COLOR_REGEX = /^#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})?$/;

/**
 * PATCH /api/sellers/products/border
 *
 * Sets the product card border colour for the seller's own products.
 *
 * Body (one of):
 *   { productId: "...", color: "#rrggbb" | "#rrggbb,#rrggbb" | "" }  — single product
 *   { color: "...", applyToAll: true }                               — every product at once
 *
 * An empty/omitted colour clears the border ("no border"). Mirrors the
 * single-vs-applyToAll shape of /api/sellers/products/design.
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

    let body: { productId?: string; color?: string; applyToAll?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { productId, applyToAll } = body;
    const color = body.color ?? "";

    if (color && !COLOR_REGEX.test(color)) {
      return NextResponse.json(
        { error: "Must be a valid hex color or hex,hex gradient pair" },
        { status: 400 }
      );
    }

    if (applyToAll) {
      const result = await db.product.updateMany({
        where: { sellerId: seller.id },
        data: { cardBorderColor: color || null },
      });

      revalidateTag("sellers");
      revalidateTag("products");
      return NextResponse.json({ success: true, updated: result.count, color });
    }

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    // Ownership is enforced by the sellerId in the same statement that
    // writes, so no separate lookup is needed. count === 0 means not found
    // or not theirs.
    const result = await db.product.updateMany({
      where: { id: productId, sellerId: seller.id },
      data: { cardBorderColor: color || null },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    revalidateTag("sellers");
    revalidateTag("products");
    return NextResponse.json({ success: true, color });
  } catch (error) {
    console.error("[PATCH /api/sellers/products/border] Error:", error);
    return NextResponse.json({ error: "Failed to update border colour" }, { status: 500 });
  }
}
