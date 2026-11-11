import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getVerifiedUid } from '@/lib/auth';
import { stripHtml, validateStringArray } from '@/lib/sanitize';

const VALID_RETURN_REASONS = ['DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'DAMAGED', 'CHANGE_OF_MIND', 'OTHER'];

export async function POST(request: NextRequest) {
  try {
    const firebaseUid = await getVerifiedUid(request);
    if (!firebaseUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look up the User DB id from Firebase UID
    const user = await db.user.findUnique({
      where: { firebaseUid },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { orderId, productId, reason, description, images } = body;

    if (!orderId || !productId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const sanitizedReason      = stripHtml(String(reason), 500);
    const sanitizedDescription = description ? stripHtml(String(description), 2000) : null;
    const sanitizedImages      = validateStringArray(images ?? [], 10);

    if (!sanitizedReason) {
      return NextResponse.json({ error: 'reason must be a non-empty string' }, { status: 400 });
    }

    if (!VALID_RETURN_REASONS.includes(sanitizedReason)) {
      return NextResponse.json({ error: 'Invalid return reason' }, { status: 400 });
    }

    // Get the order and verify it belongs to this user
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || order.userId !== user.id) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      );
    }

    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { error: 'Order must be delivered before requesting a return' },
        { status: 400 }
      );
    }

    // Check if return is within 7 days of delivery.
    // Prefer the dedicated deliveredAt timestamp (set when status transitions to
    // DELIVERED). Fall back to updatedAt for orders delivered before this field
    // existed.
    const deliveryTimestamp = order.deliveredAt ?? order.updatedAt;
    const returnDeadline = new Date(deliveryTimestamp.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (new Date() > returnDeadline) {
      return NextResponse.json(
        { error: 'Return period (7 days) has expired' },
        { status: 400 }
      );
    }

    const orderItem = order.items.find((item) => item.productId === productId);
    if (!orderItem) {
      return NextResponse.json(
        { error: 'Product not found in this order' },
        { status: 404 }
      );
    }

    // Check if return already exists for this order item
    const existingReturn = await db.return.findFirst({
      where: { orderId, productId, buyerId: user.id },
    });
    if (existingReturn) {
      return NextResponse.json(
        { error: 'Return request already exists for this product' },
        { status: 400 }
      );
    }

    const returnRequest = await db.return.create({
      data: {
        orderId,
        orderItemId: orderItem.id,
        productId,
        sellerId: orderItem.sellerId,
        buyerId: user.id,
        reason: sanitizedReason,
        description: sanitizedDescription,
        images: sanitizedImages,
        status: 'REQUESTED',
        refundAmount: orderItem.price,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Return request submitted successfully', return: returnRequest },
      { status: 201 }
    );
  } catch (error) {
    console.error('Return creation error:', error);
    return NextResponse.json({ error: 'Failed to create return request' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const firebaseUid = await getVerifiedUid(request);
    if (!firebaseUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'buyer';

    let returns;

    if (filter === 'seller') {
      // Look up seller via Firebase UID → User → Seller
      const seller = await db.seller.findFirst({
        where: { user: { firebaseUid } },
        select: { id: true },
      });
      if (!seller) {
        return NextResponse.json({ error: 'You are not a seller' }, { status: 403 });
      }

      returns = await db.return.findMany({
        where: { sellerId: seller.id },
        include: {
          // ReturnsClient only reads order.id/orderId/isCOD — narrowed from
          // the full Order row (~30 columns incl. tracking/GST/delivery data).
          order: { select: { id: true, orderId: true, isCOD: true } },
          product: { select: { name: true, images: true } },
          buyer: { select: { name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Look up user's DB id to find their returns as buyer
      const user = await db.user.findUnique({
        where: { firebaseUid },
        select: { id: true },
      });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      returns = await db.return.findMany({
        where: { buyerId: user.id },
        include: {
          // The order detail page (the only caller) reads only top-level
          // Return fields (status, refundAmount, sellerNote, ...) — narrowed
          // from the full Order row to what's actually rendered.
          order: { select: { id: true, orderId: true, isCOD: true } },
          product: { select: { name: true, images: true } },
          seller: { select: { storeName: true, logo: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ returns });
  } catch (error) {
    console.error('Fetch returns error:', error);
    return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 });
  }
}
