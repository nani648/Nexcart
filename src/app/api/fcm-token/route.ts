import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fcmDb = db as any;

// POST /api/fcm-token — save or update FCM push token for the authenticated user
export async function POST(req: NextRequest) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { token } = body as { token?: string };
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { firebaseUid },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Upsert: if token exists (maybe from another user on same device), reassign it
    await fcmDb.fcmToken.upsert({
      where: { token },
      update: { userId: user.id },
      create: { userId: user.id, token },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/fcm-token]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/fcm-token — remove FCM token on logout
export async function DELETE(req: NextRequest) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { token } = body as { token?: string };
    if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

    // Only the token's owner can remove it.
    await fcmDb.fcmToken
      .deleteMany({ where: { token, user: { firebaseUid } } })
      .catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/fcm-token]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
