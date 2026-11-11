import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const addItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).max(100).default(1),
});

const updateItemSchema = z.object({
  cartItemId: z.string(),
  quantity: z.number().int().min(0).max(100),
});

// GET — fetch user's DB cart
export async function GET(req: NextRequest) {
  const userId = await getVerifiedUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Single round-trip: resolve the cart through the user relation instead of
  // fetching the User row first and then querying the cart by its id.
  const cart = await db.cart.findFirst({
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
          variant: {
            select: { id: true, name: true, value: true, price: true, stock: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json(cart?.items ?? []);
}

// POST — add item to DB cart
export async function POST(req: NextRequest) {
  const userId = await getVerifiedUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Validate the body before touching the DB so a malformed request costs no queries.
  const body = await req.json();
  const parsed = addItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { productId, variantId, quantity } = parsed.data;

  // Fetch user + product + variant in parallel — none of them depend on each other.
  const [user, product, variant] = await Promise.all([
    db.user.findUnique({ where: { firebaseUid: userId }, select: { id: true } }),
    db.product.findFirst({ where: { OR: [{ id: productId }, { productId }], isActive: true } }),
    variantId ? db.productVariant.findUnique({ where: { id: variantId } }) : Promise.resolve(null),
  ]);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Stock check
  const effectiveStock = variant ? variant.stock : product.stock;
  if (effectiveStock < quantity) {
    return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
  }

  // Upsert cart
  const cart = await db.cart.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  // Check existing item
  const existing = await db.cartItem.findFirst({
    where: { cartId: cart.id, productId: product.id, variantId: variantId ?? null },
  });

  if (existing) {
    const newQty = Math.min(existing.quantity + quantity, effectiveStock);
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
  } else {
    await db.cartItem.create({
      data: { cartId: cart.id, productId: product.id, variantId: variantId ?? null, quantity },
    });
  }

  return NextResponse.json({ success: true });
}

// PATCH — update item quantity
export async function PATCH(req: NextRequest) {
  const userId = await getVerifiedUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { cartItemId, quantity } = parsed.data;

  // Single round-trip: the `cart.user.firebaseUid` filter enforces ownership in
  // the same statement that performs the write, replacing the previous
  // user -> cart -> item lookup chain (4 queries -> 1).
  const ownedItem = { id: cartItemId, cart: { user: { firebaseUid: userId } } };

  const result =
    quantity === 0
      ? await db.cartItem.deleteMany({ where: ownedItem })
      : await db.cartItem.updateMany({ where: ownedItem, data: { quantity } });

  if (result.count === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

// DELETE — remove item or clear cart
export async function DELETE(req: NextRequest) {
  const userId = await getVerifiedUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cartItemId, clearAll } = await req.json();

  // Single round-trip — ownership is enforced by the nested `cart.user` filter
  // rather than by first resolving the user and cart rows.
  const ownedCart = { cart: { user: { firebaseUid: userId } } };

  if (clearAll) {
    await db.cartItem.deleteMany({ where: ownedCart });
  } else if (cartItemId) {
    await db.cartItem.deleteMany({ where: { id: cartItemId, ...ownedCart } });
  }

  return NextResponse.json({ success: true });
}
