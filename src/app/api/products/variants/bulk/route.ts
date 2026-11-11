import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

// ─── Validation Schema ──────────────────────────────────────────────────────────

const bulkVariantSchema = z.object({
  productId: z.string().min(1, "Product ID required"),
  variants: z.array(
    z.object({
      combo: z.record(z.string().min(1), z.string().min(1)),
      price: z.number().positive().nullable().optional(),
      comparePrice: z.number().positive().nullable().optional(),
      stock: z.number().int().min(0),
    })
  )
    .min(1, "At least 1 variant required")
    .max(1000, "Maximum 1000 variants per request"),
  deleteExisting: z.boolean().optional().default(false), // Whether to delete old variants
});

type BulkVariantPayload = z.infer<typeof bulkVariantSchema>;

// ─── POST: Create bulk variants ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Authentication ──────────────────────────────────────────────────────
    const userId = await getVerifiedUid(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ── Verify seller ───────────────────────────────────────────────────────
    const user = await db.user.findUnique({
      where: { firebaseUid: userId },
      include: { seller: true },
    });

    if (!user?.seller) {
      return NextResponse.json(
        { error: "Only sellers can create variants" },
        { status: 403 }
      );
    }

    // ── Parse request body ──────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // ── Validate schema ─────────────────────────────────────────────────────
    const validation = bulkVariantSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // ── Verify product ownership ────────────────────────────────────────────
    const product = await db.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (product.sellerId !== user.seller.id) {
      return NextResponse.json(
        { error: "You don't have permission to modify this product" },
        { status: 403 }
      );
    }

    // ── Delete existing variants if requested ───────────────────────────────
    if (data.deleteExisting) {
      await db.productVariant.deleteMany({
        where: { productId: data.productId },
      });
    }

    // ── Prepare variants for batch creation ──────────────────────────────────
    const variantsToCreate = data.variants.map((variant) => {
      // Create unique name from combo: "S-Black", "M-White", etc.
      const name = Object.values(variant.combo).join("-");

      return {
        productId: data.productId,
        name,
        value: JSON.stringify(variant.combo), // Store combo as JSON string
        price: variant.price ?? null,
        comparePrice: variant.comparePrice ?? null,
        stock: variant.stock,
      };
    });

    // ── Bulk create variants ────────────────────────────────────────────────
    const result = await db.productVariant.createMany({
      data: variantsToCreate,
      skipDuplicates: true, // Skip if name already exists
    });

    // ── Success response ────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        count: result.count,
        message: `Successfully created ${result.count} variant${result.count !== 1 ? "s" : ""}`,
        productId: data.productId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/products/variants/bulk] Error:", error);

    return NextResponse.json(
      { error: "Failed to create variants" },
      { status: 500 }
    );
  }
}

// ─── GET: Retrieve variants for a product ──────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 }
      );
    }

    const variants = await db.productVariant.findMany({
      where: { productId },
      select: {
        id: true,
        name: true,
        value: true,
        price: true,
        comparePrice: true,
        stock: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: variants.length,
      variants,
    });
  } catch (error) {
    console.error("[GET /api/products/variants/bulk] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch variants" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete all variants for a product ─────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getVerifiedUid(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 }
      );
    }

    // Verify seller ownership
    const user = await db.user.findUnique({
      where: { firebaseUid: userId },
      include: { seller: true },
    });

    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.sellerId !== user?.seller?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete all variants
    const result = await db.productVariant.deleteMany({
      where: { productId },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Deleted ${result.count} variant${result.count !== 1 ? "s" : ""}`,
    });
  } catch (error) {
    console.error("[DELETE /api/products/variants/bulk] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete variants" },
      { status: 500 }
    );
  }
}
