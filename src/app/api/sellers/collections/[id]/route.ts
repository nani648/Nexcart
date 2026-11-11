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

type CollectionRow = { id: string; name: string; image: string | null; filterTag: string; productIds: string; sortOrder: number; fontStyle: string | null; iconShape: string | null };

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seller = await getSellerByUid(firebaseUid);
  if (!seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  const body = await req.json();
  const baseSetParts: string[] = [];
  const baseVals: unknown[] = [];

  if (typeof body.name === "string") { baseVals.push(body.name.trim()); baseSetParts.push(`name = $${baseVals.length}`); }
  if (typeof body.filterTag === "string") { baseVals.push(body.filterTag.trim()); baseSetParts.push(`"filterTag" = $${baseVals.length}`); }
  if (body.image !== undefined) { baseVals.push(body.image); baseSetParts.push(`image = $${baseVals.length}`); }
  if (Array.isArray(body.productIds)) { baseVals.push(JSON.stringify(body.productIds)); baseSetParts.push(`"productIds" = $${baseVals.length}`); }
  if (typeof body.sortOrder === "number") { baseVals.push(body.sortOrder); baseSetParts.push(`"sortOrder" = $${baseVals.length}`); }
  // `null` clears the font/shape back to their defaults; any other value
  // must be one of the known keys — anything else (typo, stale client,
  // tampering) is silently ignored rather than saved, so a bad value never
  // breaks the storefront.
  const includesFontStyle = body.fontStyle === null || isCardFontKey(body.fontStyle) || isCollectionHeadingStyleKey(body.fontStyle);
  const includesIconShape = body.iconShape === null || isCollectionShapeKey(body.iconShape);

  if (baseSetParts.length === 0 && !includesFontStyle && !includesIconShape) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // "fontStyle" and "iconShape" are both newer, optional columns that may
  // not exist on this database yet (see collection-shapes.ts's doc comment
  // — a migration file existing in the repo doesn't mean it's been run).
  // Rather than assume which one Postgres would complain about first if
  // BOTH are missing, this retries in a loop: try with everything the
  // request asked for, and on a missing-column error for either one, drop
  // just that SET clause (and its RETURNING column) and try again — so the
  // update still succeeds for whichever fields ARE supported, regardless of
  // which column the database happens to report as missing first.
  let tryFontStyle = includesFontStyle;
  let tryIconShape = includesIconShape;

  for (;;) {
    const setParts = [...baseSetParts];
    const vals = [...baseVals];
    if (tryFontStyle) { vals.push(body.fontStyle); setParts.push(`"fontStyle" = $${vals.length}`); }
    if (tryIconShape) { vals.push(body.iconShape); setParts.push(`"iconShape" = $${vals.length}`); }
    if (setParts.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    vals.push(params.id, seller.id);
    const idIdx = vals.length - 1;
    const sellerIdx = vals.length;
    const returningCols = ["id", "name", "image", `"filterTag"`, `"productIds"`, `"sortOrder"`]
      .concat(tryFontStyle ? [`"fontStyle"`] : [], tryIconShape ? [`"iconShape"`] : [])
      .join(", ");

    try {
      const rows = (await db.$queryRawUnsafe(
        `UPDATE "StoreCollection"
         SET ${setParts.join(", ")}, "updatedAt" = NOW()
         WHERE id = $${idIdx} AND "sellerId" = $${sellerIdx}
         RETURNING ${returningCols}`,
        ...vals
      )) as Array<Record<string, unknown>>;

      if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const row = rows[0];
      const collection: CollectionRow = {
        id: row.id as string,
        name: row.name as string,
        image: (row.image as string | null) ?? null,
        filterTag: row.filterTag as string,
        productIds: row.productIds as string,
        sortOrder: row.sortOrder as number,
        fontStyle: tryFontStyle ? ((row.fontStyle as string | null) ?? null) : null,
        iconShape: tryIconShape ? ((row.iconShape as string | null) ?? null) : null,
      };
      revalidateTag("sellers");
      return NextResponse.json({ collection });
    } catch (e) {
      if (tryIconShape && isMissingColumnError(e, "iconShape")) { tryIconShape = false; continue; }
      if (tryFontStyle && isMissingColumnError(e, "fontStyle")) { tryFontStyle = false; continue; }
      throw e;
    }
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seller = await getSellerByUid(firebaseUid);
  if (!seller) return NextResponse.json({ error: "Not a seller" }, { status: 403 });

  await db.$executeRawUnsafe(
    `DELETE FROM "StoreCollection" WHERE id = $1 AND "sellerId" = $2`,
    params.id, seller.id
  );
  revalidateTag("sellers");
  return NextResponse.json({ ok: true });
}
