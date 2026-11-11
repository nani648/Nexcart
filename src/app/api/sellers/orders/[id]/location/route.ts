import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  estimatedArrival: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid },
    include: { seller: true },
  });
  if (!user?.seller)
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const order = await db.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!order)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const isSellersOrder = order.items.some(
    (item) => item.sellerId === user.seller!.id
  );
  if (!isSellersOrder)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { latitude, longitude, estimatedArrival } = parsed.data;

  const updated = await db.order.update({
    where: { id: params.id },
    data: {
      sellerLatitude: latitude,
      sellerLongitude: longitude,
      ...(estimatedArrival && { estimatedArrival: new Date(estimatedArrival) }),
    },
  });

  return NextResponse.json({ success: true, order: updated });
}
