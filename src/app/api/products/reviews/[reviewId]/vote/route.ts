import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface Params {
  params: { reviewId: string };
}

// POST /api/products/reviews/[reviewId]/vote
// Body: { isHelpful: boolean }
// Toggles the vote — if same vote exists it is removed (un-vote)
export async function POST(req: NextRequest, { params }: Params) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // The user and the review are independent lookups — run them concurrently.
  const [user, review] = await Promise.all([
    db.user.findUnique({ where: { firebaseUid: uid }, select: { id: true } }),
    db.review.findUnique({ where: { id: params.reviewId }, select: { userId: true } }),
  ]);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  // A user cannot vote on their own review
  if (review.userId === user.id) {
    return NextResponse.json({ error: "Cannot vote on your own review" }, { status: 403 });
  }

  const body = await req.json();
  const isHelpful: boolean = body.isHelpful !== false; // default true

  const existingVote = await db.reviewVote.findUnique({
    where: { reviewId_userId: { reviewId: params.reviewId, userId: user.id } },
  });

  if (existingVote) {
    if (existingVote.isHelpful === isHelpful) {
      // Same vote → remove it (toggle off)
      await db.reviewVote.delete({ where: { id: existingVote.id } });
    } else {
      // Different vote → update it
      await db.reviewVote.update({
        where: { id: existingVote.id },
        data: { isHelpful },
      });
    }
  } else {
    // No vote yet → create
    await db.reviewVote.create({
      data: { reviewId: params.reviewId, userId: user.id, isHelpful },
    });
  }

  // Recalculate helpfulCount (only count isHelpful === true)
  const helpfulCount = await db.reviewVote.count({
    where: { reviewId: params.reviewId, isHelpful: true },
  });

  const updated = await db.review.update({
    where: { id: params.reviewId },
    data: { helpfulCount },
    include: {
      user: { select: { name: true, avatar: true } },
      votes: { where: { userId: user.id }, select: { isHelpful: true } },
    },
  });

  return NextResponse.json(updated);
}
