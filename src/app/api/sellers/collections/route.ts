import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import { revalidateTag } from "next/cache";
import { isCardFontKey } from "@/lib/card-designs";
import { isCollectionHeadingStyleKey } from "@/lib/collection-heading-styles";
import { isCollectionShapeKey } from "@/lib/collection-shapes";
import { isMissingColumnError } from "@/lib/pg-errors";

async function getSellerByUid(firebaseUid: string) {
  const user = await db.user.findUnique({
    where: { firebaseUid },
    select: { seller: { select: { id: true } } },
  });
  return user?.seller ?? null;
}

type CollectionRow = {
  id: string;
  name: string;
  image: string | null;
  filterTag: string;
  productIds: string;
  sortOrder: number;
  fontStyle: string | null;
  iconShape: string | null;
  createdAt: Date;
};

// "fontStyle" and "iconShape" are both newer, optional columns added via raw
// SQL migrations rather than schema.prisma (see collection-shapes.ts's file
// doc comment) — a migration file existing in the repo doesn't guarantee it
// has actually been run against a given database yet. This reads with both
// columns, and on a missing-column error retries in a loop, dropping
// whichever one column Postgres reports missing (not assumed in a fixed
// order — if BOTH are missing, which one gets reported first isn't
// guaranteed) until the query succeeds, rather than 500-ing the whole
// dashboard page over an optional field.
async function fetchCollectionRows(sellerId: string): Promise<CollectionRow[]> {
  let tryFontStyle = true;
  let tryIconShape = true;
  for (;;) {
    const cols = ["id", "name", "image", `"filterTag"`, `"productIds"`, `"sortOrder"`, `"createdAt"`]
      .concat(tryFontStyle ? [`"fontStyle"`] : [], tryIconShape ? [`"iconShape"`] : []);
    try {
      const rows = (await db.$queryRawUnsafe(
        `SELECT ${cols.join(", ")}
         FROM "StoreCollection"
         WHERE "sellerId" = $1
         ORDER BY "sortOrder" ASC, "createdAt" ASC`,
        sellerId
      )) as Array<Record<string, unknown>>;
      return rows.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        image: (r.image as string | null) ?? null,
        filterTag: r.filterTag as string,
        productIds: r.productIds as string,
        sortOrder: r.sortOrder as number,
        createdAt: r.createdAt as Date,
        fontStyle: tryFontStyle ? ((r.fontStyle as string | null) ?? null) : null,
        iconShape: tryIconShape ? ((r.iconShape as string | null) ?? null) : null,
      }));
    } catch (e) {
      if (tryIconShape && isMissingColumnError(e, "iconShape")) { tryIconShape = false; continue; }
      if (tryFontStyle && isMissingColumnError(e, "fontStyle")) { tryFontStyle = false; continue; }
      throw e;
    }
  }
}

export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seller = await getSellerByUid(firebaseUid);
  if (!seller) return NextResponse.json({ error: "Not a seller" }, { status: 404 });

  const rows = await fetchCollectionRows(seller.id);
  return NextResponse.json({ collections: rows }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}

export async function POST(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seller = await getSellerByUid(firebaseUid);
  if (!seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const filterTag = typeof body.filterTag === "string" ? body.filterTag.trim() : "";
  const image = typeof body.image === "string" ? body.image : null;
  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : 0;
  const productIds = Array.isArray(body.productIds) ? JSON.stringify(body.productIds) : "[]";
  // Invalid/unknown keys silently fall back to null (→ default font on the
  // storefront) rather than rejecting the whole request — a bad font choice
  // must never block creating the collection. Accepts either a plain
  // CARD_FONTS key or a decorative COLLECTION_HEADING_STYLES key.
  const fontStyle = (isCardFontKey(body.fontStyle) || isCollectionHeadingStyleKey(body.fontStyle)) ? body.fontStyle : null;
  // Same silently-fall-back-to-null treatment for the icon shape — an
  // invalid/unknown key must never block creating the collection, it just
  // means "classic circle" (see resolveCollectionShape's default).
  const iconShape = isCollectionShapeKey(body.iconShape) ? body.iconShape : null;

  if (!name || !filterTag) {
    return NextResponse.json({ error: "name and filterTag are required" }, { status: 400 });
  }

  // Same "column may not exist yet, don't assume which one Postgres reports
  // first" retry loop as fetchCollectionRows above.
  let tryFontStyle = true;
  let tryIconShape = true;
  let row: Record<string, unknown>;
  for (;;) {
    const cols = [`"sellerId"`, "name", "image", `"filterTag"`, `"productIds"`, `"sortOrder"`]
      .concat(tryFontStyle ? [`"fontStyle"`] : [], tryIconShape ? [`"iconShape"`] : []);
    const vals: unknown[] = [seller.id, name, image, filterTag, productIds, sortOrder];
    if (tryFontStyle) vals.push(fontStyle);
    if (tryIconShape) vals.push(iconShape);
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
    const returningCols = ["id", "name", "image", `"filterTag"`, `"productIds"`, `"sortOrder"`, `"createdAt"`]
      .concat(tryFontStyle ? [`"fontStyle"`] : [], tryIconShape ? [`"iconShape"`] : []);
    try {
      const rows = (await db.$queryRawUnsafe(
        `INSERT INTO "StoreCollection" (id, ${cols.join(", ")}, "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, ${placeholders}, NOW(), NOW())
         RETURNING ${returningCols.join(", ")}`,
        ...vals
      )) as Array<Record<string, unknown>>;
      row = rows[0];
      break;
    } catch (e) {
      if (tryIconShape && isMissingColumnError(e, "iconShape")) { tryIconShape = false; continue; }
      if (tryFontStyle && isMissingColumnError(e, "fontStyle")) { tryFontStyle = false; continue; }
      throw e;
    }
  }

  const collection: CollectionRow = {
    id: row.id as string,
    name: row.name as string,
    image: (row.image as string | null) ?? null,
    filterTag: row.filterTag as string,
    productIds: row.productIds as string,
    sortOrder: row.sortOrder as number,
    createdAt: row.createdAt as Date,
    fontStyle: tryFontStyle ? ((row.fontStyle as string | null) ?? null) : null,
    iconShape: tryIconShape ? ((row.iconShape as string | null) ?? null) : null,
  };
  revalidateTag("sellers");
  return NextResponse.json({ collection }, { status: 201 });
}
