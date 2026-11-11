import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { Prisma } from "@prisma/client";

// Called client-side after Firebase sign-in to sync user to Prisma DB
export async function POST(req: NextRequest) {
  try {
    // Rate limit — defense in depth even though this requires a verified token
    const limited = await rateLimit(req, RATE_LIMITS.auth);
    if (limited) return limited;

    // Verify the caller owns the UID they are syncing:
    // client must send Authorization: Bearer <firebaseUid>
    const tokenUid = await getVerifiedUid(req);
    if (!tokenUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { firebaseUid, email, name, avatar, phone } = await req.json();

    if (!firebaseUid || !email) {
      return NextResponse.json({ error: "firebaseUid and email required" }, { status: 400 });
    }

    // Reject if the token UID doesn't match the UID being synced
    if (tokenUid !== firebaseUid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const upsertPayload = (includePhone: boolean) => ({
      where: { firebaseUid },
      create: {
        firebaseUid,
        email,
        name: name ?? null,
        avatar: avatar ?? null,
        phone: includePhone ? phone ?? null : null,
      },
      update: {
        email,
        name: name ?? undefined,
        avatar: avatar ?? undefined,
        // Only update phone if a value is provided — don't overwrite existing
        ...(includePhone && phone ? { phone } : {}),
      },
    });

    let user;
    try {
      user = await db.user.upsert(upsertPayload(true));
    } catch (err) {
      // phone is unique at the DB level (see prisma/schema.prisma). This is
      // the sign-in path — it must never fail just because the phone number
      // Firebase handed us collides with a different account. Retry once
      // without touching phone so login still succeeds; the user can sort
      // out the phone number later from their profile settings.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        console.warn(`[auth/sync] phone collision for uid=${firebaseUid}, syncing without phone`);
        user = await db.user.upsert(upsertPayload(false));
      } else {
        throw err;
      }
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Auth sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
