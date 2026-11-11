import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET — fetch user's wishlist
export async function GET(req: NextRequest) {
  const userId = await getVerifiedUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Single round-trip: resolve the wishlist through the user relation instead
  // of fetching the User row first and then querying by its id.
  const wishlist = await db.wishlist.findFirst({
    where: { user: { firebaseUid: userId } },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              productId: true,
              name: true,
              price: true,
              comparePrice: true,
              images: true,
              stock: true,
              isActive: true,
              seller: { select: { sellerId: true, storeName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json(wishlist?.items ?? []);
}

// POST — add product to wishlist
export async function POST(req: NextRequest) {
  const userId = await getVerifiedUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  // Resolve the user and the product in parallel — independent lookups.
  const [user, product] = await Promise.all([
    db.user.findUnique({ where: { firebaseUid: userId }, select: { id: true } }),
    db.product.findFirst({
      where: { OR: [{ id: productId }, { productId }], isActive: true },
    }),
  ]);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const wishlist = await db.wishlist.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  // Add item (ignore if already exists)
  try {
    await db.wishlistItem.create({
      data: { wishlistId: wishlist.id, productId: product.id },
    });
  } catch {
    // Unique constraint violation = already exists, that's fine
  }

  return NextResponse.json({ success: true });
}

// DELETE — remove product from wishlist
export async function DELETE(req: NextRequest) {
  const userId = await getVerifiedUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const product = await db.product.findFirst({
    where: { OR: [{ id: productId }, { productId }] },
    select: { id: true },
  });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Ownership is enforced by the nested `wishlist.user` filter, so the separate
  // user and wishlist lookups are no longer needed (4 queries -> 2).
  await db.wishlistItem.deleteMany({
    where: {
      productId: product.id,
      wishlist: { user: { firebaseUid: userId } },
    },
  });

  return NextResponse.json({ success: true });
}
