import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { getRazorpay, isRazorpayConfigured } from "@/lib/razorpay";

const RETURN_SHIPPING_COST = 70;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const firebaseUid = await getVerifiedUid(req);

    if (!firebaseUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const [returnRequest, seller] = await Promise.all([
      db.return.findUnique({
        where: { id },
        include: {
          order: {
            include: {
              payments: {
                where: { status: "SUCCESS" },
                select: { razorpayPaymentId: true },
                take: 1,
              },
              items: { select: { id: true } },
            },
          },
          product: { select: { name: true } },
          buyer: { select: { id: true, name: true } },
        },
      }),
      db.seller.findFirst({
        where: { user: { firebaseUid } },
      }),
    ]);

    if (!returnRequest) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    if (!seller || seller.id !== returnRequest.sellerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (returnRequest.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only APPROVED returns can be confirmed as received" },
        { status: 400 }
      );
    }

    const refundAmount = returnRequest.refundAmount ?? 0;
    const isCOD = returnRequest.order.isCOD;
    const razorpayPaymentId =
      returnRequest.order.payments[0]?.razorpayPaymentId ?? null;

    const requiresRazorpayRefund =
      !isCOD && Boolean(razorpayPaymentId) && refundAmount > 0;

    if (
      requiresRazorpayRefund &&
      !isRazorpayConfigured()
    ) {
      return NextResponse.json(
        {
          error:
            "Online refunds are temporarily unavailable. Please configure Razorpay first.",
        },
        { status: 503 }
      );
    }

    const claim = await db.return.updateMany({
      where: { id, status: "APPROVED" },
      data: {
        status: "REFUNDED",
        productReceivedAt: new Date(),
        refundedAt: new Date(),
      },
    });

    if (claim.count === 0) {
      return NextResponse.json(
        {
          error:
            "This return is no longer in APPROVED state or has already been processed.",
        },
        { status: 409 }
      );
    }

    const walletDeduction =
      returnRequest.shippingChargedTo === "SELLER"
        ? refundAmount + RETURN_SHIPPING_COST
        : refundAmount;

    let razorpayRefundId: string | null = null;

    if (requiresRazorpayRefund && razorpayPaymentId) {
      try {
        const refund = await getRazorpay().payments.refund(razorpayPaymentId, {
          amount: Math.round(refundAmount * 100),
          notes: { returnId: returnRequest.returnId },
        });

        razorpayRefundId = refund.id;
      } catch (error) {
        await db.return.update({
          where: { id },
          data: {
            status: "APPROVED",
            productReceivedAt: null,
            refundedAt: null,
          },
        });

        console.error("[confirm-return] Razorpay refund failed:", error);

        return NextResponse.json(
          { error: "Refund initiation failed. Please try again later." },
          { status: 502 }
        );
      }

      // The money has now left via Razorpay. Record the refund ID straight
      // away, on its own, so it is never lost if the stock/wallet transaction
      // below fails. (Deliberately outside the try/catch above: a DB error
      // here must NOT revert the return to APPROVED, or a retry would refund
      // the customer a second time.)
      try {
        await db.return.update({ where: { id }, data: { razorpayRefundId } });
      } catch (saveErr) {
        console.error(
          `[confirm-return] Refund ${razorpayRefundId} issued but could not be saved on return ${id}:`,
          saveErr
        );
      }
    }

    const orderItem = await db.orderItem.findUnique({
      where: { id: returnRequest.orderItemId },
      select: {
        productId: true,
        variantId: true,
        quantity: true,
      },
    });

    await db.$transaction(async (tx) => {
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

      if (walletDeduction > 0) {
        await tx.seller.update({
          where: { id: seller.id },
          data: {
            walletBalance: { decrement: walletDeduction },
          },
        });

        await tx.sellerTransaction.create({
          data: {
            sellerId: seller.id,
            type: "RETURN_DEBIT",
            amount: walletDeduction,
            orderId: returnRequest.orderId,
            description:
              `Return refund ₹${refundAmount.toFixed(0)} for "${returnRequest.product.name}"` +
              (returnRequest.shippingChargedTo === "SELLER"
                ? ` + ₹${RETURN_SHIPPING_COST} return shipping`
                : ""),
          },
        });
      }

      const totalItems = returnRequest.order.items.length;

      const nonRefundedReturns = await tx.return.count({
        where: {
          orderId: returnRequest.orderId,
          status: { not: "REFUNDED" },
        },
      });

      const refundedReturns = await tx.return.count({
        where: {
          orderId: returnRequest.orderId,
          status: "REFUNDED",
        },
      });

      if (nonRefundedReturns === 0 && refundedReturns >= totalItems) {
        await tx.order.update({
          where: { id: returnRequest.orderId },
          data: { status: "REFUNDED" },
        });
      }
    });

    const refundNote = isCOD
      ? "Since this was a cash-on-delivery order, our team will contact you for the refund transfer."
      : refundAmount > 0
        ? `₹${refundAmount.toFixed(0)} refund has been initiated. Allow 5–7 business days.`
        : "Your return has been confirmed. No monetary refund applies for this return.";

    void createNotification({
      userId: returnRequest.buyerId,
      type: "RETURN_UPDATE",
      title: "Refund Initiated",
      body: `The seller has confirmed receipt of "${returnRequest.product.name}". ${refundNote}`,
      link: "/orders",
    });

    return NextResponse.json({
      success: true,
      razorpayRefundId,
    });
  } catch (error) {
    console.error("[confirm-return]", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}