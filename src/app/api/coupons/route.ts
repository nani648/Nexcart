import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { couponSchema } from "@/lib/validations";
import { getClientIp } from "@/lib/rate-limit";
import { checkRateLimit, RATE_LIMITS } from "@/lib/ratelimit";

async function requireAdmin(req: NextRequest) {
  const uid = await getVerifiedUid(req);
  if (!uid) return null;
  const user = await db.user.findUnique({ where: { firebaseUid: uid } });
  if (!user || (user as { role?: string }).role !== "ADMIN") return null;
  return user;
}

// GET /api/coupons
// - Admin (no ?code param): list all coupons with usedCount
// - Anyone with ?code=XXX&total=YYY: validate a coupon for checkout
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.toUpperCase();
  const orderTotal = parseFloat(searchParams.get("total") || "0");

  // ── Coupon validation (public, used at checkout) ─────────────────────────
  if (code) {
    // 10 coupon validations per minute per IP — prevents brute-force
    // enumeration. Redis-backed (lib/ratelimit) so the limit is durable
    // across serverless instances, not reset on cold start.
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`coupon:${ip}`, RATE_LIMITS.couponCheck);
    if (!rl.success) {
      return NextResponse.json({ valid: false, error: "Too many requests. Please slow down." }, { status: 429 });
    }

    const coupon = await db.coupon.findUnique({ where: { code, isActive: true } });

    if (!coupon) return NextResponse.json({ valid: false, error: "Invalid coupon code" });
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, error: "Coupon has expired" });
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, error: "Coupon usage limit reached" });
    }
    if (orderTotal < coupon.minOrder) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order of ₹${coupon.minOrder} required`,
      });
    }

    const rawDiscount =
      coupon.discountType === "percentage"
        ? (orderTotal * coupon.discount) / 100
        : coupon.discount;
    // Never let a discount exceed the order total (defends against
    // misconfigured >100% percentage coupons or oversized fixed coupons)
    const discount = Math.min(rawDiscount, orderTotal);

    return NextResponse.json({
      valid: true,
      discount,
      discountType: coupon.discountType,
      discountValue: coupon.discount,
      code: coupon.code,
    });
  }

  // ── Admin: list all coupons ───────────────────────────────────────────────
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(coupons);
}

// POST /api/coupons — admin only: create a coupon
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = couponSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Ensure coupon code is unique
  const existing = await db.coupon.findUnique({ where: { code: parsed.data.code } });
  if (existing) return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });

  const coupon = await db.coupon.create({ data: parsed.data });
  return NextResponse.json(coupon, { status: 201 });
}
