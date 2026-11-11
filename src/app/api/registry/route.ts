import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

function makeSlug(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 25);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}

export async function GET(req: NextRequest) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Single round-trip via the user relation instead of a separate User lookup.
  const registries = await db.giftRegistry.findMany({
    where: { user: { firebaseUid: uid } },
    include: {
      items: { select: { id: true, name: true, image: true, price: true, productSlug: true, quantity: true, purchased: true, priority: true, note: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ registries });
}

export async function POST(req: NextRequest) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { firebaseUid: uid }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const { title, occasion, eventDate, description } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  let slug = makeSlug(title);
  for (let i = 0; i < 5; i++) {
    const existing = await db.giftRegistry.findUnique({ where: { slug } });
    if (!existing) break;
    slug = makeSlug(title);
  }

  const registry = await db.giftRegistry.create({
    data: {
      userId: user.id,
      title: title.trim(),
      occasion: occasion ?? "OTHER",
      eventDate: eventDate ? new Date(eventDate) : null,
      description: description?.trim() || null,
      slug,
    },
  });

  return NextResponse.json({ registry }, { status: 201 });
}
