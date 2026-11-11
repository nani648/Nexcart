import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["PACKED", "READY_FOR_PICKUP", "PICKED_UP"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid },
    include: { seller: true },
  });
  if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { status } = parsed.data;

  // Find the order and verify it belongs to this seller
  const order = await db.order.findFirst({
    where: {
      id: params.id,
      deliveryMethod: "PICKUP",
      items: { some: { sellerId: user.seller.id } },
    },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Map status to order status
  const orderStatus =
    status === "PICKED_UP" ? "DELIVERED" :
    status === "READY_FOR_PICKUP" ? "PROCESSING" :
    "CONFIRMED";

  const updated = await db.order.update({
    where: { id: params.id },
    data: {
      deliveryStatus: status,
      status: orderStatus,
    },
  });

  // Notify customer when seller packs the order
  if (status === "PACKED") {
    createNotification({
      userId: order.user.id,
      type: "ORDER_PACKED",
      title: "Your order is being packed!",
      body: `Order #${order.orderId.slice(-6).toUpperCase()} is being packed by the seller. Come collect it soon!`,
      link: `/orders/${order.id}/pickup`,
    });
  }

  // Notify customer when order is fully ready for pickup
  if (status === "READY_FOR_PICKUP") {
    createNotification({
      userId: order.user.id,
      type: "PICKUP_READY",
      title: "Your order is ready for pickup!",
      body: `Order #${order.orderId.slice(-6).toUpperCase()} is packed and waiting. Come collect using code: ${order.pickupCode}`,
      link: `/orders/${order.id}/pickup`,
    });
  }

  return NextResponse.json(updated);
}
