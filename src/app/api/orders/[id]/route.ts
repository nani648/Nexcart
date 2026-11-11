import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendOrderDeliveredEmail } from "@/lib/email";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Ownership resolved through the `user` relation in the same query, removing
  // the separate User lookup (2 round-trips -> 1).
  const order = await db.order.findFirst({
    where: { id: params.id, user: { firebaseUid } },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, images: true, productId: true, gstRate: true, hsnCode: true } },
          seller: { select: { storeName: true, sellerId: true, storeAddress: true, pickupHours: true, gstin: true, state: true } },
        },
      },
      address: true,
      payments: { where: { status: "SUCCESS" }, take: 1, orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const { payments, ...rest } = order;
  const payment = payments[0]
    ? { method: order.isCOD ? "COD" : "Online", status: String(payments[0].status) }
    : order.isCOD ? { method: "COD", status: "Pending" } : null;

  return NextResponse.json({ ...rest, payment });
}

const updateSchema = z.object({
  status: z.enum(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getVerifiedUid(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // The user and the order are independent lookups — fetch them concurrently.
  // `items.seller` is narrowed to the fields actually used for the ownership
  // check instead of loading every Seller row in full.
  const [user, order] = await Promise.all([
    db.user.findUnique({ where: { firebaseUid: userId }, include: { seller: true } }),
    db.order.findUnique({
      where: { id: params.id },
      include: { items: { include: { seller: { select: { id: true, userId: true } } } } },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const role = user.role;

  // Admin can update any order; sellers can update their own items
  if (role !== "ADMIN") {
    const isSeller = order.items.some((item) => item.seller?.userId === user.id);
    if (!isSeller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Guard against invalid status transitions
  const allowedTransitions: Record<string, string[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: [],
    CANCELLED: [],
    REFUNDED: [],
  };

  const currentStatus = order.status;
  const nextStatus = parsed.data.status;
  const allowedNext = allowedTransitions[currentStatus] ?? [];
  if (!allowedNext.includes(nextStatus)) {
    return NextResponse.json(
      { error: `Invalid status transition from ${currentStatus} to ${nextStatus}` },
      { status: 400 }
    );
  }

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.order.update({
      where: { id: params.id },
      data: {
        status: nextStatus,
        ...(nextStatus === "DELIVERED" ? { deliveredAt: new Date() } : {}),
      },
      include: {
        items: {
          include: { product: { select: { name: true, price: true } } },
        },
        user: { select: { email: true, name: true } },
      },
    });

    // Restore stock when order is cancelled
    if (nextStatus === "CANCELLED") {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    return u;
  });

  // Fire-and-forget delivered email when status changes to DELIVERED
  if (parsed.data.status === "DELIVERED" && updated.user) {
    sendOrderDeliveredEmail({
      customerEmail: updated.user.email,
      customerName: updated.user.name ?? "",
      orderId: updated.orderId,
      items: updated.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: updated.totalAmount,
    }).catch((e) => console.error("[email] delivered email error:", e));
  }

  return NextResponse.json(updated);
}
