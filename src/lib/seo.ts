import type { Metadata } from "next";
import { APP_NAME, APP_URL } from "@/lib/constants";

interface SeoProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}

export function generateMetadata({
  title,
  description = "Shop from thousands of verified sellers on NexCart — India's premium multi-vendor marketplace.",
  image = `${APP_URL}/og-image.png`,
  url = APP_URL,
  type = "website",
  noIndex = false,
}: SeoProps): Metadata {
  const fullTitle = title.includes(APP_NAME) ? title : `${title} | ${APP_NAME}`;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(APP_URL),
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: APP_NAME,
      type,
      images: [{ url: image, width: 1200, height: 630, alt: fullTitle }],
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    alternates: { canonical: url },
  };
}

export function generateProductMetadata(product: {
  name: string;
  description: string;
  thumbnail?: string | null;
  productId: string;
  price: number;
}): Metadata {
  return generateMetadata({
    title: product.name,
    description: product.description.slice(0, 160),
    image: product.thumbnail ?? undefined,
    url: `${APP_URL}/product/${product.productId}`,
    type: "website",
  });
}

export function generateSellerMetadata(seller: {
  storeName: string;
  description?: string | null;
  logo?: string | null;
  sellerId: string;
}): Metadata {
  return generateMetadata({
    title: `${seller.storeName} — Official Store`,
    description: seller.description?.slice(0, 160) ?? `Shop from ${seller.storeName} on NexCart`,
    image: seller.logo ?? undefined,
    url: `${APP_URL}/store/${seller.sellerId}`,
  });
}
