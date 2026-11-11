import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

/** POST /api/sellers/orders/[id]/assign-agent — assign or unassign a delivery agent */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { firebaseUid },
      include: { seller: true },
    });
    if (!user?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

    const order = await db.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const isSellersOrder = order.items.some((item) => item.sellerId === user.seller!.id);
    if (!isSellersOrder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const agentId = typeof body?.agentId === "string" ? body.agentId : null;

    // null agentId = unassign
    if (agentId === null || agentId === "") {
      const updated = await db.order.update({
        where: { id: params.id },
        data: { deliveryAgentId: null },
      });
      return NextResponse.json({ success: true, order: updated });
    }

    const agent = await db.deliveryAgent.findUnique({ where: { id: agentId } });
    if (!agent || agent.sellerId !== user.seller.id || !agent.isActive) {
      return NextResponse.json({ error: "Invalid or inactive agent" }, { status: 400 });
    }

    const updated = await db.order.update({
      where: { id: params.id },
      data: { deliveryAgentId: agent.id },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (err) {
    console.error("[assign agent]", err);
    return NextResponse.json({ error: "Failed to assign agent" }, { status: 500 });
  }
}
