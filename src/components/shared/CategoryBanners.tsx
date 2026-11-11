"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Smartphone, Shirt, Home, BookOpen, Dumbbell, Sparkles,
  Gamepad2, Car, ShoppingBasket, Leaf, HeartPulse, PawPrint,
  ChevronRight,
} from "lucide-react";

const CATEGORIES = [
  {
    name: "Electronics",    slug: "electronics",    Icon: Smartphone, emoji: "📱", tag: "2000+ Products",
    desc: "Phones, Laptops, TVs, Audio & the latest gadgets at the best prices",
    grad: "linear-gradient(135deg, #60a5fa 0%, #818cf8 100%)",
    glow: "rgba(96,165,250,0.35)", lightBg: "rgba(255,255,255,0.2)", iconColor: "#fff",
    highlights: ["Smartphones", "Laptops", "Smart Watches", "Cameras"],
  },
  {
    name: "Fashion",        slug: "fashion",        Icon: Shirt,      emoji: "🧥", tag: "5000+ Products",
    desc: "Clothing, Shoes, Bags, Jewellery & accessories for men, women & kids",
    grad: "linear-gradient(135deg, #f472b6 0%, #fb7185 100%)",
    glow: "rgba(244,114,182,0.35)", lightBg: "rgba(255,255,255,0.2)", iconColor: "#fff",
    highlights: ["Men's Clothing", "Women's Clothing", "Footwear", "Jewellery"],
  },
  {
    name: "Home & Kitchen", slug: "home-kitchen",  Icon: Home,       emoji: "🏠", tag: "3000+ Products",
    desc: "Cookware, Furniture, Décor, Bedding & everything you need at home",
    grad: "linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)",
    glow: "rgba(251,191,36,0.35)", lightBg: "rgba(255,255,255,0.2)", iconColor: "#fff",
    highlights: ["Cookware", "Bedding", "Home Decor", "Lighting"],
  },
  {
    name: "Books",          slug: "books",          Icon: BookOpen,   emoji: "📚", tag: "1000+ Products",
    desc: "Fiction, Non-Fiction, Textbooks, Children's Books & graphic novels",
    grad: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
    glow: "rgba(52,211,153,0.35)", lightBg: "rgba(255,255,255,0.2)", iconColor: "#fff",
    highlights: ["Fiction", "Self Help", "Textbooks", "Children's Books"],
  },
  {
    name: "Sports & Fitness", slug: "sports-fitness", Icon: Dumbbell, emoji: "🏆", tag: "1500+ Products",
    desc: "Cricket, Football, Gym Equipment, Yoga & all outdoor sports gear",
    grad: "linear-gradient(135deg, #f87171 0%, #ef4444 100%)",
    glow: "rgba(248,113,113,0.35)", lightBg: "rgba(255,255,255,0.2)", iconColor: "#fff",
    highlights: ["Cricket", "Gym & Fitness", "Yoga", "Cycling"],
  },
  {
    name: "Beauty",         slug: "beauty",         Icon: Sparkles,   emoji: "✨", tag: "2500+ Products",
    desc: "Skincare, Makeup, Hair Care, Fragrances & professional beauty tools",
    grad: "linear-gradient(135deg, #c084fc 0%, #e879f9 100%)",
    glow: "rgba(192,132,252,0.35)", lightBg: "rgba(255,255,255,0.2)", iconColor: "#fff",
    highlights: ["Skin Care", "Makeup", "Hair Care", "Fragrances"],
  },
  {
    name: "Toys & Games",   slug: "toys-games",     Icon: Gamepad2,   emoji: "🎮", tag: "800+ Products",
    desc: "Action Figures, Board Games, Learning Toys & fun for all ages",
    grad: "linear-gradient(135deg, #22d3ee 0%, #38bdf8 100%)",
    glow: "rgba(34,211,238,0.35)", lightBg: "rgba(255,255,255,0.2)", iconColor: "#fff",
    highlights: ["Action Figures", "Board Games", "Learning Toys", "Outdoor Play"],
  },
  {
    name: "Automotive",     slug: "automotive",     Icon: Car,        emoji: "🚗", tag: "600+ Products",
    desc: "Car & Bike Accessories, Tools, Helmets, GPS Trackers & more",
    grad: "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
    glow: "rgba(148,163,184,0.35)", lightBg: "rgba(255,255,255,0.2)", iconColor: "#fff",
    highlights: ["Car Accessories", "Helmets", "Car Care", "GPS & Trackers"],
  },
  {
    name: "Groceries",      slug: "groceries",      Icon: ShoppingBasket, emoji: "🛒", tag: "1200+ Products",
    desc: "Fresh Fruits, Dairy, Snacks, Beverages & all your daily essentials",
    grad: "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)",
    glow: "rgba(74,222,128,0.35)", lightBg: "rgba(255,255,255,0.2)", iconColor: "#fff",
    highlights: ["Fruits & Vegetables", "Dairy & Eggs", "Snacks", "Organic Foods"],
  },
  {
    name: "Garden & Outdoors", slug: "garden-outdoors", Icon: Leaf,   emoji: "🌿", tag: "400+ Products",
    desc: "Plants, Seeds, Garden Tools, Pots, Soil & Outdoor Furniture",
    grad: "linear-gradient(135deg, #a3e635 0%, #84cc16 100%)",
    glow: "rgba(163,230,53,0.35)", lightBg: "rgba(255,255,255,0.2)", iconColor: "#fff",
    highlights: ["Seeds & Bulbs", "Pots & Planters", "Garden Tools", "Outdoor Furniture"],
  },
  {
    name: "Health & Wellness", slug: "health",      Icon: HeartPulse, emoji: "❤️", tag: "900+ Products",
    desc: "Vitamins, Medical Devices, Supplements & Personal Care products",
    grad: "linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)",
    glow: "rgba(251,113,133,0.35)", lightBg: "rgba(255,255,255,0.2)", iconColor: "#fff",
    highlights: ["Vitamins", "Medical Devices", "Ayurveda", "Baby Care"],
  },
  {
    name: "Pets",           slug: "pets",           Icon: PawPrint,   emoji: "🐾", tag: "350+ Products",
    desc: "Food, Toys, Accessories & Care Products for your beloved Pets",
    grad: "linear-gradient(135deg, #fb923c 0%, #f59e0b 100%)",
    glow: "rgba(251,146,60,0.35)", lightBg: "rgba(255,255,255,0.2)", iconColor: "#fff",
    highlights: ["Dog Food", "Cat Food", "Pet Toys", "Grooming"],
  },
];

