import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { firebaseUid },
    include: {
      seller: {
        include: {
          bankAccount: { select: { id: true } },
          _count: { select: { products: true, orderItems: true, transactions: true } },
        },
      },
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      _count: { select: { orders: true, reviews: true, addresses: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user, { headers: { "Cache-Control": "private, max-age=0, stale-while-revalidate=30" } });
}

export async function PATCH(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const user = await db.user.update({
      where: { firebaseUid },
      data: parsed.data,
    });
    return NextResponse.json(user);
  } catch (err) {
    // phone is unique at the DB level (see prisma/schema.prisma) — surface
    // a clear, expected 409 instead of letting Prisma's raw constraint
    // error escape as an unhandled 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "This phone number is already linked to another account." },
        { status: 409 }
      );
    }
    console.error("[PATCH /api/user] Error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
