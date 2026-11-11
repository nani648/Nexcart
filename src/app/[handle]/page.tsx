import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { buildStoreMetadata, StoreView } from "@/lib/store-view";
import { resolveHandle } from "@/lib/store-handle-db";

export const revalidate = 60;

interface Props {
  params: { handle: string };
}

/**
 * Vanity storefront URL — nexcart.com/pickles_02
 *
 * ROUTING NOTE: this is a catch-all at the ROOT of the site, so it receives
 * every top-level path that does not match a real route. Next.js resolves
 * static segments before dynamic ones, so /cart, /search, /admin and friends
 * still win — which is exactly why RESERVED_HANDLES in `lib/store-handle.ts`
 * exists: a seller who managed to claim "cart" would own a store that is
 * permanently unreachable, with nothing in the logs to explain it.
 *
 * Consequence to be aware of: unmatched URLs (including genuine 404s such as
 * the not-yet-built /careers) now cost a handle lookup before rendering
 * not-found. `resolveHandle` rejects anything that cannot be a valid handle
 * without querying, which keeps bot and junk traffic cheap.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await resolveHandle(params.handle);
  if (resolved.kind === "unknown") return { title: "Store Not Found" };
  return buildStoreMetadata(resolved.sellerId);
}

export default async function StoreHandlePage({ params }: Props) {
  const resolved = await resolveHandle(params.handle);

  if (resolved.kind === "unknown") notFound();

  // Handle was renamed. Send shoppers to the current one so previously shared
  // links and printed QR codes keep working instead of dead-ending.
  if (resolved.kind === "retired") {
    permanentRedirect(
      resolved.currentHandle ? `/${resolved.currentHandle}` : `/store/${resolved.sellerId}`
    );
  }

  return <StoreView sellerId={resolved.sellerId} />;
}
