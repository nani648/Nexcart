import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";

export const revalidate = 300;

export const metadata = { title: "New Arrivals — NexCart" };

export default async function NewArrivalsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let products: any[] = [];

  try {
    products = await db.product.findMany({
      where: { isActive: true },
      include: {
        seller: { select: { sellerId: true, storeName: true } },
        variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 48,
    });
  } catch {
    products = [];
  }

  return (
    <>
      <Navbar />
      <main
        className="min-h-screen"
        style={{ background: "linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%)" }}
      >
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {/* Back link */}
          <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Home
          </Link>

          {/* Header — same style as home page section */}
          <div className="mb-7">
            <div className="mb-2 inline-flex items-center gap-[5px] rounded-full px-[10px] py-[4px] bg-white/60" style={{ border: "0.5px solid #d1d5db" }}>
              <span className="inline-block h-[5px] w-[5px] rounded-full bg-emerald-500" />
              <span className="text-[9px] uppercase tracking-[0.15em] text-zinc-400">Just added</span>
            </div>
            <h1 className="text-[28px] font-bold tracking-[-0.02em] leading-none text-zinc-900">New Arrivals</h1>
          </div>

          {/* Empty state */}
          {products.length === 0 && (
            <div className="flex min-h-[300px] items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.5)", border: "0.5px solid #e4e4e7" }}>
              <div className="text-center">
                <p className="text-[13px] text-zinc-400 mb-3">No products yet — be the first seller!</p>
                <Link href="/become-seller" className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-white" style={{ background: "#18181b", borderRadius: 4 }}>
                  Start Selling
                </Link>
              </div>
            </div>
          )}

          {/* Product grid */}
          {products.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  productId={p.productId}
                  name={p.name}
                  description={p.description}
                  price={p.price}
                  comparePrice={p.comparePrice}
                  image={p.images?.[0]}
                  images={p.images}
                  rating={p.rating}
                  reviewCount={p.reviewCount}
                  sellerId={p.seller.sellerId}
                  sellerName={p.seller.storeName}
                  stock={p.stock}
                  isNew
                  blackBorder
                  buyNowGradient="linear-gradient(135deg, #0284c7, #0369a1)"
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
