import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface Params {
  params: { reviewId: string };
}

// POST /api/products/reviews/[reviewId]/reply
// Body: { reply: string }
// Only the seller who owns the reviewed product may call this.
export async function POST(req: NextRequest, { params }: Params) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid: uid },
    include: { seller: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const review = await db.review.findUnique({
    where: { id: params.reviewId },
    include: { product: { select: { sellerId: true, name: true } } },
  });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  // Validate the authenticated seller owns the product being reviewed
  if (review.product.sellerId !== user.seller.id) {
    return NextResponse.json(
      { error: "Forbidden: you do not own the product for this review" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const reply: string | undefined = body.reply;

  if (typeof reply !== "string" || reply.trim().length === 0) {
    return NextResponse.json({ error: "reply must be a non-empty string" }, { status: 400 });
  }
  if (reply.trim().length > 2000) {
    return NextResponse.json({ error: "reply cannot exceed 2000 characters" }, { status: 400 });
  }

  const updated = await db.review.update({
    where: { id: params.reviewId },
    data: {
      sellerReply: reply.trim(),
      sellerRepliedAt: new Date(),
    },
    include: {
      user: { select: { name: true, avatar: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/products/reviews/[reviewId]/reply
// Allows the same seller to remove their reply
export async function DELETE(req: NextRequest, { params }: Params) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid: uid },
    include: { seller: true },
  });
  if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const review = await db.review.findUnique({
    where: { id: params.reviewId },
    include: { product: { select: { sellerId: true } } },
  });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  if (review.product.sellerId !== user.seller.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await db.review.update({
    where: { id: params.reviewId },
    data: { sellerReply: null, sellerRepliedAt: null },
  });

  return NextResponse.json(updated);
}
