import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: { slug: string; itemId: string } }) {
  const uid = await getVerifiedUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ownership is enforced by the nested registry -> user filter in the delete
  // itself, removing the User and registry lookups (3 queries -> 1).
  await db.giftRegistryItem.deleteMany({
    where: {
      id: params.itemId,
      registry: { slug: params.slug, user: { firebaseUid: uid } },
    },
  });
  return NextResponse.json({ success: true });
}

// Anyone (gift giver) can mark an item as being purchased
export async function PATCH(_req: NextRequest, { params }: { params: { slug: string; itemId: string } }) {
  // The registry is resolved through the nested relation filter rather than a
  // separate lookup (3 queries -> 2).
  const item = await db.giftRegistryItem.findFirst({
    where: { id: params.itemId, registry: { slug: params.slug } },
    select: { id: true, quantity: true },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  // Conditional update guards against two gift-givers clicking "mark as
  // purchased" at the same time: only one increment can match `purchased <
  // quantity`, so the second concurrent request affects 0 rows instead of
  // both passing a separate read-then-write check. Same pattern as the
  // stock-decrement guard in api/orders.
  const result = await db.giftRegistryItem.updateMany({
    where: { id: item.id, purchased: { lt: item.quantity } },
    data: { purchased: { increment: 1 } },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Already fully purchased" }, { status: 400 });
  }

  const updated = await db.giftRegistryItem.findUnique({ where: { id: item.id } });
  return NextResponse.json({ item: updated });
}
