import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

/** POST /api/admin/returns/[id]/cod-refund — record manual COD refund (admin only) */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = await db.user.findUnique({
      where: { firebaseUid },
      select: { id: true, role: true },
    });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const refundRef = typeof body?.refundRef === "string" ? body.refundRef.trim() : null;
    if (!refundRef) {
      return NextResponse.json({ error: "refundRef (UPI/bank reference) is required" }, { status: 400 });
    }

    const existing = await db.return.findUnique({
      where: { id: params.id },
      include: {
        order: { select: { id: true, isCOD: true, orderId: true, items: { select: { id: true } } } },
        buyer: { select: { id: true, name: true, email: true } },
      },
    });

    if (!existing) return NextResponse.json({ error: "Return not found" }, { status: 404 });
    if (!existing.order.isCOD) {
      return NextResponse.json({ error: "This is not a COD order" }, { status: 400 });
    }
    if (existing.status === "REFUNDED") {
      return NextResponse.json({ error: "Already marked as refunded" }, { status: 400 });
    }
    if (existing.status === "REJECTED") {
      return NextResponse.json({ error: "Return is rejected — cannot refund" }, { status: 400 });
    }

    const now = new Date();

    const orderItem = await db.orderItem.findUnique({
      where: { id: existing.orderItemId },
      select: { productId: true, variantId: true, quantity: true },
    });

    await db.$transaction(async (tx) => {
      // Atomic guard: only proceed if this return hasn't already been marked
      // REFUNDED by a concurrent request (e.g. double-click or admin double
      // submit). If another request won the race, count === 0 and we abort
      // the whole transaction — no double stock restoration.
      const claimed = await tx.return.updateMany({
        where: { id: params.id, status: { not: "REFUNDED" } },
        data: {
          status: "REFUNDED",
          refundedAt: now,
          codRefundRef: refundRef,
          codRefundedAt: now,
        },
      });
      if (claimed.count === 0) {
        throw new Error("ALREADY_REFUNDED");
      }

      // Restore stock for the returned item
      if (orderItem) {
        await tx.product.update({
          where: { id: orderItem.productId },
          data: { stock: { increment: orderItem.quantity } },
        });
        if (orderItem.variantId) {
          await tx.productVariant.update({
            where: { id: orderItem.variantId },
            data: { stock: { increment: orderItem.quantity } },
          });
        }
      }

      // Only mark the whole order REFUNDED if every item in the order has
      // a corresponding REFUNDED return.
      const totalItems = existing.order.items.length;
      const nonRefundedReturns = await tx.return.count({
        where: { orderId: existing.order.id, status: { not: "REFUNDED" } },
      });
      const refundedReturns = await tx.return.count({
        where: { orderId: existing.order.id, status: "REFUNDED" },
      });
      if (nonRefundedReturns === 0 && refundedReturns >= totalItems) {
        await tx.order.update({
          where: { id: existing.order.id },
          data: { status: "REFUNDED" },
        });
      }
    });

    void createNotification({
      userId: existing.buyer.id,
      type: "COD_REFUND_DONE",
      title: "COD Refund Processed",
      body: `Your refund of ₹${(existing.refundAmount ?? 0).toFixed(0)} for return #${existing.id.slice(-8).toUpperCase()} has been transferred. Reference: ${refundRef}.`,
      link: `/orders/${existing.order.id}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_REFUNDED") {
      return NextResponse.json({ error: "This return was already refunded (possibly by a concurrent request)" }, { status: 409 });
    }
    console.error("[cod-refund]", err);
    return NextResponse.json({ error: "Failed to record COD refund" }, { status: 500 });
  }
}
