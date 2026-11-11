import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripHtml } from "@/lib/sanitize";

interface Params { params: { productId: string } }

// GET /api/products/[productId]/qa
// Returns all published Q&As for a product, newest first
export async function GET(_req: NextRequest, { params }: Params) {
  const product = await db.product.findUnique({
    where: { productId: params.productId },
    select: { id: true },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const qas = await db.productQA.findMany({
    where: { productId: product.id, isPublished: true },
    include: {
      user: { select: { name: true, avatar: true } },
      seller: { select: { sellerId: true, storeName: true, logo: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(qas);
}

// POST /api/products/[productId]/qa
// Body: { question: string }
// Any authenticated user can ask a question
export async function POST(req: NextRequest, { params }: Params) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Independent lookups — run them concurrently instead of back-to-back.
  const [user, product] = await Promise.all([
    db.user.findUnique({ where: { firebaseUid: uid }, select: { id: true } }),
    db.product.findUnique({ where: { productId: params.productId }, select: { id: true } }),
  ]);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const body = await req.json();
  const question: string | undefined = body.question;

  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "question must be a non-empty string" }, { status: 400 });
  }
  if (question.trim().length > 1000) {
    return NextResponse.json({ error: "question cannot exceed 1000 characters" }, { status: 400 });
  }

  const cleanQuestion = stripHtml(question.trim(), 1000);
  if (!cleanQuestion) {
    return NextResponse.json({ error: "question must be a non-empty string" }, { status: 400 });
  }

  const qa = await db.productQA.create({
    data: {
      productId: product.id,
      userId: user.id,
      question: cleanQuestion,
    },
    include: {
      user: { select: { name: true, avatar: true } },
    },
  });

  return NextResponse.json(qa, { status: 201 });
}
