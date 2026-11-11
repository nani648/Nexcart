import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const variantSchema = z.object({
  productId: z.string(),
  name: z.string().min(1),
  value: z.string().min(1),
  stock: z.number().int().min(0),
  price: z.number().positive().nullable().optional(),
  combo: z.record(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await getVerifiedUid(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { firebaseUid: userId },
      include: { seller: true },
    });
    if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const parsed = variantSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    // Verify ownership
    const product = await db.product.findUnique({ where: { id: parsed.data.productId } });
    if (!product || product.sellerId !== user.seller.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // combo is not a DB column — strip it before insert
    const { combo, ...variantData } = parsed.data;
    void combo;

    const variant = await db.productVariant.create({
      data: {
        ...variantData,
        price: variantData.price ?? null,
      },
    });
    return NextResponse.json(variant, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products/variants] Error:", error);
    return NextResponse.json({ error: "Failed to create variant" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getVerifiedUid(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get("id");
    if (!variantId) return NextResponse.json({ error: "Variant ID required" }, { status: 400 });

    const user = await db.user.findUnique({
      where: { firebaseUid: userId },
      include: { seller: true },
    });

    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!variant) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (variant.product.sellerId !== user?.seller?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.productVariant.delete({ where: { id: variantId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/products/variants] Error:", error);
    return NextResponse.json({ error: "Failed to delete variant" }, { status: 500 });
  }
}
