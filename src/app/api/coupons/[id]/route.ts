import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

interface Params { params: { id: string } }

const updateSchema = z.object({
  code: z.string().min(2).optional(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discount: z.number().positive().optional(),
  minOrder: z.number().min(0).optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

async function requireAdmin(req: NextRequest) {
  const uid = await getVerifiedUid(req);
  if (!uid) return null;
  const user = await db.user.findUnique({ where: { firebaseUid: uid } });
  if (!user || (user as { role?: string }).role !== "ADMIN") return null;
  return user;
}

// PATCH /api/coupons/[id] — admin only: update any field, including toggling isActive
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const coupon = await db.coupon.findUnique({ where: { id: params.id } });
  if (!coupon) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Cap percentage discounts at 100% — consider both the new and existing discountType
  const effectiveType = parsed.data.discountType ?? coupon.discountType;
  const effectiveDiscount = parsed.data.discount ?? coupon.discount;
  if (effectiveType === "percentage" && effectiveDiscount > 100) {
    return NextResponse.json(
      { error: "Percentage discount cannot exceed 100" },
      { status: 400 }
    );
  }

  // If code is being changed, check uniqueness
  if (parsed.data.code && parsed.data.code !== coupon.code) {
    const codeExists = await db.coupon.findUnique({ where: { code: parsed.data.code } });
    if (codeExists) return NextResponse.json({ error: "Coupon code already in use" }, { status: 409 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.expiresAt !== undefined) {
    data.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  }

  const updated = await db.coupon.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/coupons/[id] — admin only: hard delete
export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const coupon = await db.coupon.findUnique({ where: { id: params.id } });
  if (!coupon) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });

  await db.coupon.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
