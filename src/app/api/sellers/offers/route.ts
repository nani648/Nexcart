import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { z } from "zod";
import { revalidateTag } from "next/cache";

// Offers now feed directly into the REAL price shown/charged (see
// src/lib/offer-pricing.ts) on the seller's storefront (getSeller, tag
// "sellers") and the product detail page (getProduct, tag "products").
// Both are cached for up to 60s (unstable_cache + revalidate: 60), so
// without this, creating/editing/deleting an offer wouldn't be reflected
// in the price for up to a minute. Bust all three tags after every write —
// matches the same pattern already used in the product create/update
// routes.
function bustOfferPricingCaches() {
  revalidateTag("sellers");
  revalidateTag("products");
  revalidateTag("homepage");
}

// ─── Shared: resolve seller from request ───────────────────────────────────
async function getSellerFromRequest(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return null;
  const user = await db.user.findUnique({
    where: { firebaseUid },
    include: { seller: true },
  });
  if (!user?.seller) return null;
  return user.seller;
}

function autoBadgeColor(offerType: string): string {
  const palette: Record<string, string> = {
    BUY_X_GET_Y:   "#7C3AED",
    PERCENT_OFF:   "#DC2626",
    FLAT_OFF:      "#D97706",
    FREE_SHIPPING: "#059669",
    CUSTOM:        "#2563EB",
  };
  return palette[offerType] ?? "#6B7280";
}

const offerSchema = z.object({
  title:              z.string().min(2).max(80),
  description:        z.string().max(200).optional().nullable(),
  offerType:          z.enum(["BUY_X_GET_Y", "PERCENT_OFF", "FLAT_OFF", "FREE_SHIPPING", "CUSTOM", "DEALS_OF_THE_DAY"]),
  buyQty:             z.number().int().positive().max(100).optional().nullable(),
  getQty:             z.number().int().positive().max(100).optional().nullable(),
  discountVal:        z.number().positive().max(100000).optional().nullable(),
  isActive:           z.boolean().optional(),
  sortOrder:          z.number().int().optional(),
  linkedProductId:    z.string().optional().nullable(),
  selectedProductIds: z.array(z.string()).optional().nullable(), // ✅ NEW
});

export async function GET(req: NextRequest) {
  const seller = await getSellerFromRequest(req);
  if (!seller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offers = await db.sellerOffer.findMany({
    where: { sellerId: seller.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ offers, sellerId: seller.sellerId }, { headers: { "Cache-Control": "private, max-age=0, stale-while-revalidate=30" } });
}

export async function POST(req: NextRequest) {
  const seller = await getSellerFromRequest(req);
  if (!seller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = offerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { title, description, offerType, buyQty, getQty, discountVal, isActive, sortOrder, linkedProductId, selectedProductIds } = parsed.data;

  const count = await db.sellerOffer.count({ where: { sellerId: seller.id } });
  if (count >= 20) return NextResponse.json({ error: "Max 20 offers per seller" }, { status: 400 });

  const offer = await db.sellerOffer.create({
    data: {
      sellerId:            seller.id,
      title,
      description:         description ?? null,
      offerType,
      buyQty:              buyQty ?? null,
      getQty:              getQty ?? null,
      discountVal:         discountVal ?? null,
      badgeColor:          autoBadgeColor(offerType),
      isActive:            isActive ?? true,
      sortOrder:           sortOrder ?? count,
      linkedProductId:     linkedProductId ?? null,
      selectedProductIds:  selectedProductIds ? JSON.stringify(selectedProductIds) : null, // ✅ NEW
    },
  });
  bustOfferPricingCaches();
  return NextResponse.json({ offer }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const seller = await getSellerFromRequest(req);
  if (!seller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fullSchema = offerSchema.extend({ id: z.string() });
  const parsed = fullSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id, title, description, offerType, buyQty, getQty, discountVal, isActive, sortOrder, linkedProductId, selectedProductIds } = parsed.data;

  const existing = await db.sellerOffer.findFirst({ where: { id, sellerId: seller.id } });
  if (!existing) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  const offer = await db.sellerOffer.update({
    where: { id },
    data: {
      title,
      description:         description ?? null,
      offerType,
      buyQty:              buyQty ?? null,
      getQty:              getQty ?? null,
      discountVal:         discountVal ?? null,
      badgeColor:          autoBadgeColor(offerType),
      isActive:            isActive ?? existing.isActive,
      sortOrder:           sortOrder ?? existing.sortOrder,
      linkedProductId:     linkedProductId ?? null,
      selectedProductIds:  selectedProductIds ? JSON.stringify(selectedProductIds) : null, // ✅ NEW
    },
  });
  bustOfferPricingCaches();
  return NextResponse.json({ offer });
}

export async function DELETE(req: NextRequest) {
  const seller = await getSellerFromRequest(req);
  if (!seller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.sellerOffer.findFirst({ where: { id, sellerId: seller.id } });
  if (!existing) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  await db.sellerOffer.delete({ where: { id } });
  bustOfferPricingCaches();
  return NextResponse.json({ success: true });
}
