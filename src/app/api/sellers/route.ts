import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sellerRegistrationSchema } from "@/lib/validations";
import { generateSellerId } from "@/lib/utils";
import { getVerifiedUid } from "@/lib/auth";
import { stripHtml } from "@/lib/sanitize";
import { checkHandleAvailability } from "@/lib/store-handle-db";
import type { Prisma } from "@prisma/client";

// Register as seller
export async function POST(req: NextRequest) {
  // Rate limit: 3 registrations per hour per IP
  const limited = await rateLimit(req, RATE_LIMITS.sellerRegister);
  if (limited) return limited;

  try {
    const firebaseUid = await getVerifiedUid(req);
    if (!firebaseUid) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in first" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = sellerRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Find user by firebaseUid — auto-create if missing (race condition on first login)
    let user = await db.user.findUnique({ where: { firebaseUid } });

    if (!user) {
      // User not synced to DB yet — create them now using info sent from client
      const { email, name } = parsed.data as typeof parsed.data & {
        email?: string;
        name?: string;
      };
      user = await db.user.create({
        data: {
          firebaseUid,
          email: email ?? `${firebaseUid}@unknown.com`,
          name: name ?? null,
          role: "CUSTOMER",
        },
      });
    }

    if (user.role === "SELLER") {
      return NextResponse.json(
        { error: "You are already registered as a seller" },
        { status: 400 }
      );
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admin accounts cannot register as sellers" },
        { status: 400 }
      );
    }

    // Check store name not taken
    const existingStore = await db.seller.findFirst({
      where: {
        storeName: { equals: parsed.data.storeName, mode: "insensitive" },
      },
    });
    if (existingStore) {
      return NextResponse.json(
        { error: "Store name already taken. Please choose another." },
        { status: 400 }
      );
    }

    // Vanity handle (nexcart.com/<handle>). Optional at signup — a seller who
    // skips it keeps working on /store/<sellerId> and can claim one later from
    // Settings. Shape and reserved-word checks already ran in the schema; this
    // is the uniqueness check, re-verified inside the transaction below by the
    // unique constraint.
    const requestedHandle =
      typeof parsed.data.storeHandle === "string" && parsed.data.storeHandle
        ? parsed.data.storeHandle
        : null;

    if (requestedHandle) {
      const availability = await checkHandleAvailability(requestedHandle);
      if (!availability.available) {
        return NextResponse.json({ error: availability.reason }, { status: 400 });
      }
    }

    const sellerId = generateSellerId();

    const seller = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update user role to SELLER
      await tx.user.update({
        where: { id: user!.id },
        data: { role: "SELLER" },
      });

      // Create seller profile
      const s = await tx.seller.create({
        data: {
          userId: user!.id,
          sellerId,
          storeName: stripHtml(parsed.data.storeName),
          storeHandle: requestedHandle,
          description: parsed.data.description ? stripHtml(parsed.data.description) : null,
          gstin: parsed.data.gstin ? parsed.data.gstin.trim().toUpperCase() : null,
          status: "PENDING",
        },
      });

      return s;
    });

    return NextResponse.json(
      {
        success: true,
        seller: {
          id: seller.id,
          sellerId: seller.sellerId,
          storeHandle: seller.storeHandle,
          storeName: seller.storeName,
          status: seller.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // P2002 = unique constraint violation. The availability check above is
    // advisory only; two sellers submitting the same handle at once both pass
    // it and one loses at the DB. Report that as a field error rather than a
    // generic 500 the seller can do nothing with.
    const code = (error as { code?: string } | null)?.code;
    const target = String((error as { meta?: { target?: unknown } } | null)?.meta?.target ?? "");
    if (code === "P2002" && target.includes("storeHandle")) {
      return NextResponse.json(
        { error: "That handle was just taken. Please choose another." },
        { status: 400 }
      );
    }

    console.error("POST /api/sellers error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}

// Get seller public listing
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const [sellers, total] = await Promise.all([
      db.seller.findMany({
        where: { status: "APPROVED" },
        include: {
          _count: { select: { products: true } },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { rating: "desc" },
      }),
      db.seller.count({ where: { status: "APPROVED" } }),
    ]);

    return NextResponse.json({
      sellers,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/sellers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sellers" },
      { status: 500 }
    );
  }
}
