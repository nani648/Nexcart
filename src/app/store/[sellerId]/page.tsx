import { permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getSeller, buildStoreMetadata, StoreView } from "@/lib/store-view";

export const revalidate = 60;

interface Props {
  params: { sellerId: string };
}

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return buildStoreMetadata(params.sellerId);
}

/**
 * Legacy storefront URL.
 *
 * This route must live forever: sellers download and PRINT QR codes generated
 * from /store/<sellerId>, and those codes cannot be recalled. When the seller
 * has since claimed a vanity handle we permanently redirect so printed codes
 * still work and search engines consolidate on the pretty URL. Sellers without
 * a handle keep being served here directly.
 */
export default async function StorePage({ params }: Props) {
  const seller = await getSeller(params.sellerId);

  if (seller?.storeHandle) {
    permanentRedirect(`/${seller.storeHandle}`);
  }

  return <StoreView sellerId={params.sellerId} />;
}
