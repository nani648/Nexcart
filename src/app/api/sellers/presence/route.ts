import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyDb = db as any;

// PATCH /api/sellers/presence — seller pings to update their lastSeenAt
// Called every 2 minutes by SellerPresencePing component when seller is logged in
export async function PATCH(req: NextRequest) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ ok: false }, { status: 401 });

    const user = await db.user.findUnique({
      where: { firebaseUid },
      select: { id: true, seller: { select: { id: true } } },
    });

    // Silently do nothing if user is not a seller — no error
    if (!user?.seller) return NextResponse.json({ ok: true });

    await anyDb.seller.update({
      where: { id: user.seller.id },
      data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/sellers/presence]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
