import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronRight, Star, Zap, Tag, Clock, ShieldCheck, Banknote, Truck, RotateCcw, Heart } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { HeroSection } from "@/components/shared/HeroSection";
// import { BrandStrip } from "@/components/shared/BrandStrip"; // PAUSED — re-enable with the BrandStrip section below when brand collabs are ready
import dynamicImport from "next/dynamic";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { parseStoreColor, toCssBackground } from "@/lib/store-color";

const DealOfDaySection = dynamicImport(
  () => import("@/components/shared/DealOfDay").then((mod) => ({ default: mod.DealOfDay })),
  { ssr: false, loading: () => <div className="h-48 rounded-2xl bg-zinc-200/60" /> }
);

const Navbar = dynamicImport(
  () => import("@/components/layout/Navbar").then((mod) => ({ default: mod.Navbar })),
  { ssr: false, loading: () => <div className="h-16 border-b border-zinc-200 bg-white/90" /> }
);

const LazyProductSection = dynamicImport(
  () => import("@/components/shared/ScrollReveal").then((mod) => ({ default: mod.ScrollReveal })),
  { ssr: false, loading: () => <div /> }
);

export const metadata: Metadata = {
  title: "NexCart — Shop Online | Electronics, Fashion, Home & More",
};
export const dynamic = "force-static";
export const revalidate = 1800;

