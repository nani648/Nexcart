import { getVerifiedUid } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { revalidateTag } from "next/cache";

interface Params { params: { id: string } }

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

async function requireAdmin(req: NextRequest) {
  const uid = await getVerifiedUid(req);
  if (!uid) return null;
  const user = await db.user.findUnique({ where: { firebaseUid: uid } });
  if (!user || (user as { role?: string }).role !== "ADMIN") return null;
  return user;
}

// PATCH /api/categories/[id] — admin only: update any field
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const category = await db.category.findUnique({ where: { id: params.id } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // If slug is being changed, check uniqueness
  if (parsed.data.slug && parsed.data.slug !== category.slug) {
    const slugExists = await db.category.findUnique({ where: { slug: parsed.data.slug } });
    if (slugExists) return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
  }

  const updated = await db.category.update({
    where: { id: params.id },
    data: parsed.data,
    include: { _count: { select: { products: true } } },
  });

  // A rename, icon change, or reorder should show up immediately — the
  // homepage and /categories/[category] pages are cached for up to an hour
  // and 5 minutes respectively.
  revalidateTag("categories");
  revalidateTag("homepage");

  return NextResponse.json(updated);
}

// DELETE /api/categories/[id] — admin only: soft delete (isActive: false)
export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const category = await db.category.findUnique({ where: { id: params.id } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const updated = await db.category.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  // Deactivating a category should pull it off the homepage and stop its
  // /categories/[category] page from showing it immediately, not after the
  // cache windows above happen to expire.
  revalidateTag("categories");
  revalidateTag("homepage");

  return NextResponse.json(updated);
}
