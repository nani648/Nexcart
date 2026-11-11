import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids")?.split(",") || [];

    if (ids.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // Fetch products in the order provided
    const products = await db.product.findMany({
      where: {
        productId: { in: ids },
        isActive: true,
      },
      select: {
        id: true,
        productId: true,
        name: true,
        price: true,
        images: true,
        rating: true,
        reviewCount: true,
      },
      take: 10,
    });

    // Sort by the order of IDs provided
    const sortedProducts = ids
      .map((id) => products.find((p) => p.productId === id))
      .filter(Boolean);

    return NextResponse.json({ products: sortedProducts });
  } catch (error) {
    console.error("Recently viewed fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
