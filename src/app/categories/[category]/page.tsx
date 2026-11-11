import type { Metadata } from "next";
import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartSidebar } from "@/components/layout/CartSidebar";
import { ProductCard } from "@/components/product/ProductCard";
import Link from "next/link";
export const revalidate = 300;

interface Props {
  params: { category: string };
  searchParams: { sub?: string; sort?: string };
}

// ── Per-category visual + content config ─────────────────────────────────────
const CAT_MAP: Record<string, {
  name: string;
  emoji: string;
  description: string;
  grad: string;
  glow: string;
  accentText: string;
  subcats: string[];
}> = {
  electronics: {
    name: "Electronics",
    emoji: "📱",
    description: "Phones, Laptops, TVs, Audio & all the latest gadgets",
    grad: "linear-gradient(135deg, #1d4ed8 0%, #4f46e5 60%, #7c3aed 100%)",
    glow: "rgba(99,102,241,0.35)",
    accentText: "#bfdbfe",
    subcats: ["Smartphones", "Laptops & PCs", "Tablets", "Cameras", "Audio & Headphones", "Smart Watches", "TVs", "Gaming"],
  },
  fashion: {
    name: "Fashion",
    emoji: "👗",
    description: "Clothing, Shoes, Bags, Jewellery & more for everyone",
    grad: "linear-gradient(135deg, #be185d 0%, #ec4899 60%, #f43f5e 100%)",
    glow: "rgba(236,72,153,0.35)",
    accentText: "#fbcfe8",
    subcats: ["Men's Clothing", "Women's Clothing", "Kids' Wear", "Footwear", "Bags & Wallets", "Sunglasses", "Jewellery", "Watches"],
  },
  "home-kitchen": {
    name: "Home & Kitchen",
    emoji: "🏠",
    description: "Furniture, Cookware, Décor, Bedding & everything for your home",
    grad: "linear-gradient(135deg, #b45309 0%, #f59e0b 60%, #f97316 100%)",
    glow: "rgba(245,158,11,0.35)",
    accentText: "#fde68a",
    subcats: ["Cookware", "Kitchen Storage", "Bedding & Linen", "Home Decor", "Lighting", "Cleaning Supplies", "Bathroom", "Flooring & Rugs"],
  },
  home: {
    name: "Home & Living",
    emoji: "🏡",
    description: "Furniture, Cookware, Décor & everything for your home",
    grad: "linear-gradient(135deg, #b45309 0%, #f59e0b 60%, #f97316 100%)",
    glow: "rgba(245,158,11,0.35)",
    accentText: "#fde68a",
    subcats: ["Cookware", "Bedding & Linen", "Home Decor", "Lighting", "Cleaning Supplies", "Bathroom"],
  },
  books: {
    name: "Books",
    emoji: "📚",
    description: "Fiction, Non-Fiction, Textbooks, Children's Books & more",
    grad: "linear-gradient(135deg, #065f46 0%, #10b981 60%, #059669 100%)",
    glow: "rgba(16,185,129,0.35)",
    accentText: "#6ee7b7",
    subcats: ["Fiction", "Non-Fiction", "Self Help", "Children's Books", "Textbooks", "Comics & Graphic Novels"],
  },
  "sports-fitness": {
    name: "Sports & Fitness",
    emoji: "🏆",
    description: "Cricket, Football, Gym Equipment, Yoga & outdoor sports",
    grad: "linear-gradient(135deg, #991b1b 0%, #ef4444 60%, #dc2626 100%)",
    glow: "rgba(239,68,68,0.35)",
    accentText: "#fecaca",
    subcats: ["Cricket", "Football", "Badminton", "Gym & Fitness", "Cycling", "Yoga", "Swimming", "Tennis"],
  },
  sports: {
    name: "Sports",
    emoji: "🏆",
    description: "Cricket, Football, Gym Equipment & outdoor sports",
    grad: "linear-gradient(135deg, #991b1b 0%, #ef4444 60%, #dc2626 100%)",
    glow: "rgba(239,68,68,0.35)",
    accentText: "#fecaca",
    subcats: ["Cricket", "Football", "Badminton", "Gym & Fitness", "Cycling", "Swimming"],
  },
  beauty: {
    name: "Beauty",
    emoji: "✨",
    description: "Skincare, Makeup, Hair Care, Fragrances & Beauty Tools",
    grad: "linear-gradient(135deg, #6b21a8 0%, #a855f7 60%, #d946ef 100%)",
    glow: "rgba(168,85,247,0.35)",
    accentText: "#e9d5ff",
    subcats: ["Skin Care", "Hair Care", "Makeup", "Fragrances", "Men's Grooming", "Beauty Tools", "Nail Care"],
  },
  "toys-games": {
    name: "Toys & Games",
    emoji: "🎮",
    description: "Action Figures, Board Games, Learning Toys & Outdoor Play",
    grad: "linear-gradient(135deg, #0e7490 0%, #06b6d4 60%, #0ea5e9 100%)",
    glow: "rgba(6,182,212,0.35)",
    accentText: "#bae6fd",
    subcats: ["Action Figures", "Board Games", "Learning Toys", "Remote Control", "Dolls", "Outdoor Play"],
  },
  toys: {
    name: "Toys & Games",
    emoji: "🎮",
    description: "Action Figures, Board Games, Learning Toys & Outdoor Play",
    grad: "linear-gradient(135deg, #0e7490 0%, #06b6d4 60%, #0ea5e9 100%)",
    glow: "rgba(6,182,212,0.35)",
    accentText: "#bae6fd",
    subcats: ["Action Figures", "Board Games", "Learning Toys", "Remote Control", "Dolls", "Outdoor Play"],
  },
  automotive: {
    name: "Automotive",
    emoji: "🚗",
    description: "Car & Bike Accessories, Tools, Helmets & GPS Trackers",
    grad: "linear-gradient(135deg, #1e293b 0%, #475569 60%, #64748b 100%)",
    glow: "rgba(100,116,139,0.35)",
    accentText: "#cbd5e1",
    subcats: ["Car Accessories", "Bike Accessories", "Car Care", "Tools & Equipment", "Helmets", "GPS & Trackers"],
  },
  groceries: {
    name: "Groceries",
    emoji: "🛒",
    description: "Fruits, Dairy, Snacks, Beverages & Daily Essentials",
    grad: "linear-gradient(135deg, #166534 0%, #22c55e 60%, #16a34a 100%)",
    glow: "rgba(34,197,94,0.35)",
    accentText: "#bbf7d0",
    subcats: ["Fruits & Vegetables", "Dairy & Eggs", "Snacks & Beverages", "Staples & Grains", "Organic Foods", "Instant Foods"],
  },
  "garden-outdoors": {
    name: "Garden & Outdoors",
    emoji: "🌿",
    description: "Plants, Garden Tools, Pots, Soil & Outdoor Furniture",
    grad: "linear-gradient(135deg, #3f6212 0%, #84cc16 60%, #65a30d 100%)",
    glow: "rgba(132,204,22,0.35)",
    accentText: "#d9f99d",
    subcats: ["Seeds & Bulbs", "Pots & Planters", "Garden Tools", "Soil & Fertilizers", "Outdoor Furniture", "Irrigation"],
  },
  garden: {
    name: "Garden",
    emoji: "🌿",
    description: "Plants, Garden Tools, Pots & Outdoor Supplies",
    grad: "linear-gradient(135deg, #3f6212 0%, #84cc16 60%, #65a30d 100%)",
    glow: "rgba(132,204,22,0.35)",
    accentText: "#d9f99d",
    subcats: ["Seeds & Bulbs", "Pots & Planters", "Garden Tools", "Soil & Fertilizers", "Outdoor Furniture"],
  },
  health: {
    name: "Health",
    emoji: "❤️",
    description: "Wellness, Medical Devices, Supplements & Personal Care",
    grad: "linear-gradient(135deg, #9f1239 0%, #f43f5e 60%, #e11d48 100%)",
    glow: "rgba(244,63,94,0.35)",
    accentText: "#fecdd3",
    subcats: ["Vitamins & Supplements", "Medical Devices", "Personal Care", "Ayurveda", "Baby Care", "Diabetic Care"],
  },
  pets: {
    name: "Pets",
    emoji: "🐾",
    description: "Food, Toys, Accessories & Care Products for your Pets",
    grad: "linear-gradient(135deg, #c2410c 0%, #fb923c 60%, #f59e0b 100%)",
    glow: "rgba(251,146,60,0.35)",
    accentText: "#fed7aa",
    subcats: ["Dog Food", "Cat Food", "Pet Toys", "Grooming", "Pet Beds", "Aquarium", "Bird Accessories"],
  },
};

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Best Rated", value: "rating" },
  { label: "Most Discount", value: "discount" },
];

