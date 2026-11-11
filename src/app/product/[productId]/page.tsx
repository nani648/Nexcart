import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, BadgeCheck, ShieldCheck, Star, Package2, Truck } from "lucide-react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { formatPrice } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { ImageGallery } from "@/components/product/ImageGallery";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import { ProductPageClient } from "@/components/product/ProductPageClient";
import { SpecsTable } from "@/components/product/SpecsTable";
import { OffersCarousel } from "@/components/product/OffersCarousel";
import { computeEffectivePrice } from "@/lib/offer-pricing";

export const revalidate = 60;

interface Props { params: { productId: string } }

const getProduct = unstable_cache(
  // NOT catching DB errors here — see src/app/page.tsx for the full
  // reasoning. A transient failure must throw so unstable_cache never
  // stores it as a cached "product not found" for 60 seconds.
  async (productId: string) => {
    return db.product.findUnique({
      where: { productId },
      include: {
        seller: { include: { _count: { select: { products: true } } } },
        category: true,
        variants: true,
        reviews: {
          include: { user: { select: { name: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  },
  ["product-detail"],
  { revalidate: 60, tags: ["products"] }
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Catch here (per-request) — generateMetadata must never throw, and a DB
  // hiccup isn't the same thing as "this product doesn't exist".
  const product = await getProduct(params.productId).catch(() => null);
  if (!product) return { title: "Not Found" };
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexcart.vercel.app";
  return {
    title: `${product.name} | NexCart`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: [{ url: `${baseUrl}/api/og/product/${product.productId}`, width: 1200, height: 630 }],
    },
  };
}

function ProductJsonLd({ product, baseUrl }: {
  product: NonNullable<Awaited<ReturnType<typeof getProduct>>>;
  baseUrl: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product",
    name: product.name, description: product.description, image: product.images,
    sku: product.productId, url: `${baseUrl}/product/${product.productId}`,
    brand: { "@type": "Brand", name: product.seller.storeName },
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(2), priceCurrency: "INR", // stored in rupees, not paise
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}

export default async function ProductPage({ params }: Props) {
  // Catch here (per-request), not inside getProduct — keeps a transient DB
  // error from ever being written into the 60-second cache as a fake
  // "not found". Falling back to notFound() on error matches this page's
  // pre-existing behaviour, just no longer sticky-cached.
  const product = await getProduct(params.productId).catch(() => null);
  if (!product) notFound();


  let relatedProducts = await db.product.findMany({
    where: { isActive: true, NOT: { id: product.id }, ...(product.categoryId ? { categoryId: product.categoryId } : { sellerId: product.sellerId }) },
    include: {
      seller: { select: { sellerId: true, storeName: true } },
      variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
    },
    take: 6, orderBy: { salesCount: "desc" },
  });

  if (relatedProducts.length < 4 && product.categoryId) {
    const existingIds = new Set([product.id, ...relatedProducts.map(p => p.id)]);
    const extra = await db.product.findMany({
      where: { sellerId: product.sellerId, isActive: true, NOT: { id: { in: Array.from(existingIds) } } },
      include: {
        seller: { select: { sellerId: true, storeName: true } },
        variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
      },
      take: 6 - relatedProducts.length, orderBy: { salesCount: "desc" },
    });
    relatedProducts = [...relatedProducts, ...extra];
  }

  const productOffers = await db.sellerOffer.findMany({
    where: { sellerId: product.sellerId, isActive: true, linkedProductId: product.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 6,
  });
  const sellerWideOffers = await db.sellerOffer.findMany({
    where: { sellerId: product.sellerId, isActive: true, linkedProductId: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: Math.max(0, 6 - productOffers.length),
  });
  const realOffers = [...productOffers, ...sellerWideOffers].slice(0, 6);

  // Pricing must consider EVERY active offer, not just the 6 shown in the
  // carousel above — fetched separately (uncapped) so a 7th+ active offer
  // still counts toward the stacked price even though it isn't displayed
  // in the Promotions list. Stacks additively on top of this product's own
  // price/comparePrice discount — see offer-pricing.ts for the exact math,
  // and src/app/api/orders/route.ts for the authoritative checkout-time
  // version of this same calculation.
  const pricingOffers = await db.sellerOffer.findMany({
    where: {
      sellerId: product.sellerId,
      isActive: true,
      offerType: { in: ["PERCENT_OFF", "FLAT_OFF"] },
      OR: [{ linkedProductId: product.id }, { linkedProductId: null }],
    },
    select: { offerType: true, discountVal: true },
  });
  const effectivePricing = computeEffectivePrice(product.price, product.comparePrice, pricingOffers);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexcart.vercel.app";

  const rawSpecs = (product.specifications as Record<string, unknown>) || {};
  const brandVal      = (rawSpecs._brand as string) || "";
  const modelVal      = (rawSpecs._modelNumber as string) || "";
  const countryVal    = (rawSpecs._countryOfOrigin as string) || "India";
  const warrantyVal   = (rawSpecs._warranty as string) || "";
  const warrantyType  = (rawSpecs._warrantyType as string) || "";
  const featureBullets: string[] = Array.isArray(rawSpecs._featureBullets)
    ? (rawSpecs._featureBullets as string[]).filter(Boolean) : [];
  const inTheBox: string[] = Array.isArray(rawSpecs._inTheBox)
    ? (rawSpecs._inTheBox as string[]).filter(Boolean) : [];

  const pureSpecs: [string, string][] = Object.entries(rawSpecs)
    .filter(([k, v]) => !k.startsWith("_") && v && String(v).trim())
    .map(([k, v]) => [
      k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim(),
      String(v),
    ]);

  const techDetails: [string, string][] = [
    ...(brandVal ? [["Brand", brandVal] as [string, string]] : []),
    ...(modelVal ? [["Model Name", modelVal] as [string, string]] : []),
    ...pureSpecs,
    ...(warrantyVal ? [[(warrantyType || "Warranty"), warrantyVal] as [string, string]] : []),
    ...(countryVal ? [["Country of Origin", countryVal] as [string, string]] : []),
    ...(inTheBox.length ? [["What's in the Box", inTheBox.join(", ")] as [string, string]] : []),
  ];

  const aboutBullets: string[] = featureBullets.length >= 1
    ? featureBullets
    : product.description.split(/\n/).filter(Boolean).slice(0, 6);

  return (
    <>
      <ProductJsonLd product={product} baseUrl={baseUrl} />
      <Navbar />

      <main className="min-h-screen bg-[hsl(214_32%_98%)] dark:bg-[hsl(220_17%_4%)]">

        {/* ── Breadcrumb ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[hsl(220_17%_6%)] border-b border-border/30">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-2.5">
            <nav className="flex items-center gap-1 text-[11.5px] text-muted-foreground flex-wrap">
              <Link href="/" className="hover:text-foreground transition-colors font-medium">Home</Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
              {product.category && (
                <>
                  <Link href={`/search?category=${product.category.slug}`} className="hover:text-foreground transition-colors capitalize">{product.category.name}</Link>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                </>
              )}
              {brandVal && (
                <>
                  <span className="text-foreground/60 font-medium">{brandVal}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                </>
              )}
              <span className="text-foreground/70 line-clamp-1 max-w-[260px]">{product.name}</span>
            </nav>
          </div>
        </div>

        {/* ── MAIN 2-COLUMN LAYOUT ────────────────────────────────── */}
        <div className="mx-auto max-w-[1400px] grid grid-cols-1 lg:grid-cols-[1fr_1fr]">

          {/* LEFT — Clean sticky gallery panel */}
          <div className="relative lg:sticky lg:top-[68px] lg:self-start lg:h-[calc(100vh-68px)] bg-[#f6f7f9] dark:bg-[hsl(220_17%_7%)] border-b lg:border-b-0 lg:border-r border-border/20 overflow-hidden">
            <div className="relative w-full h-full">
              <ImageGallery
                images={product.images}
                productName={product.name}
                productId={product.id}
                price={effectivePricing.price}
                sellerId={product.seller.sellerId}
                variants={product.variants.map(v => {
                  let combo: Record<string, string> | null = null;
                  try { const p = JSON.parse(v.value); if (p && typeof p === "object" && !Array.isArray(p)) combo = p as Record<string,string>; } catch {}
                  return { ...v, combo };
                })}
                variantImages={(product as unknown as { variantImages?: Record<string, { front?: string; back?: string } | string> }).variantImages ?? {}}
              />
            </div>
          </div>

          {/* RIGHT — Product Info + Buy Box */}
          <div className="bg-white dark:bg-[hsl(220_17%_5%)] px-5 py-7 sm:px-8 lg:px-10 lg:py-10 space-y-6 overflow-x-hidden">

            {/* Seller pill */}
            <Link
              href={`/store/${product.seller.sellerId}`}
              className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[12px] font-bold text-primary hover:bg-primary/15 transition-colors"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-black shrink-0">
                {product.seller.storeName[0]?.toUpperCase()}
              </span>
              {product.seller.storeName}
              <ChevronRight className="h-3 w-3 opacity-60" />
            </Link>

            {/* Product Title + meta */}
            <div className="space-y-3">
              <h1 className="text-[24px] sm:text-[28px] font-black leading-[1.15] text-foreground tracking-tight">
                {product.name}
              </h1>

              {/* Brand / Model / Condition chips */}
              {(brandVal || modelVal || product.condition !== "ORIGINAL") && (
                <div className="flex flex-wrap items-center gap-2">
                  {brandVal && (
                    <span className="rounded-full border border-border/60 bg-muted/50 px-3 py-0.5 text-[11px] font-semibold text-foreground/70">
                      {brandVal}
                    </span>
                  )}
                  {modelVal && (
                    <span className="rounded-full border border-border/60 bg-muted/50 px-3 py-0.5 text-[11px] font-semibold text-foreground/70">
                      {modelVal}
                    </span>
                  )}
                  {product.condition !== "ORIGINAL" && (
                    <span className="rounded-full border border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 px-3 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                      {product.condition === "REFURBISHED" ? "Refurbished" : "Box Open"}
                    </span>
                  )}
                </div>
              )}

              {/* Rating */}
              {product.reviewCount > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[12px] font-black text-white shadow-sm shadow-emerald-600/30">
                    {product.rating.toFixed(1)} <Star className="h-3 w-3 fill-white text-white" />
                  </span>
                  <a href="#reviews" className="text-[12px] text-primary hover:underline font-semibold">
                    {product.reviewCount.toLocaleString("en-IN")} ratings
                  </a>
                  {product.isFeatured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/40 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-400">
                      <BadgeCheck className="h-3 w-3" />NexCart Assured
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="h-px bg-gradient-to-r from-border/60 via-border/20 to-transparent" />

            {/* ── BUY BOX ─────────────────────────────────────── */}
            <ProductPageClient
              productId={product.id}
              productName={product.name}
              productImage={product.images[0] || "/placeholder-product.jpg"}
              sellerId={product.seller.sellerId}
              sellerName={product.seller.storeName}
              price={effectivePricing.price}
              comparePrice={effectivePricing.comparePrice}
              stock={product.stock}
              variantImages={(product as unknown as { variantImages?: Record<string, string> }).variantImages ?? {}}
              variants={product.variants.map((v) => {
                let combo: Record<string, string> | null = null;
                try {
                  const parsed = JSON.parse(v.value);
                  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) combo = parsed as Record<string, string>;
                } catch { /* not JSON */ }
                return { ...v, combo };
              })}
            />

            {product.deliveryInfo && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-3 py-2.5">
                <Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">{product.deliveryInfo}</span>
              </div>
            )}

            <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

            {/* ── OFFERS ──────────────────────────────────────── */}
            {realOffers.length > 0 && (
              <div className="rounded-3xl border-[3px] border-purple-400 bg-purple-50 p-6">
                <div className="mb-5">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-500 mb-2">Promotions</h2>
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-2 text-[15px] font-black text-white shadow-lg shadow-purple-500/30">Available Offers</span>
                </div>
                <OffersCarousel offers={realOffers.map((o) => ({
                  id: o.id, title: o.title, description: o.description, offerType: o.offerType,
                  discountVal: o.discountVal, buyQty: o.buyQty, getQty: o.getQty,
                }))} />
              </div>
            )}

            {/* ── ABOUT THIS ITEM ─────────────────────────────── */}
            <div className="rounded-3xl border-[3px] border-indigo-500 bg-indigo-950 p-6">
              <div className="mb-5">
                <h2 className="text-[10px] font-black uppercase tracking-[0.28em] text-white mb-1">Product</h2>
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-2 text-[15px] font-black text-white shadow-lg shadow-indigo-500/30">About This Item</span>
              </div>
              <ul className="space-y-2">
                {aboutBullets.map((bullet, i) => (
                  <li key={i} className="group flex items-start gap-3 rounded-xl border border-transparent px-4 py-3 transition-all duration-200 hover:border-indigo-700 hover:bg-indigo-900 cursor-default">
                    <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[10px] font-black mt-0.5 transition-all duration-200 group-hover:shadow-md group-hover:shadow-indigo-500/50">
                      {i + 1}
                    </div>
                    <p className="text-[13px] leading-relaxed transition-colors duration-200" style={{ color: "#ffffff" }}>
                      {bullet}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── DESCRIPTION ─────────────────────────────────── */}
            {product.description && (
              <div className="rounded-3xl border-[3px] border-emerald-500 bg-emerald-950 p-6">
                <div className="mb-5">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-400 mb-1">Details</h2>
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2 text-[15px] font-black text-white shadow-lg shadow-emerald-500/30">Product Description</span>
                </div>
                <p className="text-[13.5px] text-emerald-100 leading-[1.9] whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* ── SELLER CARD ─────────────────────────────────── */}
            <Link href={`/store/${product.seller.sellerId}`} className="mt-6 block">
              <div className="flex items-center gap-4 rounded-2xl border border-rose-400 bg-rose-600 p-4 hover:bg-rose-700 transition-all group">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white text-[20px] font-black">
                  {product.seller.storeName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-black text-white">{product.seller.storeName}</p>
                  <p className="text-[11px] font-medium text-white/75 mt-0.5">{product.seller._count.products} products listed</p>
                </div>
                <span className="text-[12px] font-bold text-white shrink-0">Visit Store →</span>
              </div>
            </Link>

            {/* Warranty + Assured */}
            <div className="flex flex-col gap-2.5">
              {warrantyVal && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-400 bg-amber-500 px-4 py-3">
                  <ShieldCheck className="h-4.5 w-4.5 text-black shrink-0" />
                  <span className="text-[12px] text-black">
                    <span className="font-bold text-black">{warrantyType || "Warranty"}:</span> {warrantyVal}
                  </span>
                </div>
              )}
              {product.isFeatured && (
                <div className="flex items-center gap-3 rounded-xl border border-indigo-200/50 dark:border-indigo-800/30 bg-indigo-50/80 dark:bg-indigo-950/15 px-4 py-3">
                  <BadgeCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="text-[12px] font-bold text-indigo-700 dark:text-indigo-300">NexCart Assured — Verified Quality & Authentic Seller</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BELOW THE FOLD ──────────────────────────────────────── */}
        <div className="border-t border-border/30 bg-[hsl(214_32%_98%)] dark:bg-[hsl(220_17%_5%)]">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-14 space-y-16">


            {/* Technical Specs */}
            <section>
              <div className="rounded-3xl border-[3px] border-sky-500 bg-sky-950 p-6">
                <div className="mb-6">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.28em] text-sky-400 mb-2">Specifications</h2>
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-2 text-[15px] font-black text-white shadow-lg shadow-sky-500/30">Technical Details</span>
                </div>
                <SpecsTable specs={techDetails} />
              </div>
            </section>

            {/* Reviews */}
            <ReviewsSection
              productId={product.productId}
              initialReviews={product.reviews.map(r => ({
                id: r.id, rating: r.rating, title: r.title, body: r.body,
                createdAt: r.createdAt.toISOString(),
                user: { name: r.user.name, avatar: r.user.avatar },
              }))}
              initialRating={product.rating}
              initialReviewCount={product.reviewCount}
            />

            {/* Similar Products */}
            {relatedProducts.length > 0 && (
              <section className="pb-6">
                <div className="relative overflow-hidden rounded-3xl border-[3px] border-orange-500 bg-orange-500 backdrop-blur-2xl p-6 shadow-[0_20px_80px_rgba(99,102,241,0.18),0_8px_32px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(255,255,255,0.08)]">
                  {/* Top highlight edge */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  {/* Bottom dark edge */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-black/10 to-transparent" />
                  {/* Inner glass sheen diagonal */}
                  <div className="pointer-events-none absolute -top-1/2 -left-1/2 w-full h-full rotate-12 bg-gradient-to-br from-white/20 via-white/5 to-transparent rounded-full blur-2xl" />
                  {/* Glow orbs */}
                  <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-violet-500/20 blur-[70px]" />
                  <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-indigo-500/20 blur-[60px]" />
                  <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-sky-400/10 blur-[50px]" />

                  <div className="relative mb-6">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.28em] text-black mb-1">You May Also Like</h2>
                    <p className="text-[22px] font-black text-black tracking-tight">Similar Products</p>
                  </div>

                  <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {relatedProducts.map((p: any) => (
                    <ProductCard
                      key={p.id}
                      id={p.id}
                      productId={p.productId}
                      name={p.name}
                      description={p.description}
                      price={p.price}
                      comparePrice={p.comparePrice}
                      image={p.images?.[0] ?? "/placeholder-product.jpg"}
                      images={p.images ?? []}
                      rating={p.rating}
                      reviewCount={p.reviewCount}
                      sellerId={p.seller?.sellerId}
                      sellerName={p.seller?.storeName}
                      stock={p.stock}
                      deliveryInfo={p.deliveryInfo ?? undefined}
                      condition={p.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"}
                      variants={p.variants}
                    />
                  ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
