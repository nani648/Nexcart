import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface Ctx { params: { sellerId: string } }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sf = (db as any).storeFollow;

// GET /api/sellers/[sellerId]/follow — returns follow status + count
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const firebaseUid = await getVerifiedUid(req);

    const seller = await db.seller.findUnique({
      where: { sellerId: params.sellerId },
      select: { id: true },
    });
    if (!seller) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Resolve the follow record through the `user` relation so we don't need a
    // separate User lookup chained before it.
    const [followerCount, followRecord] = await Promise.all([
      sf.count({ where: { sellerId: seller.id } }),
      firebaseUid
        ? sf.findFirst({ where: { sellerId: seller.id, user: { firebaseUid } } })
        : Promise.resolve(null),
    ]);

    return NextResponse.json(
      { followed: !!followRecord, followerCount },
      { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/sellers/[sellerId]/follow — toggle follow/unfollow
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // The user and the seller are independent lookups, so run them concurrently.
    // The seller's own firebaseUid is pulled in via the nested `user` select,
    // which removes the third round-trip that previously fetched it separately.
    const [user, seller] = await Promise.all([
      db.user.findUnique({
        where: { firebaseUid },
        select: { id: true, name: true },
      }),
      db.seller.findUnique({
        where: { sellerId: params.sellerId },
        select: {
          id: true,
          storeName: true,
          userId: true,
          user: { select: { firebaseUid: true } },
        },
      }),
    ]);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

    // Can't follow your own store
    if (seller.user?.firebaseUid === firebaseUid) {
      return NextResponse.json({ error: "Cannot follow your own store" }, { status: 400 });
    }

    const existing = await sf.findUnique({
      where: { userId_sellerId: { userId: user.id, sellerId: seller.id } },
    });

    if (existing) {
      await sf.delete({ where: { userId_sellerId: { userId: user.id, sellerId: seller.id } } });
      const followerCount: number = await sf.count({ where: { sellerId: seller.id } });
      return NextResponse.json({ followed: false, followerCount });
    } else {
      await sf.create({ data: { userId: user.id, sellerId: seller.id } });

      // Notify the seller (DB notification)
      await db.notification.create({
        data: {
          userId: seller.userId,
          type: "STORE_FOLLOW",
          title: "New Follower!",
          body: `${user.name ?? "Someone"} started following your store.`,
          link: `/dashboard`,
        },
      });

      // Send real push notification to seller (fire-and-forget)
      import("@/lib/fcm").then(({ sendPushToUsers }) =>
        sendPushToUsers([seller.userId], {
          title: "New Follower!",
          body: `${user.name ?? "Someone"} started following your store.`,
          url: "/dashboard",
        })
      ).catch(() => {});

      const followerCount: number = await sf.count({ where: { sellerId: seller.id } });
      return NextResponse.json({ followed: true, followerCount });
    }
  } catch (err) {
    console.error("[POST /api/sellers/[sellerId]/follow]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
