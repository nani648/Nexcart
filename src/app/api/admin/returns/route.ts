import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

const SELLER_FAULT_REASONS = ["DEFECTIVE", "WRONG_ITEM", "NOT_AS_DESCRIBED", "DAMAGED"];
const RETURN_SHIPPING_COST = 70;

async function requireAdmin(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return null;
  const user = await db.user.findUnique({ where: { firebaseUid } });
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 20;

  const where =
    status && status !== "ALL"
      ? { status: status as "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDED" }
      : {};

  const [returns, total] = await Promise.all([
    db.return.findMany({
      where,
      include: {
        order:   { select: { orderId: true, isCOD: true } },
        product: { select: { name: true, images: true } },
        buyer:   { select: { name: true, email: true } },
        seller:  { select: { storeName: true, sellerId: true, storeAddress: true, user: { select: { phone: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    db.return.count({ where }),
  ]);

  return NextResponse.json({ returns, total, pages: Math.ceil(total / limit), page });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { returnId, action, adminNote } = body as {
    returnId: string;
    action: "APPROVE" | "REJECT" | "MARK_REFUNDED";
    adminNote?: string;
  };

  if (!returnId || !action) {
    return NextResponse.json({ error: "returnId and action are required" }, { status: 400 });
  }

  if (!["APPROVE", "REJECT", "MARK_REFUNDED"].includes(action)) {
    return NextResponse.json({ error: "action must be APPROVE, REJECT, or MARK_REFUNDED" }, { status: 400 });
  }

  const existing = await db.return.findUnique({
    where: { id: returnId },
    include: {
      buyer:   { select: { id: true, name: true } },
      seller:  { select: { id: true, userId: true, storeName: true, storeAddress: true, user: { select: { phone: true, name: true } } } },
      product: { select: { name: true } },
      order:   { select: { id: true, isCOD: true, items: { select: { id: true } } } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Return not found" }, { status: 404 });
  }

  if (action === "APPROVE") {
    if (existing.status !== "REQUESTED") {
      return NextResponse.json({ error: "Only REQUESTED returns can be approved" }, { status: 400 });
    }

    const isSellerFault = SELLER_FAULT_REASONS.includes(String(existing.reason));
    const shippingChargedTo = isSellerFault ? "SELLER" : "CUSTOMER";

    // Adjust refund amount based on who pays shipping
    const originalRefund = existing.refundAmount ?? 0;
    const refundToCustomer =
      shippingChargedTo === "CUSTOMER"
        ? Math.max(0, originalRefund - RETURN_SHIPPING_COST)
        : originalRefund;

    const updated = await db.return.update({
      where: { id: returnId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        shippingChargedTo,
        returnShippingCost: RETURN_SHIPPING_COST,
        refundAmount: refundToCustomer,
        sellerNote: adminNote || null,
      },
    });

    // Notify customer
    const shippingNote =
      shippingChargedTo === "CUSTOMER"
        ? `Note: ₹${RETURN_SHIPPING_COST} return shipping will be deducted from your refund.`
        : "Return shipping is covered by the seller.";

    void createNotification({
      userId: existing.buyerId,
      type: "RETURN_UPDATE",
      title: "Return Approved",
      body: `Your return request for "${existing.product.name}" has been approved. Please ship the product to the seller's address. Once the seller confirms receipt, your refund of ₹${updated.refundAmount?.toFixed(0) ?? "—"} will be initiated. ${shippingNote}`,
      link: `/orders`,
    });

    // Notify seller
    void createNotification({
      userId: existing.seller.userId,
      type: "RETURN_UPDATE",
      title: "Return Approved — Expect Package",
      body: `A return for "${existing.product.name}" has been approved. Please confirm receipt in your seller dashboard once the product arrives.`,
      link: `/dashboard/returns`,
    });

    return NextResponse.json({ success: true, return: updated });
  }

  if (action === "REJECT") {
    if (existing.status !== "REQUESTED" && existing.status !== "APPROVED") {
      return NextResponse.json({ error: "Cannot reject a return that is already refunded or rejected" }, { status: 400 });
    }

    const updated = await db.return.update({
      where: { id: returnId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        sellerNote: adminNote || null,
      },
    });

    void createNotification({
      userId: existing.buyerId,
      type: "RETURN_UPDATE",
      title: "Return Request Rejected",
      body: `Your return request for "${existing.product.name}" has been rejected.${adminNote ? ` Reason: ${adminNote}` : ""} Contact support if you have questions.`,
      link: `/orders`,
    });

    return NextResponse.json({ success: true, return: updated });
  }

  // MARK_REFUNDED — admin manual override, no Razorpay call
  if (action === "MARK_REFUNDED") {
    if (existing.status === "REFUNDED") {
      return NextResponse.json({ error: "Already refunded" }, { status: 400 });
    }

    const orderItem = await db.orderItem.findUnique({
      where: { id: existing.orderItemId },
      select: { productId: true, variantId: true, quantity: true },
    });

    // Wallet deduction mirrors the seller-confirm flow:
    // shippingChargedTo === "SELLER": seller pays product + return shipping
    // shippingChargedTo === "CUSTOMER": seller pays product only
    const refundAmount = existing.refundAmount ?? 0;
    const walletDeduction =
      existing.shippingChargedTo === "SELLER"
        ? refundAmount + RETURN_SHIPPING_COST
        : refundAmount;

    try {
    await db.$transaction(async (tx) => {
      // Atomic guard: only proceed if this return hasn't already been marked
      // REFUNDED by a concurrent request (e.g. admin double-click, or the
      // seller's own confirm-return racing this admin override). If another
      // request won the race, count === 0 and we abort the whole transaction
      // — no double stock restoration and no double wallet debit.
      const claimed = await tx.return.updateMany({
        where: { id: returnId, status: { not: "REFUNDED" } },
        data: {
          status: "REFUNDED",
          refundedAt: new Date(),
          productReceivedAt: new Date(),
          sellerNote: adminNote || null,
        },
      });
      if (claimed.count === 0) {
        throw new Error("ALREADY_REFUNDED");
      }

      // Restore stock for the returned item (status was REQUESTED/APPROVED,
      // i.e. stock was not restored yet)
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

      // Reverse the seller's wallet credit for the returned item, same as
      // the seller-initiated confirm-return flow.
      if (walletDeduction > 0) {
        await tx.seller.update({
          where: { id: existing.seller.id },
          data: { walletBalance: { decrement: walletDeduction } },
        });
        await tx.sellerTransaction.create({
          data: {
            sellerId: existing.seller.id,
            type: "RETURN_DEBIT",
            amount: walletDeduction,
            orderId: existing.orderId,
            description:
              `Return refund ₹${refundAmount.toFixed(0)} for "${existing.product.name}" (admin)` +
              (existing.shippingChargedTo === "SELLER"
                ? ` + ₹${RETURN_SHIPPING_COST} return shipping`
                : ""),
          },
        });
      }

      // Only mark the whole order REFUNDED if every item in the order has
      // a corresponding REFUNDED return.
      const totalItems = existing.order.items.length;
      const nonRefundedReturns = await tx.return.count({
        where: { orderId: existing.orderId, status: { not: "REFUNDED" } },
      });
      const refundedReturns = await tx.return.count({
        where: { orderId: existing.orderId, status: "REFUNDED" },
      });
      if (nonRefundedReturns === 0 && refundedReturns >= totalItems) {
        await tx.order.update({
          where: { id: existing.orderId },
          data: { status: "REFUNDED" },
        });
      }
    });
    } catch (err) {
      if (err instanceof Error && err.message === "ALREADY_REFUNDED") {
        return NextResponse.json({ error: "This return was already refunded (possibly by a concurrent request)" }, { status: 409 });
      }
      console.error("[admin/returns MARK_REFUNDED]", err);
      return NextResponse.json({ error: "Failed to mark return as refunded" }, { status: 500 });
    }

    void createNotification({
      userId: existing.buyerId,
      type: "RETURN_UPDATE",
      title: "Refund Processed",
      body: `Your refund of ₹${existing.refundAmount?.toFixed(0) ?? "—"} for "${existing.product.name}" has been processed. Please allow 5–7 business days.`,
      link: `/orders`,
    });

    return NextResponse.json({ success: true });
  }
}
