/**
 * Inventory Alert Cron
 * Schedule daily (e.g. "0 8 * * *") via Vercel Cron or external scheduler.
 * Sends a single email per seller listing all products with stock < 10.
 * Secured by CRON_SECRET env var.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendLowStockAlertEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all sellers with at least one low-stock product
  const lowStockProducts = await db.product.findMany({
    where: { stock: { lt: 10 }, isActive: true },
    include: {
      seller: {
        include: { user: { select: { email: true, name: true } } },
      },
    },
    orderBy: { stock: "asc" },
  });

  if (lowStockProducts.length === 0) {
    return NextResponse.json({ message: "No low-stock products found", notified: 0 });
  }

  // Group by seller
  const bySeller = new Map<
    string,
    { email: string; name: string; storeName: string; products: { name: string; stock: number }[] }
  >();

  for (const product of lowStockProducts) {
    const sellerId = product.sellerId;
    if (!bySeller.has(sellerId)) {
      bySeller.set(sellerId, {
        email: product.seller.user.email,
        name: product.seller.user.name ?? product.seller.storeName,
        storeName: product.seller.storeName,
        products: [],
      });
    }
    bySeller.get(sellerId)!.products.push({ name: product.name, stock: product.stock });
  }

  let notified = 0;
  for (const [, seller] of bySeller) {
    try {
      await sendLowStockAlertEmail({
        sellerEmail: seller.email,
        sellerName: seller.name,
        storeName: seller.storeName,
        products: seller.products,
      });
      notified++;
    } catch (err) {
      console.error(`[inventory-alerts] Failed to notify ${seller.email}:`, err);
    }
  }

  return NextResponse.json({
    message: `Low-stock alerts sent to ${notified} seller(s)`,
    notified,
    totalProducts: lowStockProducts.length,
  });
}
