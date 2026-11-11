import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getVerifiedUid } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const firebaseUid = await getVerifiedUid(request);
    if (!firebaseUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sellerId, orderId, rating, comment } = await request.json();

    if (!sellerId || !orderId || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Resolve the user and the order concurrently — independent lookups. The
    // order's `items` relation was fetched but never read, so it is no longer
    // included.
    const [dbUser, order] = await Promise.all([
      db.user.findUnique({ where: { firebaseUid }, select: { id: true } }),
      db.order.findUnique({
        where: { id: orderId },
        select: { userId: true, status: true },
      }),
    ]);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!order || order.userId !== dbUser.id) {
      return NextResponse.json(
        { error: 'Order not found or unauthorized' },
        { status: 404 }
      );
    }

    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { error: 'Can only rate delivered orders' },
        { status: 400 }
      );
    }

    // The seller being rated must actually have items in this order —
    // otherwise any delivered order could be used to rate any seller.
    const sellerInOrder = await db.orderItem.findFirst({
      where: { orderId, sellerId },
      select: { id: true },
    });
    if (!sellerInOrder) {
      return NextResponse.json(
        { error: 'This seller is not part of this order' },
        { status: 400 }
      );
    }

    // Check if already rated
    const existingRating = await db.sellerRating.findFirst({
      where: { sellerId, orderId, userId: dbUser.id },
    });

    if (existingRating) {
      return NextResponse.json(
        { error: 'You have already rated this seller for this order' },
        { status: 400 }
      );
    }

    // Create the rating
    const sellerRating = await db.sellerRating.create({
      data: {
        sellerId,
        orderId,
        userId: dbUser.id,
        rating,
        comment: comment || null,
      },
    });

    // Recompute the seller's aggregates in the database rather than loading
    // every rating row and every order item into memory just to take a length
    // and an average — this used to grow linearly with the seller's history.
    const [ratingStats, sellerOrderCount] = await Promise.all([
      db.sellerRating.aggregate({
        where: { sellerId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      db.orderItem.count({ where: { sellerId } }),
    ]);

    const averageRating = ratingStats?._avg?.rating ?? 0;
    const totalRatings = ratingStats?._count?._all ?? 0;

    // Verified badge (10+ orders, 4+ rating) is folded into the same update
    // instead of issuing a second write.
    await db.seller.update({
      where: { id: sellerId },
      data: {
        rating: averageRating,
        totalRatings,
        totalReviews: totalRatings,
        ...(sellerOrderCount >= 10 && averageRating >= 4 ? { isVerified: true } : {}),
      },
    });

    return NextResponse.json(
      { success: true, message: 'Rating submitted successfully', rating: sellerRating },
      { status: 201 }
    );
  } catch (error) {
    console.error('Rating creation error:', error);
    return NextResponse.json(
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');

    if (!sellerId) {
      return NextResponse.json(
        { error: 'Seller ID is required' },
        { status: 400 }
      );
    }

    // Independent reads — issue them concurrently.
    const [ratings, seller] = await Promise.all([
      db.sellerRating.findMany({
        where: { sellerId },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.seller.findUnique({
        where: { id: sellerId },
        select: { rating: true, totalRatings: true, totalReviews: true, isVerified: true },
      }),
    ]);

    return NextResponse.json({ ratings, seller });
  } catch (error) {
    console.error('Fetch ratings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}
