import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/catalog-sync";

/**
 * GET /api/cron/sync
 *
 * Called by Vercel Cron (see vercel.json). Protected by CRON_SECRET so
 * random people can't trigger syncs. Vercel automatically sends the secret
 * as a Bearer token in the Authorization header when it fires the cron.
 */
export const maxDuration = 60; // seconds — Vercel Pro allows up to 60s for cron

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSync();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron/sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
