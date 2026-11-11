import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { stripHtml } from "@/lib/sanitize";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { getOrSet, cacheKey, CACHE_KEYS } from "@/lib/cache";
import { normalizeDesignForStorage, normalizeFontForStorage } from "@/lib/card-designs";

// ─── Collision-proof productId generator ────────────────────────────────────
// Uses timestamp + random suffix so it NEVER collides, even when products are
// deleted and the count drops below the last-used index.
function generateUniqueProductId(sellerId: string): string {
  const ts = Date.now().toString(36).toUpperCase(); // base-36 timestamp
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase(); // 4 random chars
  return `${sellerId}-P${ts}${rand}`;
}

// ─── GET /api/products ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20") || 20, 1), 100);
    const category = searchParams.get("category");
    const sellerId = searchParams.get("sellerId");
    const featured = searchParams.get("featured") === "true";
    const sort = searchParams.get("sort") || "newest";
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    const where: Record<string, unknown> = { isActive: true };
    if (category) where.category = { slug: category };
    if (sellerId) where.seller = { sellerId };
    if (featured) where.isFeatured = true;
    if (minPrice || maxPrice) {
      where.price = {
        ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
        ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}),
      };
    }

    const orderBy: Record<string, string> =
      sort === "price_asc"
        ? { price: "asc" }
        : sort === "price_desc"
        ? { price: "desc" }
        : sort === "rating"
        ? { rating: "desc" }
        : sort === "popular"
        ? { salesCount: "desc" }
        : { createdAt: "desc" };

    // Build a deterministic Redis key from all filter params
    const redisKey = CACHE_KEYS.products(
      cacheKey("", { page, limit, category: category || "", sellerId: sellerId || "", featured, sort, minPrice: minPrice || "", maxPrice: maxPrice || "" })
    );

    const data = await getOrSet(
      redisKey,
      async () => {
        const [fetchedProducts, total] = await Promise.all([
          db.product.findMany({
            where,
            include: {
              seller: { select: { sellerId: true, storeName: true } },
              category: { select: { name: true, slug: true } },
              variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
            },
            orderBy,
            take: limit,
            skip: (page - 1) * limit,
          }),
          db.product.count({ where }),
        ]);
        return { products: fetchedProducts, total, pages: Math.ceil(total / limit), page };
      },
      60 // 60s — listing pages can be slightly stale
    );

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("[GET /api/products] Error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// ─── POST /api/products ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // 0. Rate limit (defense against scripted bulk product creation)
    const limited = await rateLimit(req, RATE_LIMITS.productCreate);
    if (limited) return limited;

    // 1. Auth
    const userId = await getVerifiedUid(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Load seller
    const user = await db.user.findUnique({
      where: { firebaseUid: userId },
      include: { seller: true },
    });
    if (!user?.seller) {
      return NextResponse.json({ error: "Not a seller" }, { status: 403 });
    }
    if (user.seller.status === "SUSPENDED" || user.seller.status === "REJECTED") {
      return NextResponse.json(
        { error: "Your seller account has been suspended or rejected" },
        { status: 403 }
      );
    }

    // 3. Parse request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    // 4. Destructure extra fields not in the Zod schema
    const {
      categorySlug,
      productTypeId,
      specifications,
      cardDesign,
      cardFont,
      featureBullets,
      inTheBox,
      warranty,
      warrantyType,
      brand,
      modelNumber,
      countryOfOrigin,
      searchKeywords,
      ...rest
    } = body;

    // 5. Default condition to ORIGINAL if not supplied
    if (!rest.condition) rest.condition = "ORIGINAL";

    // 6b. Resolve the storefront card design.
    // If the seller chose "random", the concrete key is picked HERE and stored,
    // so the product keeps that look permanently. Choosing at render time
    // instead would desync server and client markup (hydration mismatch) and
    // make cards change on every refresh.
    const resolvedCardDesign = normalizeDesignForStorage(cardDesign);
    const resolvedCardFont = normalizeFontForStorage(cardFont);

    // 6. Validate core product fields
    const parsed = productSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    parsed.data.name = stripHtml(parsed.data.name);
    parsed.data.description = stripHtml(parsed.data.description);

    // 7. Resolve category
    let categoryId: string | undefined;
    if (categorySlug && typeof categorySlug === "string") {
      const cat = await db.category.findUnique({ where: { slug: categorySlug } });
      if (cat) categoryId = cat.id;
    }

    // 8. Build merged specifications
    const mergedSpecifications = {
      ...(specifications && typeof specifications === "object"
        ? (specifications as Record<string, unknown>)
        : {}),
      ...(brand ? { _brand: brand } : {}),
      ...(modelNumber ? { _modelNumber: modelNumber } : {}),
      ...(countryOfOrigin ? { _countryOfOrigin: countryOfOrigin } : {}),
      ...(warranty ? { _warranty: warranty } : {}),
      ...(warrantyType ? { _warrantyType: warrantyType } : {}),
      ...(Array.isArray(featureBullets) && featureBullets.length
        ? { _featureBullets: featureBullets }
        : {}),
      ...(Array.isArray(inTheBox) && inTheBox.length ? { _inTheBox: inTheBox } : {}),
      ...(Array.isArray(searchKeywords) && searchKeywords.length
        ? { _searchKeywords: searchKeywords }
        : {}),
    };

    // 9. Create product with collision-proof productId (retry up to 5 times)
    type CreatedProduct = { id: string; name: string; productId: string; images: string[]; [key: string]: unknown };
    let product: CreatedProduct | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const productId = generateUniqueProductId(user.seller.sellerId);
      try {
        product = await db.product.create({
          data: {
            ...parsed.data,
            productId,
            sellerId: user.seller.id,
            ...(categoryId ? { categoryId } : {}),
            ...(productTypeId && typeof productTypeId === "string"
              ? { productTypeId }
              : {}),
            cardDesign: resolvedCardDesign,
            cardFont: resolvedCardFont,
            specifications: mergedSpecifications,
          },
        });
        break; // success — exit retry loop
      } catch (err: unknown) {
        lastError = err;
        // Only retry on unique constraint violation for productId
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Unique constraint") && msg.includes("productId")) {
          console.warn(`[POST /api/products] productId collision on attempt ${attempt + 1}, retrying…`);
          continue;
        }
        // Any other DB error — throw immediately
        throw err;
      }
    }

    if (!product) {
      console.error("[POST /api/products] Failed after 5 attempts:", lastError);
      return NextResponse.json(
        { error: "Could not generate a unique product ID. Please try again." },
        { status: 500 }
      );
    }

    // Notify all followers of this seller about the new product (fire-and-forget)
    const createdProduct = product;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const followers = await (db as any).storeFollow.findMany({
        where: { sellerId: user.seller.id },
        select: { userId: true },
      }) as { userId: string }[];
      if (followers.length > 0) {
        const followerUserIds = followers.map((f) => f.userId);
        const productUrl = `/product/${createdProduct.productId}`;
        const productImage = (createdProduct.images as string[])[0] ?? undefined;

        // Save DB notifications
        await db.notification.createMany({
          data: followerUserIds.map((uid) => ({
            userId: uid,
            type: "NEW_PRODUCT" as const,
            title: `New at ${user.seller!.storeName}`,
            body: `"${createdProduct.name}" is now available. Check it out!`,
            link: productUrl,
            imageUrl: productImage ?? null,
          })),
        });

        // Send real push notifications (fire-and-forget)
        import("@/lib/fcm").then(({ sendPushToUsers }) =>
          sendPushToUsers(followerUserIds, {
            title: `New at ${user.seller!.storeName}`,
            body: `"${createdProduct.name}" is now available!`,
            url: productUrl,
            imageUrl: productImage,
          })
        ).catch(() => {});
      }
    } catch (notifErr) {
      console.error("[POST /api/products] Notification dispatch failed:", notifErr);
    }

    // Bust homepage + category caches so new product appears immediately
    revalidateTag("homepage");
    revalidateTag("products");
    revalidateTag("categories");

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products] Error:", error);
    // Never return the raw error message to the client — it can leak
    // internal details (Prisma constraint text, column names, stack info).
    // The real message is already logged above for debugging.
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
