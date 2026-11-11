import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";

export const revalidate = 300;

export const metadata = { title: "Trending Right Now — NexCart" };

export default async function TrendingPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let products: any[] = [];

  try {
    products = await db.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: {
        seller: { select: { sellerId: true, storeName: true } },
        variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
      },
      orderBy: { salesCount: "desc" },
      take: 48,
    });
  } catch {
    products = [];
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-orange-500">
        {/* Decorative elements — same as home page Trending section */}
        <div className="pointer-events-none fixed inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="pointer-events-none fixed -top-16 right-0 h-64 w-64 rounded-full bg-violet-500/20 blur-[70px]" />
        <div className="pointer-events-none fixed bottom-0 left-0 h-56 w-56 rounded-full bg-indigo-500/20 blur-[60px]" />
        <div className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-sky-400/10 blur-[50px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {/* Back link */}
          <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-black/60 hover:text-black transition-colors">
            <ChevronLeft className="h-4 w-4" /> Home
          </Link>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-[11px] font-black uppercase tracking-[0.28em] text-black mb-1">Most Popular</h2>
            <p className="text-[28px] font-black text-black tracking-tight">Trending Right Now</p>
          </div>

          {/* Empty state */}
          {products.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
              <p className="text-black/50 text-sm">No trending products right now. Check back soon!</p>
            </div>
          )}

          {/* Product grid */}
          {products.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  productId={p.productId}
                  name={p.name}
                  description={p.description}
                  price={p.price}
                  comparePrice={p.comparePrice}
                  image={p.images[0]}
                  images={p.images}
                  rating={p.rating}
                  reviewCount={p.reviewCount}
                  sellerId={p.seller.sellerId}
                  sellerName={p.seller.storeName}
                  stock={p.stock}
                  isFeatured
                  blackBorder
                  deliveryInfo={p.deliveryInfo ?? undefined}
                  condition={p.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"}
                  variants={p.variants}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
