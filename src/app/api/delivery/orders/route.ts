import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "DELIVERY_AGENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agent = await db.deliveryAgent.findUnique({
    where: { userId: user.id },
    select: { id: true, isActive: true },
  });
  if (!agent || !agent.isActive) {
    return NextResponse.json({ error: "Agent profile not found or inactive" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const orders = await db.order.findMany({
    where: {
      deliveryAgentId: agent.id,
      ...(statusFilter ? { deliveryStatus: statusFilter as never } : {}),
    },
    include: {
      items: {
        include: {
          product: { select: { name: true, images: true } },
        },
      },
      address: true,
      user: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}
