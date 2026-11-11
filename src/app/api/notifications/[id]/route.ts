import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getVerifiedUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Ownership is checked inside the lookup via the `user` relation filter,
    // removing the separate User query (3 queries -> 2). A notification that
    // belongs to someone else is reported as not-found rather than forbidden,
    // which also avoids leaking that the id exists.
    const notification = await db.notification.findFirst({
      where: { id: params.id, user: { firebaseUid: userId } },
      select: { id: true },
    });
    if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

    const updated = await db.notification.update({
      where: { id: params.id },
      data: { isRead: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[notifications] PATCH [id] error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
