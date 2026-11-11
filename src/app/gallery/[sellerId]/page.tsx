export const revalidate = 300;

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import { GalleryClient } from "./GalleryClient";

interface Props { params: { sellerId: string } }

async function getGallery(sellerId: string) {
  try {
    const seller = await db.seller.findUnique({
      where: { sellerId, status: "APPROVED" },
      select: {
        sellerId: true, storeName: true, logo: true,
        galleryProductIds: true,
      },
    });
    if (!seller || seller.galleryProductIds.length === 0) return null;

    const products = await db.product.findMany({
      where: { id: { in: seller.galleryProductIds }, isActive: true },
      select: {
        id: true, productId: true, name: true, price: true, comparePrice: true,
        images: true, stock: true,
        variants: { select: { id: true, value: true, price: true } },
      },
    });

    // Preserve seller's chosen order
    const ordered = seller.galleryProductIds
      .map(id => products.find(p => p.id === id))
      .filter(Boolean) as typeof products;

    return { seller, products: ordered };
  } catch { return null; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getGallery(params.sellerId);
  if (!data) return { title: "Gallery Not Found" };
  return { title: `${data.seller.storeName} — Gallery | NexCart` };
}

export default async function GalleryPage({ params }: Props) {
  const data = await getGallery(params.sellerId);
  if (!data) notFound();
  return <GalleryClient seller={data.seller} products={data.products} />;
}