function CategoryBanner({ name, slug, Icon, emoji, tag, desc, grad, glow, lightBg, iconColor, highlights }: (typeof CATEGORIES)[0]) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/categories/${slug}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex w-full overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl active:scale-[0.995]"
      style={{
        background: hovered ? grad : "#ffffff",
        border: hovered ? "1.5px solid transparent" : "1.5px solid #e5e7eb",
        boxShadow: hovered ? `0 20px 60px ${glow}` : "0 2px 10px rgba(0,0,0,0.05)",
        transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease",
        minHeight: 140,
      }}
    >
      {/* Left accent bar */}
      <div
        className="w-1.5 md:w-2 shrink-0 transition-all duration-300"
        style={{ background: hovered ? "rgba(255,255,255,0.3)" : grad }}
      />

      {/* Body */}
      <div className="flex flex-1 items-center gap-4 md:gap-8 px-5 py-5 md:px-8 md:py-7">
        {/* Icon */}
        <div
          className="flex h-16 w-16 md:h-24 md:w-24 shrink-0 items-center justify-center rounded-2xl md:rounded-3xl transition-all duration-300"
          style={{
            background: hovered ? "rgba(255,255,255,0.18)" : lightBg,
            boxShadow: hovered ? "0 4px 20px rgba(0,0,0,0.15)" : "none",
          }}
        >
          <Icon
            className="h-8 w-8 md:h-12 md:w-12 transition-colors duration-300"
            strokeWidth={1.6}
            style={{ color: hovered ? "#fff" : iconColor }}
          />
        </div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          {/* Tag + Name */}
          <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2 flex-wrap">
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] md:text-[13px] font-bold transition-colors duration-300"
              style={{
                background: hovered ? "rgba(255,255,255,0.2)" : lightBg,
                color: hovered ? "#fff" : iconColor,
              }}
            >
              {tag}
            </span>
          </div>
          <h3
            className="text-[18px] md:text-[28px] font-black leading-tight mb-1 md:mb-2 transition-colors duration-300"
            style={{ color: hovered ? "#fff" : "#111827" }}
          >
            {emoji} {name}
          </h3>
          <p
            className="text-[11px] md:text-[15px] leading-snug mb-2 md:mb-4 transition-colors duration-300 line-clamp-2"
            style={{ color: hovered ? "rgba(255,255,255,0.75)" : "#6b7280" }}
          >
            {desc}
          </p>

          {/* Subcategory chips */}
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            {highlights.map((h) => (
              <span
                key={h}
                className="rounded-full px-3 py-1 text-[12px] font-semibold transition-colors duration-300"
                style={{
                  background: hovered ? "rgba(255,255,255,0.15)" : "#f1f5f9",
                  color: hovered ? "rgba(255,255,255,0.9)" : "#475569",
                }}
              >
                {h}
              </span>
            ))}
          </div>
        </div>

        {/* Shop Now CTA */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          <div
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 md:px-6 md:py-3.5 text-[12px] md:text-[16px] font-bold transition-all duration-300 group-hover:gap-2.5"
            style={{
              background: hovered ? "rgba(255,255,255,0.22)" : grad,
              color: "#fff",
              border: hovered ? "1.5px solid rgba(255,255,255,0.3)" : "none",
            }}
          >
            Shop Now
            <ChevronRight className="h-4 w-4 md:h-5 md:w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function CategoryBanners() {
  return (
    <section>
      {/* Section header */}
      <div className="mb-6 md:mb-10 flex items-end justify-between">
        <div>
          <p className="mb-1.5 text-[10px] md:text-[14px] font-bold uppercase tracking-[0.22em] text-slate-400">
            All Departments
          </p>
          <h2 className="text-[22px] md:text-[38px] font-black tracking-tight text-slate-900 leading-none">
            Shop by Category
          </h2>
          <p className="mt-2 text-[12px] md:text-[16px] text-slate-500">
            Browse all 12 departments — hover to explore
          </p>
        </div>
      </div>

      {/* Full-width banners stacked */}
      <div className="flex flex-col gap-3 md:gap-4">
        {CATEGORIES.map((cat) => (
          <CategoryBanner key={cat.slug} {...cat} />
        ))}
      </div>
    </section>
  );
}
