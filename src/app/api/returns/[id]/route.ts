import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getVerifiedUid } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const firebaseUid = await getVerifiedUid(request);
    if (!firebaseUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sellerNote } = await request.json();
    const { id } = params;

    // Get the return and verify seller ownership
    const [returnRequest, seller] = await Promise.all([
      db.return.findUnique({ where: { id } }),
      db.seller.findFirst({ where: { user: { firebaseUid } } }),
    ]);

    if (!returnRequest) {
      return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
    }

    if (!seller || seller.id !== returnRequest.sellerId) {
      return NextResponse.json({ error: 'Unauthorized — you are not the seller' }, { status: 403 });
    }

    // Sellers can only update their note — approve/reject/refund is admin-only
    const updated = await db.return.update({
      where: { id },
      data: { sellerNote: sellerNote || null },
    });

    return NextResponse.json({ success: true, return: updated });
  } catch (error) {
    console.error('Update return error:', error);
    return NextResponse.json({ error: 'Failed to update return' }, { status: 500 });
  }
}

/** Customer uploads tracking ID after shipping the product back */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const firebaseUid = await getVerifiedUid(request);
    if (!firebaseUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerTrackingId } = await request.json();
    const { id } = params;

    if (!customerTrackingId || typeof customerTrackingId !== 'string') {
      return NextResponse.json({ error: 'customerTrackingId is required' }, { status: 400 });
    }

    const [returnRequest, user] = await Promise.all([
      db.return.findUnique({
        where: { id },
        include: {
          seller:  { select: { userId: true } },
          product: { select: { name: true } },
        },
      }),
      db.user.findUnique({ where: { firebaseUid }, select: { id: true } }),
    ]);

    if (!returnRequest) {
      return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    }

    if (!user || returnRequest.buyerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (returnRequest.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Can only upload tracking for APPROVED returns' },
        { status: 400 }
      );
    }

    const updated = await db.return.update({
      where: { id },
      data: { customerTrackingId: customerTrackingId.trim() },
    });

    // Notify seller that customer has shipped the return package
    if (returnRequest.seller?.userId) {
      void createNotification({
        userId: returnRequest.seller.userId,
        type: "RETURN_UPDATE",
        title: "Return Package Shipped",
        body: `Customer has shipped "${returnRequest.product.name}". Tracking: ${customerTrackingId.trim()}. Confirm receipt in your dashboard once it arrives.`,
        link: "/dashboard/returns",
      });
    }

    return NextResponse.json({ success: true, return: updated });
  } catch (error) {
    console.error('Upload tracking error:', error);
    return NextResponse.json({ error: 'Failed to save tracking ID' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const firebaseUid = await getVerifiedUid(request);
    if (!firebaseUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const [returnRequest, user] = await Promise.all([
      db.return.findUnique({
        where: { id },
        include: {
          order: true,
          product: { select: { id: true, name: true, images: true } },
          buyer:  { select: { id: true, name: true, email: true, phone: true } },
          seller: { select: { storeName: true, logo: true } },
        },
      }),
      db.user.findUnique({
        where: { firebaseUid },
        include: { seller: true },
      }),
    ]);

    if (!returnRequest) {
      return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isBuyer  = returnRequest.buyerId === user.id;
    const isSeller = user.seller !== null && returnRequest.sellerId === user.seller.id;
    const isAdmin  = (user as { role?: string }).role === 'ADMIN';

    if (!isBuyer && !isSeller && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(returnRequest);
  } catch (error) {
    console.error('Fetch return error:', error);
    return NextResponse.json({ error: 'Failed to fetch return request' }, { status: 500 });
  }
}
