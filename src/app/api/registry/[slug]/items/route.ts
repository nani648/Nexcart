import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Resolve the registry and verify ownership in one query via the `user`
  // relation filter, instead of a separate User lookup first (2 -> 1).
  const registry = await db.giftRegistry.findFirst({
    where: { slug: params.slug, user: { firebaseUid: uid } },
    select: { id: true },
  });
  if (!registry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, image, price, productSlug, quantity, note, priority } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const item = await db.giftRegistryItem.create({
    data: {
      registryId: registry.id,
      name: name.trim(),
      image: image || null,
      price: Number(price) || 0,
      productSlug: productSlug || "",
      quantity: Number(quantity) || 1,
      note: note?.trim() || null,
      priority: priority || "MEDIUM",
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
