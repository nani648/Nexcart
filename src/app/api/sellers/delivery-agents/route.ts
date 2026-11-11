import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";

/** GET /api/sellers/delivery-agents — list seller's delivery agents */
export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seller = await db.seller.findFirst({
    where: { user: { firebaseUid } },
    select: { id: true },
  });
  if (!seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const agents = await db.deliveryAgent.findMany({
    where: { sellerId: seller.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ agents });
}

/** POST /api/sellers/delivery-agents — add existing user as delivery agent */
export async function POST(req: NextRequest) {
  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sellerUser = await db.user.findUnique({
      where: { firebaseUid },
      include: { seller: true },
    });
    if (!sellerUser?.seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

    // Find the user to be made a delivery agent
    const targetUser = await db.user.findUnique({
      where: { email },
      include: { deliveryAgent: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
    }
    if (targetUser.id === sellerUser.id) {
      return NextResponse.json({ error: "You cannot add yourself as a delivery agent" }, { status: 400 });
    }
    if (targetUser.deliveryAgent) {
      return NextResponse.json({ error: "This user is already a delivery agent" }, { status: 400 });
    }
    // A seller could otherwise look up ANY user by email — including an
    // admin or another seller — and this endpoint would silently overwrite
    // that account's global role to DELIVERY_AGENT with no consent from the
    // target. Only ever downgrade/reassign a plain CUSTOMER account; refuse
    // to touch anyone who already holds a privileged or distinct role.
    if (targetUser.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "This user already has an existing account role and cannot be added as a delivery agent" },
        { status: 400 }
      );
    }

    // Create delivery agent record + update user role atomically
    const agent = await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUser.id },
        data: { role: "DELIVERY_AGENT" },
      });
      return tx.deliveryAgent.create({
        data: {
          userId: targetUser.id,
          sellerId: sellerUser.seller!.id,
        },
        include: {
          user: { select: { name: true, email: true, phone: true } },
        },
      });
    });

    return NextResponse.json({ success: true, agent }, { status: 201 });
  } catch (err) {
    console.error("[add delivery agent]", err);
    return NextResponse.json({ error: "Failed to add delivery agent" }, { status: 500 });
  }
}
