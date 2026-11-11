import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface Ctx { params: { sellerId: string } }

// POST /api/sellers/[sellerId]/viewing
// Called every 30s by every visitor on a store page.
// Uses raw SQL UPSERT so updatedAt is guaranteed to refresh on every ping.
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId } = body as { sessionId?: string };
    if (!sessionId) return NextResponse.json({ count: 1 });

    const seller = await db.seller.findUnique({
      where: { sellerId: params.sellerId },
      select: { id: true },
    });
    if (!seller) return NextResponse.json({ count: 0 });

    // Raw SQL UPSERT — bypasses Prisma ORM so updatedAt is ALWAYS refreshed
    const newId = `c${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    await db.$executeRaw`
      INSERT INTO "StoreView" (id, "sellerId", "sessionId", "updatedAt")
      VALUES (${newId}, ${seller.id}, ${sessionId}, NOW())
      ON CONFLICT ("sellerId", "sessionId") DO UPDATE SET "updatedAt" = NOW()
    `;

    // Count viewers active within the last 3 minutes
    const rows = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::int AS count FROM "StoreView"
      WHERE "sellerId" = ${seller.id}
      AND "updatedAt" >= NOW() - INTERVAL '3 minutes'
    `;
    const count = Number(rows[0]?.count ?? 1);

    // 10% chance: clean up sessions older than 10 minutes to keep table tidy
    if (Math.random() < 0.1) {
      db.$executeRaw`
        DELETE FROM "StoreView"
        WHERE "sellerId" = ${seller.id}
        AND "updatedAt" < NOW() - INTERVAL '10 minutes'
      `.catch(() => {});
    }

    return NextResponse.json({ count: Math.max(1, count) });
  } catch (err) {
    console.error("[POST /api/sellers/[sellerId]/viewing]", err);
    return NextResponse.json({ count: 1 });
  }
}
