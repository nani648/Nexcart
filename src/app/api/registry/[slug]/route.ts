import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const registry = await db.giftRegistry.findUnique({
    where: { slug: params.slug },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      user: { select: { name: true } },
    },
  });
  if (!registry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ registry });
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ownership is enforced by the nested `user` filter in the same statement that
  // deletes, so the separate User and registry lookups are unnecessary (3 -> 1).
  const result = await db.giftRegistry.deleteMany({
    where: { slug: params.slug, user: { firebaseUid: uid } },
  });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
