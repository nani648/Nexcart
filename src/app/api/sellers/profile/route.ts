import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { sellerProfileSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { stripHtml } from "@/lib/sanitize";
import { bustCache, CACHE_KEYS } from "@/lib/cache";
import { setSellerHandle } from "@/lib/store-handle-db";

export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid },
    include: {
      seller: {
        include: {
          _count: { select: { products: true, orderItems: true } },
        },
      },
    },
  });

  if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 404 });

  // Build dashboard stats
  const [revenueAgg, recentOrders] = await Promise.all([
    db.orderItem.aggregate({
      where: { sellerId: user.seller.id },
      _sum: { price: true },
    }),
    db.orderItem.findMany({
      where: { sellerId: user.seller.id },
      include: {
        product: { select: { name: true, images: true } },
        order: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { order: { createdAt: "desc" } },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    storeName: user.seller.storeName,
    description: user.seller.description,
    logo: user.seller.logo,
    seller: {
      id: user.seller.id,
      sellerId: user.seller.sellerId,
      storeHandle: user.seller.storeHandle,
      storeName: user.seller.storeName,
      status: user.seller.status,
      gstin: user.seller.gstin,
      state: user.seller.state,
      isLocalStore: user.seller.isLocalStore,
      storeAddress: user.seller.storeAddress,
      pickupHours: user.seller.pickupHours,
      pickupAcceptsCOD: user.seller.pickupAcceptsCOD,
      spinWheelEnabled: user.seller.spinWheelEnabled,
      spinWheelSegments: user.seller.spinWheelSegments,
      quickTags: user.seller.quickTags,
      festivalThemeEnabled: user.seller.festivalThemeEnabled,
      shakeConfig: user.seller.shakeConfig,
      floatingBarConfig: user.seller.floatingBarConfig,
      scrollingDesign: user.seller.scrollingDesign,
      storeColor: user.seller.storeColor,
      productBgColor: user.seller.productBgColor,
      storePaused: user.seller.storePaused,
      storePausedMsg: user.seller.storePausedMsg,
    },
    dashboard: {
      products: user.seller._count.products,
      orders: user.seller._count.orderItems,
      revenue: revenueAgg._sum.price ?? 0,
      avgOrderValue: user.seller._count.orderItems > 0
        ? Math.round((revenueAgg._sum.price ?? 0) / user.seller._count.orderItems)
        : 0,
      returnRate: 0,
      recentOrders,
      topProducts: [],
    },
  },
  { headers: { "Cache-Control": "private, max-age=0, stale-while-revalidate=30" } }
  );
}

export async function PATCH(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid },
    include: { seller: true },
  });
  if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const body = await req.json();
  const parsed = sellerProfileSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Banner is admin-only — strip it even if the seller sends it
  const { banner: _banner, ...safeData } = parsed.data;

  if (typeof safeData.storeName === "string") safeData.storeName = stripHtml(safeData.storeName);
  if (typeof safeData.description === "string") safeData.description = stripHtml(safeData.description);

  // Normalize gstin: trim/uppercase if provided, or clear it (null) if blank
  let gstinUpdate: string | null | undefined;
  if (typeof safeData.gstin === "string") {
    gstinUpdate = safeData.gstin.trim() ? safeData.gstin.trim().toUpperCase() : null;
  }
  // Normalize state similarly: empty string clears it to null
  let stateUpdate: string | null | undefined;
  if (typeof safeData.state === "string") {
    stateUpdate = safeData.state.trim() ? safeData.state.trim() : null;
  }
  // storeHandle is never written directly — it goes through setSellerHandle,
  // which parks the previous handle in StoreHandleHistory inside a transaction
  // so already-shared links and printed QR codes keep redirecting. Writing it
  // via a plain update here would silently break every old link.
  const { gstin: _gstin, state: _state, storeHandle, ...restData } = safeData;

  if (typeof storeHandle === "string" && storeHandle) {
    const result = await setSellerHandle(user.seller.id, storeHandle);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  const updated = await db.seller.update({
    where: { id: user.seller.id },
    data: {
      ...restData,
      ...(gstinUpdate !== undefined && { gstin: gstinUpdate }),
      ...(stateUpdate !== undefined && { state: stateUpdate }),
    },
  });

  // Invalidate Next.js tag cache + Redis cache for this seller's public profile.
  //
  // Note on handle renames: the Redis cache is keyed by sellerId, not by handle,
  // so there is no separate old-handle key to delete. The previously-rendered
  // page at the old handle is covered by revalidateTag("sellers"), which is what
  // both storefront routes are tagged with.
  revalidateTag("sellers");
  void bustCache(CACHE_KEYS.seller(updated.sellerId));

  return NextResponse.json(updated);
}
