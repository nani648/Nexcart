import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { firebaseUid },
      include: { seller: true },
    });
    if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

    const seller = user.seller;

    let body: { productId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { productId } = body;
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

    // Find the source product and verify seller ownership
    const source = await db.product.findFirst({
      where: { id: productId, sellerId: seller.id },
      include: { variants: true },
    });
    if (!source) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Generate new unique productId
    const newProductId = `PROD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Create the duplicate (strip relations, reset counters, append suffix)
    const duplicate = await db.product.create({
      data: {
        productId: newProductId,
        sellerId: seller.id,
        categoryId: source.categoryId,
        name: `${source.name} (Copy)`,
        description: source.description,
        price: source.price,
        comparePrice: source.comparePrice,
        stock: source.stock,
        images: source.images,
        tags: source.tags,
        isActive: false, // start as inactive so seller can review before publishing
        isFeatured: false,
        condition: source.condition,
        productTypeId: source.productTypeId,
        specifications: source.specifications ?? undefined,
        // rating, reviewCount, salesCount intentionally reset to defaults
      },
    });

    // Duplicate variants if any
    if (source.variants.length > 0) {
      await db.productVariant.createMany({
        data: source.variants.map((v) => ({
          productId: duplicate.id,
          name: v.name,
          value: v.value,
          stock: v.stock,
          price: v.price,
        })),
      });
    }

    return NextResponse.json({ success: true, product: { id: duplicate.id, productId: duplicate.productId, name: duplicate.name } });
  } catch (error) {
    console.error("[POST /api/sellers/products/duplicate] Error:", error);
    return NextResponse.json({ error: "Failed to duplicate product" }, { status: 500 });
  }
}
