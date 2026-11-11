import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { revalidateTag } from "next/cache";
import {
  CARD_DESIGN_KEYS,
  CARD_FONT_KEYS,
  isCardDesignKey,
  isCardFontKey,
  normalizeFontForStorage,
  pickRandomDesignKey,
  RANDOM_DESIGN_VALUE,
} from "@/lib/card-designs";

/**
 * PATCH /api/sellers/products/design
 *
 * Sets the storefront card design for the seller's own products.
 *
 * Body (one of):
 *   { productId: "...", design: "elevated" | "random" }   — single product
 *   { design: "elevated", applyToAll: true }              — every product
 *   { randomizeAll: true }                                — a fresh random mix
 *
 * "random" is always resolved to a concrete key before writing, so a product's
 * appearance is stable once set. Nothing is randomised at render time.
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

    let body: {
      productId?: string;
      design?: string;
      font?: string;
      applyToAll?: boolean;
      randomizeAll?: boolean;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { productId, design, font, applyToAll, randomizeAll } = body;

    // ── Font-only update for a single product ──────────────────────────────
    // Font and design are independent axes, so a seller changing just the text
    // style must not have their frame reset to a default.
    if (font && !design && !randomizeAll) {
      if (font !== RANDOM_DESIGN_VALUE && !isCardFontKey(font)) {
        return NextResponse.json(
          { error: `Unknown font. Expected one of: ${CARD_FONT_KEYS.join(", ")}` },
          { status: 400 }
        );
      }
      const fontKey = normalizeFontForStorage(font);

      const where = applyToAll
        ? { sellerId: seller.id }
        : { id: productId ?? "", sellerId: seller.id };

      if (!applyToAll && !productId) {
        return NextResponse.json({ error: "productId required" }, { status: 400 });
      }

      const result = await db.product.updateMany({ where, data: { cardFont: fontKey } });
      if (!applyToAll && result.count === 0) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      revalidateTag("sellers");
      revalidateTag("products");
      return NextResponse.json({ success: true, font: fontKey, updated: result.count });
    }

    // ── Give every product a different random design ───────────────────────
    // Each product needs its OWN key, so this cannot be a single updateMany.
    // It is grouped into one write per design (max 7) rather than one write per
    // product, which keeps a 500-product catalogue at 7 queries instead of 500.
    if (randomizeAll) {
      const products = await db.product.findMany({
        where: { sellerId: seller.id },
        select: { id: true },
      });
      if (products.length === 0) {
        return NextResponse.json({ success: true, updated: 0 });
      }

      const buckets = new Map<string, string[]>();
      for (const p of products) {
        const key = pickRandomDesignKey();
        const list = buckets.get(key);
        if (list) list.push(p.id);
        else buckets.set(key, [p.id]);
      }

      await db.$transaction(
        Array.from(buckets.entries()).map(([key, ids]) =>
          db.product.updateMany({
            where: { id: { in: ids }, sellerId: seller.id },
            data: { cardDesign: key },
          })
        )
      );

      revalidateTag("sellers");
      revalidateTag("products");
      return NextResponse.json({ success: true, updated: products.length });
    }

    // ── Everything below needs a concrete design ───────────────────────────
    if (!design) {
      return NextResponse.json({ error: "design is required" }, { status: 400 });
    }
    if (design !== RANDOM_DESIGN_VALUE && !isCardDesignKey(design)) {
      return NextResponse.json(
        { error: `Unknown design. Expected one of: ${CARD_DESIGN_KEYS.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Apply one design to the whole catalogue ────────────────────────────
    if (applyToAll) {
      // A single "random" here means one random design shared by every product,
      // which is what "apply this to all" implies. Use randomizeAll for a mix.
      const key = design === RANDOM_DESIGN_VALUE ? pickRandomDesignKey() : design;
      const result = await db.product.updateMany({
        where: { sellerId: seller.id },
        data: { cardDesign: key },
      });

      revalidateTag("sellers");
      revalidateTag("products");
      return NextResponse.json({ success: true, updated: result.count, design: key });
    }

    // ── Single product ─────────────────────────────────────────────────────
    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const key = design === RANDOM_DESIGN_VALUE ? pickRandomDesignKey() : design;

    // Ownership is enforced by the sellerId in the same statement that writes,
    // so no separate lookup is needed. count === 0 means not found or not theirs.
    const result = await db.product.updateMany({
      where: { id: productId, sellerId: seller.id },
      data: { cardDesign: key },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    revalidateTag("sellers");
    revalidateTag("products");
    return NextResponse.json({ success: true, design: key });
  } catch (error) {
    console.error("[PATCH /api/sellers/products/design] Error:", error);
    return NextResponse.json({ error: "Failed to update design" }, { status: 500 });
  }
}
