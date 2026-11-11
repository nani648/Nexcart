import { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const revalidate = 3600; // regenerate sitemap at most once an hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexcart.vercel.app";

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/become-seller`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Best-effort: include active products and approved stores. If the DB is
  // unreachable at build time, fall back to the static entries only.
  try {
    const [products, sellers] = await Promise.all([
      db.product.findMany({
        where: { isActive: true },
        select: { productId: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5000,
      }),
      db.seller.findMany({
        where: { status: "APPROVED" },
        select: { sellerId: true, updatedAt: true },
        take: 2000,
      }),
    ]);

    const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${baseUrl}/product/${p.productId}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const storeEntries: MetadataRoute.Sitemap = sellers.map((s) => ({
      url: `${baseUrl}/store/${s.sellerId}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [...staticEntries, ...productEntries, ...storeEntries];
  } catch (error) {
    console.error("[sitemap] failed to load dynamic entries:", error);
    return staticEntries;
  }
}