function buildSubFilter(sub: string) {
  const clean = sub.replace(/['''']s?\b/g, "").trim();
  const words = clean.split(/[\s&,/+]+/).filter((w) => w.length > 1);
  const singulars = words.map((w) => w.replace(/s$/i, ""));
  const tagCandidates = [...new Set([sub, ...words, ...singulars, ...words.map((w) => w.toLowerCase()), ...singulars.map((w) => w.toLowerCase())])];
  return {
    OR: [
      { tags: { hasSome: tagCandidates } },
      ...singulars.map((w) => ({ name: { contains: w, mode: "insensitive" as const } })),
      ...words.map((w) => ({ name: { contains: w, mode: "insensitive" as const } })),
    ],
  };
}

/** Rejects after `ms` instead of resolving to a fallback — used below so a
 * slow query fails the same way a DB error does (see comment in
 * getCategoryData), instead of silently resolving to "not found"/"empty". */
function rejectAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms));
}

async function getCategoryData(slug: string, sub?: string, sort?: string) {
  return unstable_cache(
    // NOT catching DB errors (or timeouts) here — see src/app/page.tsx for
    // the full reasoning. This one had an extra version of the same bug:
    // the old 5-second Promise.race resolved to null/[] on a slow query,
    // which is indistinguishable from "category genuinely has 0 products",
    // and unstable_cache would then store that fake result for a full
    // 5 MINUTES (revalidate: 300 below) — the longest exposure window of
    // any page in the app. rejectAfter() below makes a timeout REJECT
    // instead of resolve, so it propagates out and is never cached, same as
    // a real DB error.
    async () => {
      const category = await Promise.race([db.category.findUnique({ where: { slug } }), rejectAfter(5000)]);
      if (!category) return null;
      const subFilter = sub ? buildSubFilter(sub) : {};
      const orderBy =
        sort === "price_asc" ? { price: "asc" as const } :
        sort === "price_desc" ? { price: "desc" as const } :
        sort === "rating" ? { rating: "desc" as const } :
        sort === "discount" ? { comparePrice: "desc" as const } :
        { createdAt: "desc" as const };
      const products = await Promise.race([
        db.product.findMany({
          where: { categoryId: category.id, isActive: true, ...subFilter },
          include: {
            seller: { select: { sellerId: true, storeName: true } },
            variants: { select: { id: true, name: true, value: true, price: true, stock: true } },
          },
          orderBy,
          take: 60,
        }),
        rejectAfter(5000),
      ]);
      return { category, products };
    },
    ["category-data", slug, sub ?? "", sort ?? ""],
    { revalidate: 300, tags: ["categories", "products"] }
  )().catch(() => null); // caught HERE (per-request/per-cache-key), not inside — see above
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const cfg = CAT_MAP[params.category];
  const base = cfg?.name ?? params.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const title = searchParams.sub ? `${searchParams.sub} — ${base} | NexCart` : `${base} — NexCart`;
  return { title };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const sub = searchParams.sub;
  const sort = searchParams.sort ?? "newest";
  const data = await getCategoryData(params.category, sub, sort);

  const cfg = CAT_MAP[params.category] ?? {
    name: params.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    emoji: "🛍️",
    description: "Browse all products in this category",
    grad: "linear-gradient(135deg, #374151, #6b7280)",
    glow: "rgba(107,114,128,0.3)",
    accentText: "#e5e7eb",
    subcats: [],
  };

  const products = data?.products ?? [];

  // Build sort + sub query helper
  const buildHref = (newSub?: string, newSort?: string) => {
    const params = new URLSearchParams();
    if (newSub) params.set("sub", newSub);
    if (newSort && newSort !== "newest") params.set("sort", newSort);
    const qs = params.toString();
    return `/categories/${data?.category?.slug ?? params.toString()}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <Navbar />
      <CartSidebar />

      {/* ── Hero Banner ────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ background: cfg.grad, minHeight: 220 }}
      >
        {/* Glow orb */}
        <div
          className="absolute -top-16 -right-16 h-72 w-72 rounded-full pointer-events-none"
          style={{ background: "#fff", filter: "blur(90px)", opacity: 0.12 }}
        />
        <div
          className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full pointer-events-none"
          style={{ background: "#fff", filter: "blur(70px)", opacity: 0.08 }}
        />
        {/* Dot pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-[11px] md:text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
            <a href="/" className="hover:opacity-80 transition-opacity" style={{ color: "rgba(255,255,255,0.55)" }}>Home</a>
            <span>/</span>
            <span style={{ color: "rgba(255,255,255,0.85)" }}>{cfg.name}</span>
            {sub && (
              <>
                <span>/</span>
                <span style={{ color: "#fff" }}>{sub}</span>
              </>
            )}
          </div>

          {/* Title row */}
          <div className="flex items-center gap-4 md:gap-6">
            <span className="text-5xl md:text-7xl leading-none select-none">{cfg.emoji}</span>
            <div>
              <h1 className="text-[28px] md:text-[48px] font-black tracking-tight text-white leading-none">
                {sub ?? cfg.name}
              </h1>
              <p className="mt-1.5 text-[12px] md:text-[17px] font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
                {sub ? `Showing results for "${sub}" in ${cfg.name}` : cfg.description}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-5 flex items-center gap-4 md:gap-6">
            <span
              className="rounded-full px-3 py-1 text-[11px] md:text-[14px] font-bold"
              style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
            >
              {products.length} Products
            </span>
            {sub && (
              <Link
                href={`/categories/${params.category}`}
                className="rounded-full px-3 py-1 text-[11px] md:text-[14px] font-semibold transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.14)", color: cfg.accentText }}
              >
                ✕ Clear filter
              </Link>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* ── Subcategory filter pills ─────────────────────────── */}
        {cfg.subcats.length > 0 && (
          <div className="mt-6 md:mt-8">
            <p className="mb-3 text-[10px] md:text-[12px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Browse by Subcategory
            </p>
            <div
              className="flex gap-2 md:gap-3 flex-wrap"
            >
              {/* All */}
              <Link
                href={`/categories/${params.category}${sort !== "newest" ? `?sort=${sort}` : ""}`}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 md:px-5 md:py-2.5 text-[12px] md:text-[15px] font-semibold transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                style={
                  !sub
                    ? { background: cfg.grad, color: "#fff", boxShadow: `0 4px 14px ${cfg.glow}` }
                    : { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }
                }
              >
                All {cfg.name}
              </Link>

              {cfg.subcats.map((s) => (
                <Link
                  key={s}
                  href={`/categories/${params.category}?sub=${encodeURIComponent(s)}${sort !== "newest" ? `&sort=${sort}` : ""}`}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 md:px-5 md:py-2.5 text-[12px] md:text-[15px] font-semibold transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                  style={
                    sub === s
                      ? { background: cfg.grad, color: "#fff", boxShadow: `0 4px 14px ${cfg.glow}` }
                      : { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }
                  }
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Sort bar ─────────────────────────────────────────── */}
        <div className="mt-6 md:mt-8 flex items-center justify-between">
          <p className="text-[12px] md:text-[15px] text-slate-500 font-medium">
            <span className="font-bold text-slate-800">{products.length}</span> products found
            {sub && <span className="ml-1">in <span className="font-semibold text-slate-700">&quot;{sub}&quot;</span></span>}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] md:text-[13px] text-slate-400 font-medium hidden sm:block">Sort by:</span>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {SORT_OPTIONS.map((opt) => (
                <Link
                  key={opt.value}
                  href={`/categories/${params.category}${sub ? `?sub=${encodeURIComponent(sub)}&sort=${opt.value}` : `?sort=${opt.value}`}`}
                  className="rounded-lg px-2.5 py-1.5 md:px-3.5 md:py-2 text-[10px] md:text-[13px] font-semibold transition-colors"
                  style={
                    sort === opt.value
                      ? { background: "#111827", color: "#fff" }
                      : { background: "#f1f5f9", color: "#64748b" }
                  }
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Product Grid ─────────────────────────────────────── */}
        <div className="mt-6 md:mt-8 pb-16">
          {products.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center min-h-[320px] rounded-2xl text-center gap-5"
              style={{ background: "#f8fafc", border: "1.5px dashed #e2e8f0" }}
            >
              <span className="text-6xl">{cfg.emoji}</span>
              <div>
                <p className="text-[16px] md:text-[22px] font-bold text-slate-700 mb-1">
                  {sub ? `No products in "${sub}"` : `No products in ${cfg.name} yet`}
                </p>
                <p className="text-[12px] md:text-[15px] text-slate-400">
                  {sub ? "Try a different subcategory or check back later." : "Sellers haven't added products here yet."}
                </p>
              </div>
              {sub && (
                <Link
                  href={`/categories/${params.category}`}
                  className="rounded-xl px-5 py-2.5 text-[13px] md:text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: cfg.grad }}
                >
                  View all {cfg.name}
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
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
                  isFeatured={p.isFeatured}
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
