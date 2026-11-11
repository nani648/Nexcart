import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviewSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";
import { stripHtml } from "@/lib/sanitize";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";

// Post a review
export async function POST(req: NextRequest) {
  // 8 review submissions per hour per IP — review text/photos are public,
  // user-generated content, and this endpoint had no throttling at all.
  const limited = await rateLimit(req, RATE_LIMITS.reviews);
  if (limited) return limited;

  const userId = await getVerifiedUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { productId, ...reviewData } = body;

  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const parsed = reviewSchema.safeParse(reviewData);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Strip HTML from text fields before saving
  const sanitizedData = {
    ...parsed.data,
    title: parsed.data.title ? stripHtml(parsed.data.title, 200) : undefined,
    body:  parsed.data.body  ? stripHtml(parsed.data.body,  3000) : undefined,
  };

  // The user, the product and the purchase check are all independent lookups,
  // so they run concurrently. The product query also pulls the seller's userId
  // via the relation, removing the separate seller lookup further down.
  const [user, product, hasPurchased] = await Promise.all([
    db.user.findUnique({ where: { firebaseUid: userId }, select: { id: true, name: true } }),
    db.product.findUnique({
      where: { productId },
      select: {
        id: true,
        name: true,
        productId: true,
        seller: { select: { userId: true } },
      },
    }),
    db.orderItem.findFirst({
      where: {
        order: { user: { firebaseUid: userId }, status: { in: ["DELIVERED", "CONFIRMED"] } },
        product: { productId },
      },
      select: { id: true },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  if (!hasPurchased) {
    return NextResponse.json(
      { error: "You can only review products you have purchased" },
      { status: 403 }
    );
  }

  // Upsert review (one per user per product)
  const review = await db.review.upsert({
    where: { productId_userId: { productId: product.id, userId: user.id } },
    create: { productId: product.id, userId: user.id, ...sanitizedData },
    update: sanitizedData,
    include: { user: { select: { name: true, avatar: true } } },
  });

  // Recalculate product rating
  const stats = await db.review.aggregate({
    where: { productId: product.id },
    _avg: { rating: true },
    _count: true,
  });

  await db.product.update({
    where: { id: product.id },
    data: {
      rating: stats._avg.rating || 0,
      reviewCount: stats._count,
    },
  });

  // Create NEW_REVIEW notification for seller — the seller's userId already
  // came back with the product query above, so no extra lookup is needed.
  if (product.seller) {
    createNotification({
      userId: product.seller.userId,
      type: "NEW_REVIEW",
      title: "New Review on Your Product",
      body: `${user.name || "A customer"} left a ${parsed.data.rating}-star review on "${product.name}"`,
      link: `/seller/products/${product.productId}/reviews`,
    });
  }

  return NextResponse.json(review, { status: 201 });
}

// Get reviews for a product
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const page = parseInt(searchParams.get("page") || "1");

  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const product = await db.product.findUnique({
    where: { productId },
    select: { id: true },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where: { productId: product.id },
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
      skip: (page - 1) * 10,
    }),
    db.review.count({ where: { productId: product.id } }),
  ]);

  return NextResponse.json({ reviews, total });
}
