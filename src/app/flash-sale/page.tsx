import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Zap } from "lucide-react";
import { unstable_cache } from "next/cache";
import { FlashSaleClient } from "./FlashSaleClient";

export const metadata: Metadata = { title: "Flash Sale — NexCart" };
export const revalidate = 60;

const getFlashProducts = unstable_cache(
  // NOT catching DB errors here — see src/app/page.tsx for the full
  // reasoning. Letting a failure throw stops unstable_cache from storing a
  // transient blip as a cached "zero deals" result for 60 seconds.
  async () => {
    return db.product.findMany({
      where: { isFlashSale: true, isActive: true, stock: { gt: 0 } },
      select: {
        id: true, productId: true, name: true, description: true, price: true, comparePrice: true,
        images: true, stock: true, rating: true, reviewCount: true,
        condition: true, isFeatured: true, deliveryInfo: true,
        seller: { select: { sellerId: true, storeName: true } },
        variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
      },
      orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
      take: 60,
    });
  },
  ["flash-sale-page"],
  { revalidate: 60, tags: ["flash-sale", "products"] }
);

export default async function FlashSalePage() {
  // Catch here (per-request) so a transient DB error only ever shows the
  // "no deals" empty state to the one visitor who hit it, not every visitor
  // for the next 60 seconds via a poisoned cache.
  const products = await getFlashProducts().catch(() => []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black pb-16">
        {/* Hero banner */}
        <div className="relative overflow-hidden py-10 px-4 sm:px-6 text-center"
          style={{ background: "linear-gradient(135deg, #0d0900 0%, #1f1200 40%, #180d00 100%)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.25), transparent 70%)" }} />
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="h-6 w-6 text-amber-400 fill-amber-400" />
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-400/80">Limited Time</span>
              <Zap className="h-6 w-6 text-amber-400 fill-amber-400" />
            </div>
            <h1 className="text-[32px] sm:text-[48px] font-black text-white tracking-tight">⚡ Flash Sale</h1>
            <p className="mt-2 text-[14px] text-amber-200/60">Hand-picked deals from verified sellers — grab them before they&apos;re gone</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/30 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[12px] font-bold text-amber-300">{products.length} deals live now</span>
            </div>
          </div>
        </div>

        {/* Client component handles search + products */}
        <div className="mt-8 pb-16">
          {products.length === 0 ? (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col items-center justify-center gap-4 rounded-2xl border border-amber-900/30 bg-amber-950/10 py-20 text-center">
              <Zap className="h-14 w-14 text-amber-900/50" />
              <p className="text-[18px] font-bold text-white/80">No flash deals right now</p>
              <p className="text-[14px] text-white/40">Check back soon — sellers update deals frequently</p>
            </div>
          ) : (
            <FlashSaleClient products={products} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
