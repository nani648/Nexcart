import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params;

    // Get the current product to find its category
    const currentProduct = await db.product.findUnique({
      where: { productId },
      select: {
        categoryId: true,
        id: true,
      },
    });

    if (!currentProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (!currentProduct.categoryId) {
      return NextResponse.json({ products: [] });
    }

    // Get products from same category, sorted by order count (most popular)
    const relatedProducts = await db.product.findMany({
      where: {
        categoryId: currentProduct.categoryId,
        id: { not: currentProduct.id },
        isActive: true,
      },
      select: {
        id: true,
        productId: true,
        name: true,
        price: true,
        comparePrice: true,
        images: true,
        rating: true,
        reviewCount: true,
        salesCount: true,
        seller: {
          select: {
            storeName: true,
            isVerified: true,
          },
        },
      },
      orderBy: { salesCount: "desc" },
      take: 8,
    });

    return NextResponse.json({ products: relatedProducts }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Customers also bought error:", error);
    return NextResponse.json(
      { error: "Failed to fetch related products" },
      { status: 500 }
    );
  }
}
