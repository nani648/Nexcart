import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidateTag } from "next/cache";

const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

// Admin helper — resolves firebaseUid → DB user and checks ADMIN role
async function requireAdmin(req: NextRequest) {
  const uid = await getVerifiedUid(req);
  if (!uid) return null;
  const user = await db.user.findUnique({ where: { firebaseUid: uid } });
  if (!user || (user as { role?: string }).role !== "ADMIN") return null;
  return user;
}

// GET /api/categories — public, returns all active categories
export async function GET() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(categories, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

// POST /api/categories — admin only: create a category
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Ensure slug is unique
  const existing = await db.category.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });

  const category = await db.category.create({ data: parsed.data });

  // Without this, a brand-new category wouldn't show up on the homepage
  // (1hr cache) or anywhere else until its cache windows happened to expire.
  revalidateTag("categories");
  revalidateTag("homepage");

  return NextResponse.json(category, { status: 201 });
}
