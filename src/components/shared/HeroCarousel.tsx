"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Store } from "lucide-react";

const SLIDES = [
  {
    bg:        "#020a1c",
    gradient:  "radial-gradient(ellipse at 75% -20%, #1d4ed840 0%, #020a1c 60%), linear-gradient(160deg, #020a1c 0%, #030d25 100%)",
    accent:    "#3b82f6",
    accent2:   "#6d28d9",
    tagColor:  "#93c5fd",
    tagBg:     "rgba(59,130,246,0.15)",
    ctaGrad:   "linear-gradient(135deg, #2563eb, #4f46e5)",
    statColor: "#60a5fa",
    tag: "Electronics",
    headline: "Up to 70% Off\nMobiles & Laptops",
    sub: "Shop the biggest electronics sale of the season.",
    cta: "Shop Electronics",
    href: "/categories/electronics",
    stat: "2,400+",
    statLabel: "Products on sale",
  },
  {
    bg:        "#0d0118",
    gradient:  "radial-gradient(ellipse at 75% -20%, #7c3aed45 0%, #0d0118 60%), linear-gradient(160deg, #0d0118 0%, #160228 100%)",
    accent:    "#a855f7",
    accent2:   "#ec4899",
    tagColor:  "#d8b4fe",
    tagBg:     "rgba(168,85,247,0.15)",
    ctaGrad:   "linear-gradient(135deg, #9333ea, #c026d3)",
    statColor: "#c084fc",
    tag: "Fashion",
    headline: "Flat 50% Off\nTop Fashion Brands",
    sub: "Kurtas, western wear, footwear and accessories.",
    cta: "Shop Fashion",
    href: "/categories/fashion",
    stat: "500+",
    statLabel: "Brands available",
  },
  {
    bg:        "#010f08",
    gradient:  "radial-gradient(ellipse at 75% -20%, #05966940 0%, #010f08 60%), linear-gradient(160deg, #010f08 0%, #021a0e 100%)",
    accent:    "#10b981",
    accent2:   "#0ea5e9",
    tagColor:  "#6ee7b7",
    tagBg:     "rgba(16,185,129,0.15)",
    ctaGrad:   "linear-gradient(135deg, #059669, #0d9488)",
    statColor: "#34d399",
    tag: "Home & Kitchen",
    headline: "Minimum 40% Off\nHome Essentials",
    sub: "Transform your living space this season.",
    cta: "Shop Home",
    href: "/categories/home",
    stat: "8,000+",
    statLabel: "Items in stock",
  },
  {
    bg:        "#110500",
    gradient:  "radial-gradient(ellipse at 75% -20%, #ea580c40 0%, #110500 60%), linear-gradient(160deg, #110500 0%, #1c0800 100%)",
    accent:    "#f97316",
    accent2:   "#ef4444",
    tagColor:  "#fdba74",
    tagBg:     "rgba(249,115,22,0.15)",
    ctaGrad:   "linear-gradient(135deg, #ea580c, #dc2626)",
    statColor: "#fb923c",
    tag: "Sports & Fitness",
    headline: "New Arrivals\nEvery Single Day",
    sub: "Gear up with premium performance equipment.",
    cta: "Shop Sports",
    href: "/categories/sports",
    stat: "60+",
    statLabel: "Sport categories",
  },
];

const PROMO_BANNERS = [
  {
    icon: Store,
    tag: "Become a Seller",
    title: "Start Your Store",
    sub: "Register and reach millions of buyers across India",
    cta: "Get Started",
    href: "/become-seller",
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
    accent: "#6366f1",
    accentGlow: "#4f46e5",
    iconGrad: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    ctaGrad: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    tagColor: "#a5b4fc",
    glowColor: "rgba(99,102,241,0.3)",
  },
];

