import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Minimal select — only what the account page renders
  const user = await db.user.findUnique({
    where: { firebaseUid },
    select: {
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { orders: true, reviews: true, addresses: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}
