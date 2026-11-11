import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

interface Params { params: { productId: string; qaId: string } }

// PATCH /api/products/[productId]/qa/[qaId]
// Body: { answer: string }
// Only the seller who owns the product may answer; notifies the asker on success
export async function PATCH(req: NextRequest, { params }: Params) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid: uid },
    include: { seller: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  // Verify the product belongs to this seller
  const product = await db.product.findUnique({ where: { productId: params.productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  if (product.sellerId !== user.seller.id) {
    return NextResponse.json(
      { error: "Forbidden: you do not own this product" },
      { status: 403 }
    );
  }

  // Verify the Q&A belongs to this product
  const qa = await db.productQA.findUnique({ where: { id: params.qaId } });
  if (!qa) return NextResponse.json({ error: "Q&A not found" }, { status: 404 });

  if (qa.productId !== product.id) {
    return NextResponse.json({ error: "Q&A does not belong to this product" }, { status: 404 });
  }

  const body = await req.json();
  const answer: string | undefined = body.answer;

  if (typeof answer !== "string" || answer.trim().length === 0) {
    return NextResponse.json({ error: "answer must be a non-empty string" }, { status: 400 });
  }
  if (answer.trim().length > 2000) {
    return NextResponse.json({ error: "answer cannot exceed 2000 characters" }, { status: 400 });
  }

  const updated = await db.productQA.update({
    where: { id: params.qaId },
    data: {
      answer: answer.trim(),
      answeredBy: user.seller.id,
      answeredAt: new Date(),
    },
    include: {
      user: { select: { name: true, avatar: true } },
      seller: { select: { sellerId: true, storeName: true, logo: true } },
    },
  });

  // Notify the asker that their question has been answered
  createNotification({
    userId: qa.userId,
    type: "NEW_REVIEW" as const,
    title: "Your question has been answered",
    body: `${user.seller.storeName} answered your question on "${product.name}"`,
    link: `/products/${product.productId}#qa`,
  });

  return NextResponse.json(updated);
}

// DELETE /api/products/[productId]/qa/[qaId]
// Allows the product's seller to hide (unpublish) a Q&A
export async function DELETE(req: NextRequest, { params }: Params) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid: uid },
    include: { seller: true },
  });
  if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const product = await db.product.findUnique({ where: { productId: params.productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  if (product.sellerId !== user.seller.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const qa = await db.productQA.findUnique({ where: { id: params.qaId } });
  if (!qa || qa.productId !== product.id) {
    return NextResponse.json({ error: "Q&A not found" }, { status: 404 });
  }

  const updated = await db.productQA.update({
    where: { id: params.qaId },
    data: { isPublished: false },
  });

  return NextResponse.json(updated);
}