export function HeroCarousel() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);

  const next = useCallback(() => setActive((p) => (p + 1) % SLIDES.length), []);
  const prev = useCallback(() => setActive((p) => (p - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMounted(true), 120);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!mounted || hovered) return;
    const t = window.setInterval(next, 4500);
    return () => window.clearInterval(t);
  }, [next, hovered, mounted]);

  if (!mounted) return <div style={{ minHeight: 360 }} className="bg-[#010a1e]" />;

  const slide = SLIDES[active];

  return (
    <div>
      {/* ── Main carousel ── */}
      <div
        className="relative overflow-hidden"
        style={{ minHeight: 360 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          key={active}
          className="relative flex items-center overflow-hidden"
          style={{
            background: slide.gradient,
            minHeight: 360,
            animation: "slideCarousel 0.45s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          {/* Fine dot-grid texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Primary glow — top right, large */}
          <div
            className="absolute right-0 top-0 h-[700px] w-[700px] -translate-y-1/3 translate-x-1/3 rounded-full pointer-events-none"
            style={{ background: slide.accent, filter: "blur(120px)", opacity: 0.28 }}
          />

          {/* Secondary glow — bottom left */}
          <div
            className="absolute left-0 bottom-0 h-[450px] w-[450px] translate-y-1/3 -translate-x-1/4 rounded-full pointer-events-none"
            style={{ background: slide.accent2, filter: "blur(100px)", opacity: 0.18 }}
          />

          {/* Center subtle glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 60% 50%, ${slide.accent}0e 0%, transparent 65%)`,
            }}
          />

          {/* Diagonal shimmer line */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(110deg, transparent 35%, ${slide.accent}12 50%, transparent 65%)`,
            }}
          />

          {/* Top edge highlight */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, ${slide.accent}40, transparent)` }}
          />

          <div className="relative flex w-full items-center justify-between px-6 py-14 sm:px-10 sm:py-16 xl:px-14 2xl:px-20">
            {/* LEFT — Text */}
            <div className="max-w-xl">

              {/* Tag pill */}
              <span
                className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] md:text-[15px] md:px-5 md:py-1.5 font-bold uppercase tracking-[0.16em]"
                style={{ color: slide.tagColor, background: slide.tagBg, border: `1px solid ${slide.accent}35` }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{ background: slide.tagColor }}
                />
                {slide.tag}
              </span>

              {/* Headline */}
              <h2
                className="mb-5 whitespace-pre-line leading-[1.02] tracking-[-0.04em] text-white font-extrabold"
                style={{
                  fontSize: "clamp(2rem,6vw,5.2rem)",
                  textShadow: `0 2px 40px rgba(0,0,0,0.5)`,
                }}
              >
                {slide.headline}
              </h2>

              {/* Sub */}
              <p className="mb-8 text-[14px] md:text-[19px] text-white/50 leading-relaxed max-w-sm md:max-w-xl">
                {slide.sub}
              </p>

              {/* CTA row */}
              <div className="flex items-center gap-4">
                <Link
                  href={slide.href}
                  className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-[13px] md:text-[18px] md:px-9 md:py-5 md:rounded-2xl font-bold text-white transition-all hover:brightness-115 active:scale-[0.97]"
                  style={{
                    background: slide.ctaGrad,
                    boxShadow: `0 8px 28px ${slide.accent}50, 0 2px 8px rgba(0,0,0,0.3)`,
                  }}
                >
                  {slide.cta}
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <span className="text-[12px] md:text-[16px] text-white/30 font-medium hidden sm:block">
                  Free delivery on ₹499+
                </span>
              </div>
            </div>

            {/* RIGHT — Large stat */}
            <div className="hidden sm:flex flex-col items-end gap-2 text-right select-none">
              {/* Decorative ring behind stat */}
              <div className="relative flex items-center justify-end">
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: "clamp(140px,22vw,260px)",
                    height: "clamp(140px,22vw,260px)",
                    border: `1px solid ${slide.accent}22`,
                    right: "-24px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: "clamp(100px,16vw,190px)",
                    height: "clamp(100px,16vw,190px)",
                    border: `1px solid ${slide.accent}15`,
                    right: "-10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <div className="relative z-10 flex flex-col items-end">
                  <span
                    className="font-extrabold tracking-[-0.06em] leading-none tabular-nums"
                    style={{
                      fontSize: "clamp(3.5rem,9vw,7rem)",
                      color: slide.statColor,
                      textShadow: `0 0 80px ${slide.accent}80, 0 0 120px ${slide.accent}40`,
                    }}
                  >
                    {slide.stat}
                  </span>
                  <span
                    className="text-[12px] font-semibold mt-1.5 uppercase tracking-[0.1em]"
                    style={{ color: `${slide.accent}80` }}
                  >
                    {slide.statLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prev / Next arrows */}
        <button
          onClick={prev}
          aria-label="Previous"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white transition-all hover:scale-110"
          style={{
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.2s, transform 0.15s",
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={next}
          aria-label="Next"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white transition-all hover:scale-110"
          style={{
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.2s, transform 0.15s",
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{
                height: 4,
                width: active === i ? 24 : 4,
                background: active === i ? s.accent : "rgba(255,255,255,0.25)",
                boxShadow: active === i ? `0 0 8px ${s.accent}` : "none",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Promo banners row ── */}
      <div className="px-4 py-3 sm:px-6 lg:px-8 xl:px-12" style={{ background: "#080c18" }}>
        {PROMO_BANNERS.map((b) => (
          <Link
            key={b.title}
            href={b.href}
            className="relative flex items-center gap-5 overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01] hover:brightness-110 active:scale-[0.99]"
            style={{
              background: b.gradient,
              boxShadow: `0 4px 32px ${b.glowColor}, 0 1px 0 rgba(255,255,255,0.06) inset`,
              border: `1px solid rgba(255,255,255,0.08)`,
            }}
          >
            {/* Background glow orb */}
            <div
              className="absolute right-0 top-0 h-[200px] w-[200px] translate-x-1/3 -translate-y-1/3 rounded-full pointer-events-none"
              style={{ background: b.accent, filter: "blur(70px)", opacity: 0.25 }}
            />
            {/* Dot grid texture */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            {/* Icon */}
            <div
              className="relative z-10 flex h-12 w-12 md:h-16 md:w-16 shrink-0 items-center justify-center rounded-xl md:rounded-2xl text-white shadow-lg"
              style={{ background: b.iconGrad, boxShadow: `0 4px 16px ${b.accentGlow}60` }}
            >
              <b.icon className="h-5 w-5 md:h-8 md:w-8" />
            </div>

            {/* Text */}
            <div className="relative z-10 flex-1 min-w-0">
              <p
                className="text-[10px] md:text-[15px] font-bold uppercase tracking-[0.15em] mb-0.5 md:mb-1"
                style={{ color: b.tagColor }}
              >
                {b.tag}
              </p>
              <p className="text-[15px] md:text-[26px] font-extrabold text-white leading-tight">{b.title}</p>
              <p className="text-[12px] md:text-[17px] mt-0.5 md:mt-1.5 text-white/45 line-clamp-1">{b.sub}</p>
            </div>

            {/* CTA pill */}
            <div
              className="relative z-10 hidden sm:flex shrink-0 items-center gap-1.5 rounded-xl md:rounded-2xl px-4 py-2 md:px-7 md:py-4 text-[12px] md:text-[17px] font-bold text-white"
              style={{
                background: b.ctaGrad,
                boxShadow: `0 4px 16px ${b.accentGlow}50`,
              }}
            >
              {b.cta}
              <ChevronRight className="h-3.5 w-3.5 md:h-5 md:w-5" />
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        @keyframes slideCarousel {
          from { opacity: 0; transform: translateX(24px) scale(0.985); filter: brightness(0.6); }
          to   { opacity: 1; transform: translateX(0) scale(1); filter: brightness(1); }
        }
      `}</style>
    </div>
  );
}
