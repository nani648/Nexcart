import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { revalidateTag } from "next/cache";

async function getSellerByUid(firebaseUid: string) {
  const user = await db.user.findUnique({
    where: { firebaseUid },
    select: { seller: { select: { id: true } } },
  });
  return user?.seller ?? null;
}

export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seller = await getSellerByUid(firebaseUid);
  if (!seller) return NextResponse.json({ error: "Not a seller" }, { status: 404 });

  // Use raw SQL — Prisma client may not have highlights regenerated yet
  const rows = (await db.$queryRawUnsafe(
    'SELECT highlights FROM "Seller" WHERE id = $1',
    seller.id
  )) as Array<{ highlights: string[] }>;
  return NextResponse.json({ highlights: rows[0]?.highlights ?? [] }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}

export async function PATCH(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seller = await getSellerByUid(firebaseUid);
  if (!seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const body = await req.json();
  const highlights: string[] = Array.isArray(body.highlights) ? body.highlights.filter((u: unknown) => typeof u === "string") : [];

  // Build a PostgreSQL array literal: {"url1","url2"} and cast to text[]
  const pgArrayLiteral = `{${highlights.map(url =>
    '"' + url.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'
  ).join(",")}}`;

  await db.$executeRawUnsafe(
    'UPDATE "Seller" SET highlights = $1::text[], "updatedAt" = NOW() WHERE id = $2',
    pgArrayLiteral,
    seller.id
  );

  revalidateTag("sellers");
  return NextResponse.json({ highlights });
}
