import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import { FlashSaleClient } from "./FlashSaleClient";
import { parseStoreColor } from "@/lib/store-color";

interface Props { params: { sellerId: string } }

const BANNER_COLORS = ["#6d28d9","#2563eb","#dc2626","#d97706","#16a34a","#db2777","#0891b2","#ea580c","#7c3aed","#0f766e"];
function getBannerColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) { h = id.charCodeAt(i) + ((h << 5) - h); h |= 0; }
  return BANNER_COLORS[Math.abs(h) % BANNER_COLORS.length];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const seller = await db.seller.findUnique({ where: { sellerId: params.sellerId, status: "APPROVED" }, select: { storeName: true } });
  return { title: `⚡ Flash Sale — ${seller?.storeName ?? "Store"} | NexCart` };
}

export default async function FlashSaleOfferPage({ params }: Props) {
  const seller = await db.seller.findUnique({
    where: { sellerId: params.sellerId, status: "APPROVED" },
    select: { id: true, storeName: true, sellerId: true, storeColor: true, scrollingDesign: true },
  });
  if (!seller) notFound();

  const products = await db.product.findMany({
    where: { sellerId: seller.id, isActive: true, isFlashSale: true },
    include: {
      category: true,
      variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
    },
    orderBy: { salesCount: "desc" },
  });

  // storeColor may be a flat hex or a "#hex,#hex" gradient picked in Settings —
  // this page only takes one accent colour, so use the primary/first stop.
  const color = parseStoreColor(seller.storeColor)?.primary ?? getBannerColor(seller.sellerId);

  const serialized = products.map(p => ({
    id: p.id,
    productId: p.productId,
    name: p.name,
    price: p.price,
    comparePrice: p.comparePrice,
    images: p.images,
    rating: p.rating,
    reviewCount: p.reviewCount,
    stock: p.stock,
    isFeatured: p.isFeatured,
    condition: p.condition,
    deliveryInfo: p.deliveryInfo,
    variants: p.variants,
  }));

  return (
    <main className="min-h-screen" style={{ background: `linear-gradient(180deg, ${color}22 0%, #ffffff 40%)` }}>
      <FlashSaleClient
        products={serialized}
        sellerId={seller.sellerId}
        storeName={seller.storeName}
        color={color}
        scrollingDesign={seller.scrollingDesign as { enabled?: boolean; effect?: string | null } | null}
      />
    </main>
  );
}
