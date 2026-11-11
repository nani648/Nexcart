import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Filter through the user relation so both queries can start immediately,
    // instead of waiting on a separate User lookup first.
    const owner = { user: { firebaseUid } };

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: owner,
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.notification.count({
        where: { ...owner, isRead: false },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount }, {
      headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=20" },
    });
  } catch (error) {
    console.error("[notifications] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Ownership is enforced by the nested `user` filter, so the separate User
    // lookup is unnecessary (2 queries -> 1).
    await db.notification.updateMany({
      where: { user: { firebaseUid }, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[notifications] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
