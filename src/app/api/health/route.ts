import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — lightweight health-check for uptime monitors.
 *
 * Returns 200 with { status: "ok" } when the app is up and the database is
 * reachable. Returns 503 with { status: "error" } if the DB query fails, so
 * uptime monitors (UptimeRobot, BetterStack, etc.) can alert on real outages.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    // Cheapest possible query to confirm the DB connection is alive.
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        dbLatencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/health] Database check failed:", err);
    return NextResponse.json(
      {
        status: "error",
        error: "Database unreachable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
