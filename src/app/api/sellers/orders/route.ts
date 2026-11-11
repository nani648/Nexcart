import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid },
    include: { seller: true },
  });
  if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const [items, total] = await Promise.all([
    db.orderItem.findMany({
      where: { sellerId: user.seller.id },
      include: {
        order: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
            address: true,
          },
        },
        product: { select: { name: true, images: true, productId: true } },
        variant: { select: { name: true, value: true } },
      },
      orderBy: { order: { createdAt: "desc" } },
      take: limit,
      skip: (page - 1) * limit,
    }),
    db.orderItem.count({ where: { sellerId: user.seller.id } }),
  ]);

  // Group items by orderId so the seller sees one card per order
  const ordersMap = new Map<string, {
    orderId: string;
    orderDbId: string;
    status: string;
    deliveryMethod: string | null;
    deliveryStatus: string;
    trackingId: string | null;
    courierName: string | null;
    estimatedDelivery: Date | null;
    estimatedArrival: Date | null;
    selfDeliveryEnabled: boolean;
    sellerLatitude: number | null;
    sellerLongitude: number | null;
    mapsRoute: string | null;
    pickupCode: string | null;
    pickupPayment: string | null;
    isCOD: boolean;
    createdAt: Date;
    updatedAt: Date;
    customer: { name: string | null; email: string; phone: string | null };
    address: Record<string, unknown> | null;
    items: Array<{
      id: string;
      price: number;
      quantity: number;
      product: { name: string; images: string[]; productId: string };
      variant: { name: string; value: string } | null;
    }>;
  }>();

  for (const item of items) {
    const key = item.orderId;
    if (!ordersMap.has(key)) {
      ordersMap.set(key, {
        orderId: item.order.orderId,
        orderDbId: item.order.id,
        status: item.order.status,
        deliveryMethod: (item.order as Record<string, unknown>).deliveryMethod as string | null,
        deliveryStatus: ((item.order as Record<string, unknown>).deliveryStatus as string) ?? "PENDING",
        trackingId: (item.order as Record<string, unknown>).trackingId as string | null,
        courierName: (item.order as Record<string, unknown>).courierName as string | null,
        estimatedDelivery: (item.order as Record<string, unknown>).estimatedDelivery as Date | null,
        estimatedArrival: (item.order as Record<string, unknown>).estimatedArrival as Date | null,
        selfDeliveryEnabled: ((item.order as Record<string, unknown>).selfDeliveryEnabled as boolean) ?? false,
        sellerLatitude: (item.order as Record<string, unknown>).sellerLatitude as number | null,
        sellerLongitude: (item.order as Record<string, unknown>).sellerLongitude as number | null,
        mapsRoute: (item.order as Record<string, unknown>).mapsRoute as string | null,
        pickupCode: (item.order as Record<string, unknown>).pickupCode as string | null,
        pickupPayment: (item.order as Record<string, unknown>).pickupPayment as string | null,
        isCOD: ((item.order as Record<string, unknown>).isCOD as boolean) ?? false,
        createdAt: item.order.createdAt,
        updatedAt: item.order.updatedAt,
        customer: {
          name: item.order.user.name,
          email: item.order.user.email,
          phone: (item.order.user as Record<string, unknown>).phone as string | null,
        },
        address: item.order.address as Record<string, unknown> | null,
        items: [],
      });
    }
    ordersMap.get(key)!.items.push({
      id: item.id,
      price: item.price,
      quantity: item.quantity,
      product: item.product,
      variant: item.variant ?? null,
    });
  }

  return NextResponse.json({
    orders: Array.from(ordersMap.values()),
    total,
    pages: Math.ceil(total / limit),
  },
  { headers: { "Cache-Control": "private, max-age=0, stale-while-revalidate=30" } }
  );
}
