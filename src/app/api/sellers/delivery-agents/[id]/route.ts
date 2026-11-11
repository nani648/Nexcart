import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

/** PATCH /api/sellers/delivery-agents/[id] — toggle active/inactive */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await db.seller.findFirst({
      where: { user: { firebaseUid } },
      select: { id: true },
    });
    if (!seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

    const agent = await db.deliveryAgent.findUnique({ where: { id: params.id } });
    if (!agent || agent.sellerId !== seller.id) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await req.json();
    const isActive = typeof body?.isActive === "boolean" ? body.isActive : !agent.isActive;

    const updated = await db.deliveryAgent.update({
      where: { id: params.id },
      data: { isActive },
      include: { user: { select: { name: true, email: true } } },
    });

    return NextResponse.json({ success: true, agent: updated });
  } catch (err) {
    console.error("[toggle agent]", err);
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

/** DELETE /api/sellers/delivery-agents/[id] — remove agent (revert role to CUSTOMER) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const seller = await db.seller.findFirst({
      where: { user: { firebaseUid } },
      select: { id: true },
    });
    if (!seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

    const agent = await db.deliveryAgent.findUnique({ where: { id: params.id } });
    if (!agent || agent.sellerId !== seller.id) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: agent.userId },
        data: { role: "CUSTOMER" },
      });
      await tx.deliveryAgent.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[delete agent]", err);
    return NextResponse.json({ error: "Failed to remove agent" }, { status: 500 });
  }
}
