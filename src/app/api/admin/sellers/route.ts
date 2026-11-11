import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { sendSellerStatusEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const where = status ? { status: status as "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED" } : {};

  const [sellers, total] = await Promise.all([
    db.seller.findMany({
      where,
      include: {
        user: { select: { email: true, name: true, firebaseUid: true } },
        _count: { select: { products: true, orderItems: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    db.seller.count({ where }),
  ]);

  return NextResponse.json({ sellers, total, pages: Math.ceil(total / limit) });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { sellerId, status, banner } = await req.json();
  if (!sellerId) {
    return NextResponse.json({ error: "sellerId required" }, { status: 400 });
  }

  // Banner-only update (no status change)
  if (banner !== undefined && !status) {
    const updated = await db.seller.update({
      where: { id: sellerId },
      data: { banner: banner || null },
    });
    return NextResponse.json(updated);
  }

  if (!status) {
    return NextResponse.json({ error: "status required" }, { status: 400 });
  }

  const seller = await db.seller.update({
    where: { id: sellerId },
    data: { status },
    // Only the fields actually read below — avoids pulling the full User row
    // (including the verification-token columns) over the wire.
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  // Role is managed in DB — no external auth provider needed
  if (status === "APPROVED" || status === "SUSPENDED") {
    await db.user.update({
      where: { id: seller.user.id },
      data: { role: status === "APPROVED" ? "SELLER" : "CUSTOMER" },
    });
  }

  // Send email to seller when status changes to APPROVED, REJECTED, or SUSPENDED
  if (status === "APPROVED" || status === "REJECTED" || status === "SUSPENDED") {
    await sendSellerStatusEmail({
      sellerEmail: seller.user.email,
      sellerName: seller.user.name ?? seller.storeName,
      storeName: seller.storeName,
      status,
    });
  }

  // Create SELLER_APPROVED notification
  if (status === "APPROVED") {
    createNotification({
      userId: seller.userId,
      type: "SELLER_APPROVED",
      title: "🎉 Your Store is Approved!",
      body: `Congratulations! Your store "${seller.storeName}" has been approved. Start uploading products now!`,
      link: "/seller/products/new",
    });
  }

  return NextResponse.json(seller);
}
