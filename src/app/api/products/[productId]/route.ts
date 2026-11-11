import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productSchema } from "@/lib/validations";
import { sendLowStockAlertEmail } from "@/lib/email";
import { stripHtml } from "@/lib/sanitize";
import { getOrSet, bustCache, CACHE_KEYS } from "@/lib/cache";
import { normalizeDesignForStorage, normalizeFontForStorage } from "@/lib/card-designs";
import { revalidateTag } from "next/cache";

interface Params { params: { productId: string } }

export async function GET(req: NextRequest, { params }: Params) {
  // Optionally identify the caller so we can attach their own vote to each review.
  // Authenticated requests bypass Redis cache (personalised data).
  const uid = await getVerifiedUid(req);
  const viewer = uid
    ? await db.user.findUnique({ where: { firebaseUid: uid }, select: { id: true } })
    : null;

  const fetchProduct = () =>
    db.product.findFirst({
      where: {
        OR: [
          { productId: params.productId },
          { id: params.productId },
        ],
      },
      include: {
        seller: { select: { sellerId: true, storeName: true, logo: true, status: true } },
        category: true,
        variants: true,
        reviews: {
          include: {
            user: { select: { name: true, avatar: true } },
            votes: viewer
              ? { where: { userId: viewer.id }, select: { isHelpful: true } }
              : false,
          },
          orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
          take: 20,
        },
        _count: { select: { reviews: true } },
      },
    });

  // Cache anonymous requests for 5 minutes; personalised (viewer votes) skip cache
  const product = viewer
    ? await fetchProduct()
    : await getOrSet(CACHE_KEYS.product(params.productId), fetchProduct, 300);

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(product, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getVerifiedUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Independent lookups — run concurrently rather than back-to-back.
  const [user, product] = await Promise.all([
    db.user.findUnique({
      where: { firebaseUid: userId },
      include: { seller: true },
    }),
    db.product.findFirst({
      where: { OR: [{ productId: params.productId }, { id: params.productId }] },
    }),
  ]);

  if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (product.sellerId !== user.seller.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  // Extract extra fields not in productSchema before validation
  const { variantImages, specifications, cardDesign, cardFont, ...rest } = body;
  const parsed = productSchema.partial().safeParse(rest);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (typeof parsed.data.name === "string") parsed.data.name = stripHtml(parsed.data.name);
  if (typeof parsed.data.description === "string") parsed.data.description = stripHtml(parsed.data.description);

  const extraData: Record<string, unknown> = {};
  if (variantImages && typeof variantImages === "object") extraData.variantImages = variantImages;
  if (specifications && typeof specifications === "object") extraData.specifications = specifications;
  // Same write-time resolution as product creation — "random" is resolved to
  // a concrete key here, never at render, so the card stays stable on refresh.
  if (cardDesign !== undefined) extraData.cardDesign = normalizeDesignForStorage(cardDesign);
  if (cardFont !== undefined) extraData.cardFont = normalizeFontForStorage(cardFont);

  const updated = await db.product.update({ where: { id: product.id }, data: { ...parsed.data, ...extraData } });

  // Bust Redis cache so next GET serves fresh data
  void bustCache(CACHE_KEYS.product(params.productId), CACHE_KEYS.product(product.id));
  // Bust Next's page-level caches too — without this, an edited product keeps
  // showing its old price/stock/name on the seller's storefront (getSeller,
  // tag "sellers"), the product detail page (tag "products"), and the
  // homepage (tag "homepage", 1hr revalidate) until those windows expire.
  revalidateTag("products");
  revalidateTag("sellers");
  revalidateTag("homepage");

  // ── Inventory alert: if stock just dropped below 10, email the seller ──────
  if (
    typeof parsed.data.stock === "number" &&
    parsed.data.stock < 10 &&
    product.stock >= 10
  ) {
    try {
      await sendLowStockAlertEmail({
        sellerEmail: user.email,
        sellerName: user.name ?? user.seller.storeName,
        storeName: user.seller.storeName,
        products: [{ name: updated.name, stock: updated.stock }],
      });
    } catch {
      console.error("[product PATCH] Failed to send low-stock alert");
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const userId = await getVerifiedUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Independent lookups — run concurrently rather than back-to-back.
  const [user, product] = await Promise.all([
    db.user.findUnique({
      where: { firebaseUid: userId },
      include: { seller: true },
    }),
    db.product.findFirst({ where: { OR: [{ productId: params.productId }, { id: params.productId }] } }),
  ]);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = user?.seller?.id === product.sellerId;
  const isAdmin = (user as { role?: string })?.role === "ADMIN";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.product.update({ where: { id: product.id }, data: { isActive: false } });
  void bustCache(CACHE_KEYS.product(params.productId), CACHE_KEYS.product(product.id));
  revalidateTag("products");
  revalidateTag("sellers");
  revalidateTag("homepage");
  return NextResponse.json({ success: true });
}
