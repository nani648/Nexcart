import { NextRequest, NextResponse } from "next/server";
import { checkHandleAvailability, suggestAvailableHandles } from "@/lib/store-handle-db";
import { getClientIp } from "@/lib/rate-limit";
import { checkRateLimit, RATE_LIMITS } from "@/lib/ratelimit";

/**
 * GET /api/sellers/check-handle?handle=pickles_02
 *
 * Live availability check for the handle picker. Public by design — the signup
 * form needs it before a seller account exists — so it is rate limited and
 * returns nothing beyond a yes/no plus the normalised handle. It never reveals
 * which store owns a taken handle.
 */
export async function GET(req: NextRequest) {
  // 30 checks/minute/IP: comfortable for typing, useless for enumerating
  // every handle on the platform. Backed by Redis (lib/ratelimit) instead of
  // an in-process Map so the limit actually holds across serverless
  // instances/cold starts, not just within a single warm one.
  const rl = await checkRateLimit(`check-handle:${getClientIp(req)}`, RATE_LIMITS.checkHandle);
  if (!rl.success) {
    return NextResponse.json(
      { available: false, reason: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  const raw = new URL(req.url).searchParams.get("handle") ?? "";
  if (!raw.trim()) {
    return NextResponse.json(
      { available: false, reason: "Please enter a store handle." },
      { status: 400 }
    );
  }

  try {
    const result = await checkHandleAvailability(raw);

    // Only spend the extra lookup when the seller actually needs alternatives.
    const suggestions = result.available ? [] : await suggestAvailableHandles(raw);

    return NextResponse.json(
      { ...result, suggestions },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[check-handle] error:", error);
    return NextResponse.json(
      { available: false, reason: "Could not check availability. Try again." },
      { status: 500 }
    );
  }
}