// ── Data fetching (cached 1 hour) ────────────────────────────────────────────
const CAT_SECTIONS = [
  { slug: "fashion",        label: "Fashion",           emoji: "🧥", tagline: "Trending Styles",      chips: ["Men's Wear","Women's Wear","Footwear","Jewellery"],   grad: "linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fb7185 100%)", buyNow: "linear-gradient(135deg, #ec4899, #f43f5e)", accent: "#db2777", seeAll: "/categories/fashion" },
  { slug: "electronics",    label: "Electronics",       emoji: "📱", tagline: "Latest Tech Deals",   chips: ["Smartphones","Laptops","Smart Watches","Cameras"],    grad: "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)", buyNow: "linear-gradient(135deg, #3b82f6, #6366f1)", accent: "#2563eb", seeAll: "/categories/electronics" },
  { slug: "home-kitchen",   label: "Home & Kitchen",    emoji: "🏠", tagline: "Home Essentials",      chips: ["Cookware","Bedding","Decor","Lighting"],              grad: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #fb923c 100%)", buyNow: "linear-gradient(135deg, #f59e0b, #f97316)", accent: "#d97706", seeAll: "/categories/home-kitchen" },
  { slug: "beauty",         label: "Beauty",            emoji: "✨", tagline: "Glow Up Collection",   chips: ["Skin Care","Makeup","Hair Care","Fragrances"],        grad: "linear-gradient(135deg, #a855f7 0%, #d946ef 50%, #e879f9 100%)", buyNow: "linear-gradient(135deg, #a855f7, #d946ef)", accent: "#9333ea", seeAll: "/categories/beauty" },
  { slug: "sports-fitness", label: "Sports & Fitness",  emoji: "🏆", tagline: "Play Hard, Win More",  chips: ["Cricket","Gym & Fitness","Yoga","Cycling"],           grad: "linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #f87171 100%)", buyNow: "linear-gradient(135deg, #ef4444, #dc2626)", accent: "#dc2626", seeAll: "/categories/sports-fitness" },
  { slug: "books",          label: "Books",             emoji: "📚", tagline: "Knowledge is Power",   chips: ["Fiction","Self Help","Textbooks","Children's"],       grad: "linear-gradient(135deg, #10b981 0%, #059669 50%, #34d399 100%)", buyNow: "linear-gradient(135deg, #10b981, #059669)", accent: "#059669", seeAll: "/categories/books" },
  { slug: "toys-games",     label: "Toys & Games",      emoji: "🎮", tagline: "Fun for All Ages",     chips: ["Action Figures","Board Games","Learning","Outdoor"], grad: "linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #22d3ee 100%)", buyNow: "linear-gradient(135deg, #06b6d4, #0ea5e9)", accent: "#0891b2", seeAll: "/categories/toys-games" },
  { slug: "automotive",     label: "Automotive",        emoji: "🚗", tagline: "Drive in Style",       chips: ["Car Accessories","Helmets","Car Care","GPS"],         grad: "linear-gradient(135deg, #475569 0%, #334155 50%, #64748b 100%)", buyNow: "linear-gradient(135deg, #64748b, #475569)", accent: "#475569", seeAll: "/categories/automotive" },
  { slug: "groceries",      label: "Groceries",         emoji: "🛒", tagline: "Fresh & Daily",        chips: ["Fruits & Veg","Dairy & Eggs","Snacks","Organic"],     grad: "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #4ade80 100%)", buyNow: "linear-gradient(135deg, #22c55e, #16a34a)", accent: "#16a34a", seeAll: "/categories/groceries" },
  { slug: "garden-outdoors",label: "Garden & Outdoors", emoji: "🌿", tagline: "Grow Your Green Space", chips: ["Seeds","Pots","Garden Tools","Outdoor Furniture"],  grad: "linear-gradient(135deg, #84cc16 0%, #65a30d 50%, #a3e635 100%)", buyNow: "linear-gradient(135deg, #84cc16, #65a30d)", accent: "#65a30d", seeAll: "/categories/garden-outdoors" },
  { slug: "health",         label: "Health",            emoji: "❤️", tagline: "Live Well, Feel Better",chips: ["Vitamins","Medical Devices","Ayurveda","Baby Care"], grad: "linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #fb7185 100%)", buyNow: "linear-gradient(135deg, #f43f5e, #e11d48)", accent: "#e11d48", seeAll: "/categories/health" },
  { slug: "pets",           label: "Pets",              emoji: "🐾", tagline: "Love Your Pets",       chips: ["Dog Food","Cat Food","Pet Toys","Grooming"],          grad: "linear-gradient(135deg, #fb923c 0%, #f59e0b 50%, #fdba74 100%)", buyNow: "linear-gradient(135deg, #fb923c, #f59e0b)", accent: "#ea580c", seeAll: "/categories/pets" },
];

type CatProduct = {
  id: string; productId: string; name: string; description: string; price: number; comparePrice: number;
  images: string[]; rating: number; reviewCount: number; stock: number;
  isFeatured: boolean; condition: string; categoryId: string | null;
  deliveryInfo: string | null;
  seller: { sellerId: string; storeName: string };
  variants: Array<{ id: string; name: string; value: string; price?: number | null; stock: number }>;
};

const EMPTY = {
  featured: [] as never[], latest: [] as never[], sellers: [] as never[],
  catProducts: {} as Record<string, CatProduct[]>,
};

const HOME_FEATURED_LIMIT = 8;
const HOME_LATEST_LIMIT = 8;
const HOME_SELLER_LIMIT = 6;
const HOME_CATEGORY_PRODUCT_LIMIT = 96;

const getData = unstable_cache(
  async () => {
    // Deliberately NOT catching errors here (e.g. a transient DB blip) —
    // unstable_cache only caches a call once it resolves successfully, so
    // letting a failure throw means nothing gets cached and the very next
    // request tries again fresh. Previously this caught every error and
    // cached an EMPTY result for a full hour (revalidate: 3600 below) — one
    // bad moment (DB waking up, a brief network drop) meant EVERY visitor
    // saw an empty homepage with no products for up to an hour afterwards,
    // even after the database was working again. The caller below
    // (HomePage) catches failures per-request instead, which only affects
    // the one visitor who hit the bad moment.

    // Fetch categories + all product data in parallel — no artificial timeout
    const [categories, featured, latest, sellers] = await Promise.all([
        db.category.findMany({
          where: { slug: { in: CAT_SECTIONS.map((c) => c.slug) } },
          select: { id: true, slug: true },
        }),
        db.product.findMany({
          where: { isActive: true },
          select: {
            id: true, productId: true, name: true, description: true, price: true, comparePrice: true,
            images: true, rating: true, reviewCount: true, stock: true,
            isFeatured: true, condition: true, deliveryInfo: true,
            seller: { select: { sellerId: true, storeName: true } },
            variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
          },
          take: HOME_FEATURED_LIMIT,
          orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
        }),
        db.product.findMany({
          where: { isActive: true },
          select: {
            id: true, productId: true, name: true, description: true, price: true, comparePrice: true,
            images: true, rating: true, reviewCount: true, stock: true,
            isFeatured: true, condition: true, deliveryInfo: true,
            seller: { select: { sellerId: true, storeName: true } },
            variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
          },
          take: HOME_LATEST_LIMIT,
          orderBy: { createdAt: "desc" },
        }),
        db.seller.findMany({
          where: { status: "APPROVED" },
          select: {
            id: true, sellerId: true, storeName: true, logo: true,
            rating: true, isVerified: true, description: true, storeColor: true,
            _count: { select: { products: true } },
          },
          take: HOME_SELLER_LIMIT,
          orderBy: { rating: "desc" },
        }),
      ]);

      const catIdMap = Object.fromEntries(categories.map((c: { slug: string; id: string }) => [c.slug, c.id]));
      const catIds = Object.values(catIdMap);

      // Single batch query for all category products — replaces 12 separate round-trips
      const allCatProds = catIds.length > 0 ? await db.product.findMany({
        where: { isActive: true, categoryId: { in: catIds } },
        select: {
          id: true, productId: true, name: true, description: true, price: true, comparePrice: true,
          images: true, rating: true, reviewCount: true, stock: true,
          isFeatured: true, condition: true, categoryId: true, deliveryInfo: true,
          seller: { select: { sellerId: true, storeName: true } },
          variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
        },
        orderBy: { salesCount: "desc" },
        take: HOME_CATEGORY_PRODUCT_LIMIT,
      }) : [];

      // Group by slug (up to 8 per category, already sorted by popularity)
      const idToSlug: Record<string, string> = {};
      for (const [slug, id] of Object.entries(catIdMap)) idToSlug[id as string] = slug;
      const catProducts: Record<string, CatProduct[]> = {};
      for (const p of allCatProds) {
        if (!p.categoryId) continue;
        const slug = idToSlug[p.categoryId];
        if (!slug) continue;
        if (!catProducts[slug]) catProducts[slug] = [];
        if (catProducts[slug].length < 8) catProducts[slug].push(p as CatProduct);
      }

      return { featured, latest, sellers, catProducts };
  },
  ["homepage-data"],
  { revalidate: 3600, tags: ["homepage", "products"] }
);

// Same color array and hash logic as SellerStoreClient — keeps cards in sync with banners
const SELLER_BANNER_COLORS = [
  "#6d28d9", "#2563eb", "#dc2626", "#d97706",
  "#16a34a", "#db2777", "#0891b2", "#ea580c",
  "#7c3aed", "#0f766e",
];
function getSellerCardColor(sellerId: string): string {
  let hash = 0;
  for (let i = 0; i < sellerId.length; i++) {
    hash = sellerId.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return SELLER_BANNER_COLORS[Math.abs(hash) % SELLER_BANNER_COLORS.length];
}

function SectionHead({
  label,
  title,
  href,
}: {
  label: string;
  title: string;
  href: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <h2 className="stitle">{title}</h2>
        <span className="hidden sm:inline-block rounded-full bg-primary/8 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">{label}</span>
      </div>
      <Link href={href} className="slink shrink-0">
        See all <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export default async function HomePage() {
  // getData() no longer swallows errors internally (see comment above it) —
  // catch failures HERE instead, per-request, so a transient DB blip only
  // ever affects the one visitor who hit it, not an hour-long cached outage
  // for everyone.
  const { featured, latest, sellers, catProducts } = await getData().catch(() => EMPTY);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-zinc-100">
        {/* ── Hero: Carousel + CategoryIcons ──────────────────────── */}
        <HeroSection />

        <div className="w-full py-6 space-y-10 px-4 sm:px-6 lg:px-8 xl:px-12">

          {/* ── Deal of the Day ─────────────────────────────────── */}
          <LazyProductSection><DealOfDaySection /></LazyProductSection>

          {/* ── Brand Strip ─────────────────────────────────────── */}
          {/* TEMPORARILY PAUSED — brand collaborations not finalized yet.
              Re-enable by uncommenting the line below when ready.
          <ScrollReveal delay={60}><BrandStrip /></ScrollReveal>
          */}

          {/* ── Deal banners ────────────────────────────────────── */}
          <ScrollReveal delay={80}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { Icon: Tag,   t: "Today's Deals",  s: "Up to 70% off selected items",     h: "/search?sort=discount", grad: "linear-gradient(135deg, #1a0a00, #2d0f00)", iconGrad: "linear-gradient(135deg, #ef4444, #dc2626)", iconGlow: "rgba(239,68,68,0.45)", tagC: "#fca5a5", subC: "rgba(255,255,255,0.45)", glow: "rgba(239,68,68,0.15)" },
              { Icon: Zap,   t: "Flash Sale",      s: "Limited-time prices on top picks", h: "/flash-sale", grad: "linear-gradient(135deg, #0d0900, #1f1200)", iconGrad: "linear-gradient(135deg, #f59e0b, #f97316)", iconGlow: "rgba(245,158,11,0.45)", tagC: "#fde68a", subC: "rgba(255,255,255,0.45)", glow: "rgba(245,158,11,0.15)" },
              { Icon: Clock, t: "New Arrivals",    s: "Fresh products added daily",       h: "/search?sort=newest",   grad: "linear-gradient(135deg, #00100a, #001f14)", iconGrad: "linear-gradient(135deg, #10b981, #059669)", iconGlow: "rgba(16,185,129,0.45)", tagC: "#6ee7b7", subC: "rgba(255,255,255,0.45)", glow: "rgba(16,185,129,0.15)" },
            ].map(({ Icon, t, s, h, grad, iconGrad, iconGlow, tagC, subC, glow }) => (
              <Link
                key={t}
                href={h}
                className="group flex items-center gap-4 rounded-xl px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: grad,
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: `0 4px 20px ${glow}, 0 1px 0 rgba(255,255,255,0.05) inset`,
                }}
              >
                <div
                  className="flex h-11 w-11 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-xl md:rounded-2xl text-white transition-transform duration-200 group-hover:scale-110"
                  style={{ background: iconGrad, boxShadow: `0 4px 14px ${iconGlow}` }}
                >
                  <Icon className="h-5 w-5 md:h-7 md:w-7" />
                </div>
                <div className="flex-1 min-w-0 text-center">
                  <p className="text-[13px] md:text-[20px] font-bold leading-tight" style={{ color: tagC }}>{t}</p>
                  <p className="text-[11px] md:text-[15px] mt-0.5" style={{ color: subC }}>{s}</p>
                </div>
                <ChevronRight className="h-4 w-4 md:h-6 md:w-6 shrink-0 opacity-40 group-hover:opacity-80 transition-opacity" style={{ color: tagC }} />
              </Link>
            ))}
          </div>
          </ScrollReveal>

          {/* ── Trending products ────────────────────────────────── */}
          {featured.length > 0 && (
            <ScrollReveal delay={40}>
            <section>
              <div className="relative overflow-hidden rounded-3xl p-4 md:p-6"
                style={{ background: "#ffffff", border: "0.5px solid #e4e4e7", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>

                <div className="relative mb-4 flex items-end justify-between">
                  <div>
                    <h2 className="text-[10px] md:text-[15px] font-black uppercase tracking-[0.28em] mb-1" style={{ color: "#ea580c" }}>Most Popular</h2>
                    <p className="text-[22px] md:text-[34px] font-black text-zinc-900 tracking-tight">Trending Right Now</p>
                  </div>
                  <Link href="/trending" className="flex items-center gap-1 text-[12px] md:text-[18px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
                    See all <ChevronRight className="h-3.5 w-3.5 md:h-5 md:w-5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                  {featured.slice(0, 6).map((p, index) => (
                    <ProductCard
                      key={p.id}
                      id={p.id}
                      productId={p.productId}
                      name={p.name}
                      description={p.description}
                      price={p.price}
                      comparePrice={p.comparePrice}
                      image={p.images[0]} images={p.images}
                      rating={p.rating}
                      reviewCount={p.reviewCount}
                      sellerId={p.seller.sellerId}
                      sellerName={p.seller.storeName}
                      stock={p.stock}
                      isFeatured
                      blackBorder
                      sellerColor="#ea580c"
                      deliveryInfo={p.deliveryInfo ?? undefined}
                      condition={p.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"}
                      variants={p.variants}
                    />
                  ))}
                </div>
              </div>
            </section>
            </ScrollReveal>
          )}

          {/* ── Featured sellers ─────────────────────────────────── */}
          {sellers.length > 0 && (
            <ScrollReveal>
            <section>
              <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "0.5px solid #e4e4e7", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-[20px] md:text-[28px] font-bold tracking-[-0.02em] leading-none text-zinc-900">Top Sellers</h2>
                    <span className="hidden sm:inline-block rounded-full bg-primary/8 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Verified Stores</span>
                  </div>
                  <Link href="/search?type=sellers" className="flex items-center gap-1 text-[12px] md:text-[14px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors shrink-0">
                    See all <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="flex gap-6 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                  {sellers.map((s) => {
                    // storeColor may be a flat hex or a "#hex,#hex" gradient picked in
                    // Settings — parse it so a gradient renders as a real CSS gradient
                    // here instead of being used raw (which would be invalid CSS).
                    const parsedColor = parseStoreColor(s.storeColor as string | null)
                      ?? { primary: getSellerCardColor(s.sellerId), secondary: null };
                    const ringBg = toCssBackground(parsedColor);
                    return (
                      <Link
                        key={s.id}
                        href={`/store/${s.sellerId}`}
                        className="group flex flex-col items-center gap-2 shrink-0 w-[76px]"
                      >
                        {/* Ring */}
                        <div
                          className="p-[3px] rounded-full transition-transform duration-200 group-hover:scale-105"
                          style={{ background: ringBg, boxShadow: `0 3px 12px ${parsedColor.primary}66` }}
                        >
                          {/* White separator */}
                          <div className="p-[2px] rounded-full bg-white dark:bg-[hsl(220_17%_4%)]">
                            {/* Circle */}
                            <div
                              className="h-[64px] w-[64px] rounded-full flex items-center justify-center overflow-hidden text-white font-black text-[26px] select-none"
                              style={{ background: ringBg }}
                            >
                              {s.logo ? (
                                <Image src={s.logo} alt={s.storeName} width={64} height={64} className="h-full w-full object-cover rounded-full" />
                              ) : (
                                s.storeName[0].toUpperCase()
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Name — wraps up to 2 lines */}
                        <p className="text-[11px] font-semibold text-zinc-800 text-center leading-tight line-clamp-2 w-full">
                          {s.storeName}
                        </p>
                        {/* Product count */}
                        <p className="text-[10px] text-zinc-400 text-center -mt-1">
                          {s._count.products} products
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
            </ScrollReveal>
          )}

          {/* ── New arrivals ─────────────────────────────────────── */}
          <ScrollReveal>
          <section>
            <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "0.5px solid #e4e4e7", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>

              {/* Header */}
              <div className="mb-7 flex items-end justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-[5px] rounded-full px-[10px] py-[4px]" style={{ border: "0.5px solid #d1d5db" }}>
                    <span className="inline-block h-[5px] w-[5px] rounded-full bg-emerald-500" />
                    <span className="text-[9px] uppercase tracking-[0.15em] text-zinc-400">Just added</span>
                  </div>
                  <h2 className="text-[28px] font-bold tracking-[-0.02em] leading-none text-zinc-900">New Arrivals</h2>
                </div>
                <Link href="/new"
                  className="px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-zinc-500 transition-all duration-200 hover:bg-zinc-900 hover:text-white"
                  style={{ border: "0.5px solid #d1d5db", borderRadius: 2 }}>
                  See all →
                </Link>
              </div>

              {/* Grid */}
              {latest.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                  {latest.map((p, index) => (
                    <ProductCard
                      key={p.id}
                      id={p.id}
                      productId={p.productId}
                      name={p.name}
                      description={p.description}
                      price={p.price}
                      comparePrice={p.comparePrice}
                      image={p.images?.[0]} images={p.images}
                      rating={p.rating}
                      reviewCount={p.reviewCount}
                      sellerId={p.seller.sellerId}
                      sellerName={p.seller.storeName}
                      stock={p.stock}
                      isNew
                      blackBorder
                      buyNowGradient="linear-gradient(135deg, #0284c7, #0369a1)"
                      sellerColor="#0284c7"
                      deliveryInfo={p.deliveryInfo ?? undefined}
                      condition={p.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"}
                      variants={p.variants}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[180px] items-center justify-center rounded-lg" style={{ background: "#f9fafb", border: "0.5px solid #e4e4e7" }}>
                  <div className="text-center">
                    <p className="text-[13px] text-zinc-400 mb-3">No products yet — be the first seller!</p>
                    <Link href="/become-seller" className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-white" style={{ background: "#18181b", borderRadius: 4 }}>
                      Start Selling
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>
          </ScrollReveal>

          {/* ── Per-Category Product Sections ────────────────────── */}
          {CAT_SECTIONS.map(({ slug, label, emoji, tagline, chips, buyNow, accent, seeAll }) => {
            const products = catProducts?.[slug] ?? [];
            return (
              <ScrollReveal key={slug}>
              <section style={{ contain: "layout paint" }}>
                <div
                  className="relative overflow-hidden rounded-3xl p-6 md:p-10"
                  style={{
                    background: "#ffffff",
                    border: "0.5px solid #e4e4e7",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
                  }}
                >
                  {/* ── Header row ── */}
                  <div className="relative mb-4 md:mb-6 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 md:gap-6 min-w-0">
                      {/* Emoji icon box */}
                      <div
                        className="flex h-14 w-14 md:h-20 md:w-20 shrink-0 items-center justify-center rounded-2xl md:rounded-3xl text-[26px] md:text-[42px] leading-none select-none"
                        style={{ background: "#f4f4f5", border: "0.5px solid #e4e4e7" }}
                      >
                        {emoji}
                      </div>

                      <div className="flex flex-col gap-1 min-w-0">
                        {/* Badge pill */}
                        <div className="inline-flex items-center gap-2 self-start rounded-full bg-primary/8 px-2.5 py-0.5 md:px-3 md:py-1">
                          <span className="text-[8px] md:text-[11px] uppercase tracking-[0.18em] font-black text-primary">
                            {label}
                          </span>
                          {products.length > 0 && (
                            <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[8px] md:text-[10px] font-bold text-zinc-500">
                              {products.length}
                            </span>
                          )}
                        </div>

                        {/* Main title */}
                        <h2 className="text-[20px] md:text-[38px] font-black tracking-tight leading-none text-zinc-900">
                          {label}
                        </h2>

                        {/* Tagline */}
                        <p className="text-[11px] md:text-[16px] font-semibold text-zinc-500">
                          {tagline}
                        </p>
                      </div>
                    </div>

                    {/* View All — compact on mobile, full on desktop */}
                    <Link
                      href={seeAll}
                      className="group shrink-0 flex items-center gap-1.5 md:gap-2 rounded-xl md:rounded-2xl
                        px-3 py-2 md:px-6 md:py-3.5
                        text-[11px] md:text-[14px] font-bold text-white uppercase tracking-[0.08em] md:tracking-[0.1em]
                        transition-transform duration-200 hover:scale-105 active:scale-[0.97] bg-zinc-900 hover:bg-zinc-800"
                    >
                      View All
                      <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  </div>

                  {/* ── Subcategory chips — single scrollable row ── */}
                  <div className="relative mb-5 md:mb-7">
                    <div
                      className="flex items-center gap-2 overflow-x-auto pb-1"
                      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                      {chips.map((chip) => (
                        <Link
                          key={chip}
                          href={`${seeAll}?q=${encodeURIComponent(chip)}`}
                          className="shrink-0 rounded-full bg-zinc-100 px-3 md:px-4 py-1 md:py-1.5 text-[10px] md:text-[12px] font-semibold text-zinc-600 transition-colors duration-150 hover:bg-zinc-900 hover:text-white"
                        >
                          {chip}
                        </Link>
                      ))}
                      {/* See all as last chip */}
                      <Link
                        href={seeAll}
                        className="shrink-0 rounded-full bg-zinc-900 px-3 md:px-4 py-1 md:py-1.5 text-[10px] md:text-[12px] font-semibold text-white transition-colors duration-150 hover:bg-zinc-700 flex items-center gap-1"
                      >
                        See all <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                    {/* Right fade hint — shows more chips to scroll */}
                    <div
                      className="pointer-events-none absolute right-0 top-0 bottom-1 w-10 md:hidden"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9))" }}
                    />
                  </div>

                  {/* ── Products grid or empty state ── */}
                  {products.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                      {products.map((p, index) => (
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
                          isFeatured={p.isFeatured}
                          blackBorder
                          buyNowGradient={buyNow}
                          sellerColor={accent}
                          deliveryInfo={p.deliveryInfo ?? undefined}
                          condition={p.condition as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN"}
                          variants={p.variants ?? []}
                          priority={index < 2}
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center gap-4 rounded-2xl py-14 text-center"
                      style={{ background: "#f9fafb", border: "0.5px dashed #d4d4d8" }}
                    >
                      <p className="text-[44px] md:text-[56px] leading-none select-none">🛍️</p>
                      <div>
                        <p className="text-[16px] md:text-[22px] font-black text-zinc-900 mb-1">
                          No {label} products yet
                        </p>
                        <p className="text-[12px] md:text-[15px] mb-1 text-zinc-500">
                          {tagline} — coming soon!
                        </p>
                        <p className="text-[11px] md:text-[13px] text-zinc-400">
                          Be the first seller to list products here!
                        </p>
                      </div>
                      <Link
                        href="/become-seller"
                        className="mt-1 rounded-2xl bg-zinc-900 px-6 py-3 text-[13px] md:text-[15px] font-bold text-white transition-transform hover:scale-105 active:scale-[0.97]"
                      >
                        Start Selling →
                      </Link>
                    </div>
                  )}
                </div>
              </section>
              </ScrollReveal>
            );
          })}

          {/* ── Dual promo banner ────────────────────────────────── */}
          <ScrollReveal>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Left — Sell on NexCart */}
            <div
              className="relative overflow-hidden rounded-[14px] p-7 md:p-10"
              style={{
                background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)",
                boxShadow: "0 8px 40px rgba(67,56,202,0.45)",
              }}
            >
              <div className="absolute -right-8 -top-8 h-52 w-52 rounded-full pointer-events-none" style={{ background: "#818cf8", filter: "blur(64px)", opacity: 0.35 }} />
              <div className="absolute -left-6 -bottom-6 h-36 w-36 rounded-full pointer-events-none" style={{ background: "#6d28d9", filter: "blur(50px)", opacity: 0.3 }} />
              <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

              <p className="relative mb-2 text-[10px] md:text-[14px] font-bold uppercase tracking-[0.18em]" style={{ color: "#a5b4fc" }}>
                For Sellers
              </p>
              <h3 className="relative mb-3 text-[20px] md:text-[36px] font-bold leading-snug tracking-tight text-white">
                Start selling on NexCart
              </h3>
              <p className="relative mb-7 text-[13px] md:text-[18px] leading-relaxed md:max-w-lg" style={{ color: "rgba(255,255,255,0.72)" }}>
                Join 50,000+ verified sellers. Get your own storefront, smart dashboard, and reach millions of buyers across India.
              </p>
              <Link
                href="/become-seller"
                className="relative inline-flex items-center gap-2 rounded-[9px] px-5 py-2.5 md:px-8 md:py-4 text-[13px] md:text-[18px] font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(8px)" }}
              >
                Start Selling Free <ArrowRight className="h-3.5 w-3.5 md:h-5 md:w-5" />
              </Link>
            </div>

            {/* Right — NexCart for Business */}
            <div
              className="relative overflow-hidden rounded-[14px] p-7 md:p-10"
              style={{
                background: "linear-gradient(135deg, #022c22 0%, #064e3b 45%, #065f46 100%)",
                boxShadow: "0 8px 40px rgba(6,79,60,0.50)",
              }}
            >
              <div className="absolute -right-8 -top-8 h-52 w-52 rounded-full pointer-events-none" style={{ background: "#34d399", filter: "blur(64px)", opacity: 0.3 }} />
              <div className="absolute -left-6 -bottom-6 h-36 w-36 rounded-full pointer-events-none" style={{ background: "#059669", filter: "blur(50px)", opacity: 0.3 }} />
              <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

              <p className="relative mb-2 text-[10px] md:text-[14px] font-bold uppercase tracking-[0.18em]" style={{ color: "#6ee7b7" }}>
                For Business
              </p>
              <h3 className="relative mb-3 text-[20px] md:text-[36px] font-bold leading-snug tracking-tight text-white">
                NexCart for Business
              </h3>
              <p className="relative mb-7 text-[13px] md:text-[18px] leading-relaxed md:max-w-lg" style={{ color: "rgba(255,255,255,0.72)" }}>
                Bulk orders, GST invoicing, dedicated account manager, and priority support for all your business needs.
              </p>
              <Link
                href="/about"
                className="relative inline-flex items-center gap-2 rounded-[9px] px-5 py-2.5 md:px-8 md:py-4 text-[13px] md:text-[18px] font-semibold text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
                style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(8px)" }}
              >
                Learn More <ArrowRight className="h-3.5 w-3.5 md:h-5 md:w-5" />
              </Link>
            </div>
          </div>
          </ScrollReveal>

          {/* ── Why NexCart ──────────────────────────────────────── */}
          <ScrollReveal>
          <section
            className="relative overflow-hidden rounded-[16px] p-6 sm:p-8 md:p-14"
            style={{
              background: "linear-gradient(135deg, #0c0f2e 0%, #111a4a 45%, #0e1640 100%)",
              boxShadow: "0 12px 56px rgba(12,15,46,0.55)",
            }}
          >
            {/* Outer glow orbs */}
            <div className="absolute -top-10 -right-10 h-60 w-60 rounded-full pointer-events-none" style={{ background: "#3b82f6", filter: "blur(80px)", opacity: 0.18 }} />
            <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full pointer-events-none" style={{ background: "#6366f1", filter: "blur(70px)", opacity: 0.15 }} />
            {/* Dot grid */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

            <div className="relative mb-8 md:mb-10 text-center">
              <p className="mb-2 text-[10px] md:text-[14px] font-bold uppercase tracking-[0.18em]" style={{ color: "#7dd3fc" }}>Why NexCart</p>
              <h2 className="text-[22px] md:text-[38px] font-bold tracking-tight" style={{ color: "#f0f9ff" }}>Built for every buyer</h2>
            </div>

            <div className="relative grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {[
                { Icon: ShieldCheck, t: "Genuine Products",  d: "Every seller verified by our team" },
                { Icon: Banknote,    t: "Best Prices",        d: "Compare from thousands of stores" },
                { Icon: Truck,       t: "Fast Dispatch",      d: "Same-day shipping available" },
                { Icon: RotateCcw,   t: "Easy Returns",       d: "7-day no-hassle return policy" },
              ].map(({ Icon, t, d }) => (
                <div
                  key={t}
                  className="flex flex-col items-center text-center gap-3 md:gap-5 rounded-[14px] p-5 md:p-8 transition-all duration-200 hover:scale-[1.03]"
                  style={{
                    background: "rgba(59,130,246,0.10)",
                    border: "1px solid rgba(99,102,241,0.28)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div
                    className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-[12px] md:rounded-[16px]"
                    style={{ background: "rgba(99,102,241,0.28)" }}
                  >
                    <Icon className="h-6 w-6 md:h-8 md:w-8" strokeWidth={1.75} style={{ color: "#93c5fd" }} />
                  </div>
                  <div>
                    <p className="text-[13px] md:text-[20px] font-bold mb-1 md:mb-2" style={{ color: "#e0f2fe" }}>{t}</p>
                    <p className="text-[11px] md:text-[15px] leading-snug" style={{ color: "rgba(255,255,255,0.60)" }}>{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          </ScrollReveal>

        </div>
      </main>
      <Footer />
    </>
  );
}
