import type { Metadata } from "next";
import { DesignManagerClient } from "@/components/seller/DesignManagerClient";
import { CardBorderSection } from "@/components/seller/CardBorderSection";
import { ImageSlideSection } from "@/components/seller/ImageSlideSection";

export const metadata: Metadata = { title: "Edit design" };

/**
 * Seller → Edit design.
 *
 * The manager fetches the seller's products itself from /api/sellers/products,
 * matching how the other dashboard screens work: the dashboard is an
 * authenticated client shell that attaches a Firebase token per request, so
 * there is no server session to read from here.
 */
export default function DesignPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit design</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how each product card looks on your storefront.
        </p>
      </div>

      <CardBorderSection />

      <ImageSlideSection />

      <DesignManagerClient />
    </div>
  );
}
