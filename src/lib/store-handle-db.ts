/**
 * Database-side helpers for store handles.
 *
 * Kept separate from `store-handle.ts` (pure string logic, safe to import from
 * client components) because everything here touches Prisma and must stay
 * server-only.
 */
import { db } from "@/lib/db";
import { generateHandleCandidates, validateHandle } from "@/lib/store-handle";

export type HandleAvailability =
  | { available: true; handle: string }
  | { available: false; handle: string; reason: string };

/**
 * Is this handle free to claim?
 *
 * Checks, in order: shape/reserved-word rules, then the live `Seller` table,
 * then `StoreHandleHistory` — a retired handle stays reserved so that links
 * already shared keep redirecting to their original owner rather than silently
 * landing shoppers on a different seller's store.
 *
 * `ignoreSellerId` lets a seller re-submit their own current handle without it
 * being reported as taken by themselves.
 */
export async function checkHandleAvailability(
  rawHandle: string,
  ignoreSellerId?: string
): Promise<HandleAvailability> {
  const validation = validateHandle(rawHandle);
  if (!validation.ok) {
    return { available: false, handle: rawHandle, reason: validation.error };
  }
  const handle = validation.handle;

  const [owner, retired] = await Promise.all([
    db.seller.findUnique({
      where: { storeHandle: handle },
      select: { id: true },
    }),
    db.storeHandleHistory.findUnique({
      where: { handle },
      select: { sellerId: true },
    }),
  ]);

  if (owner && owner.id !== ignoreSellerId) {
    return { available: false, handle, reason: "That handle is already taken." };
  }
  if (retired && retired.sellerId !== ignoreSellerId) {
    return {
      available: false,
      handle,
      reason: "That handle was previously used by another store.",
    };
  }

  return { available: true, handle };
}

/**
 * Free alternatives to offer when the requested handle is unavailable.
 *
 * Deliberately checks every candidate in TWO queries using `in`, rather than
 * looping `checkHandleAvailability` per candidate — that would be 30 round
 * trips on an endpoint the signup form calls on every keystroke.
 */
export async function suggestAvailableHandles(
  rawHandle: string,
  limit = 3
): Promise<string[]> {
  const candidates = generateHandleCandidates(rawHandle);
  if (candidates.length === 0) return [];

  const [taken, retired] = await Promise.all([
    db.seller.findMany({
      where: { storeHandle: { in: candidates } },
      select: { storeHandle: true },
    }),
    db.storeHandleHistory.findMany({
      where: { handle: { in: candidates } },
      select: { handle: true },
    }),
  ]);

  const used = new Set<string>([
    ...taken.map((s: { storeHandle: string | null }) => s.storeHandle ?? ""),
    ...retired.map((r: { handle: string }) => r.handle),
  ]);

  return candidates.filter((c) => !used.has(c)).slice(0, limit);
}

export type ResolvedHandle =
  | { kind: "current"; sellerId: string }
  | { kind: "retired"; sellerId: string; currentHandle: string | null }
  | { kind: "unknown" };

/**
 * Resolve a URL handle to a seller.
 *
 * Returns "retired" when the handle only exists in history, so the caller can
 * issue a permanent redirect to the seller's current handle instead of a 404.
 */
export async function resolveHandle(rawHandle: string): Promise<ResolvedHandle> {
  const validation = validateHandle(rawHandle);
  // Anything that could never be a valid handle is not worth two queries —
  // this also keeps the root catch-all cheap for junk and bot traffic.
  if (!validation.ok) return { kind: "unknown" };
  const handle = validation.handle;

  const seller = await db.seller.findUnique({
    where: { storeHandle: handle },
    select: { sellerId: true },
  });
  if (seller) return { kind: "current", sellerId: seller.sellerId };

  const retired = await db.storeHandleHistory.findUnique({
    where: { handle },
    select: { seller: { select: { sellerId: true, storeHandle: true } } },
  });
  if (retired?.seller) {
    return {
      kind: "retired",
      sellerId: retired.seller.sellerId,
      currentHandle: retired.seller.storeHandle,
    };
  }

  return { kind: "unknown" };
}

/**
 * Assign a handle to a seller, parking the previous one in history.
 *
 * Runs in a transaction: the history row and the new handle must land together,
 * otherwise a crash between the two writes would either lose the redirect or
 * strand a reservation. Returns an error string instead of throwing so callers
 * can map it straight to a 4xx response.
 */
export async function setSellerHandle(
  sellerId: string,
  rawHandle: string
): Promise<{ ok: true; handle: string } | { ok: false; error: string }> {
  const availability = await checkHandleAvailability(rawHandle, sellerId);
  if (!availability.available) {
    return { ok: false, error: availability.reason };
  }
  const handle = availability.handle;

  const seller = await db.seller.findUnique({
    where: { id: sellerId },
    select: { storeHandle: true },
  });
  if (!seller) return { ok: false, error: "Seller not found." };

  // No-op if unchanged — avoids writing a pointless history row that would
  // then permanently reserve the handle against its own owner.
  if (seller.storeHandle === handle) return { ok: true, handle };

  try {
    await db.$transaction(async (tx) => {
      if (seller.storeHandle) {
        await tx.storeHandleHistory.upsert({
          where: { handle: seller.storeHandle },
          create: { handle: seller.storeHandle, sellerId },
          update: { sellerId },
        });
      }
      // If this seller is reclaiming a handle they previously retired, remove
      // the history row so it doesn't shadow the live handle on lookup.
      await tx.storeHandleHistory.deleteMany({ where: { handle } });

      await tx.seller.update({
        where: { id: sellerId },
        data: { storeHandle: handle },
      });
    });
  } catch {
    // Unique violation from a concurrent claim of the same handle.
    return { ok: false, error: "That handle was just taken. Please try another." };
  }

  return { ok: true, handle };
}
