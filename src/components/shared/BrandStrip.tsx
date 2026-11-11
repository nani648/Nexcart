"use client";

import Link from "next/link";
import { useState } from "react";

const BRANDS = [
  { name: "Samsung",  slug: "samsung",  color: "#ffffff", bg: "linear-gradient(135deg, #1428A0, #2a4fdf)" },
  { name: "Apple",    slug: "apple",    color: "#ffffff", bg: "linear-gradient(135deg, #1c1c1e, #3a3a3c)" },
  { name: "Nike",     slug: "nike",     color: "#ffffff", bg: "linear-gradient(135deg, #111111, #2d2d2d)" },
  { name: "Adidas",   slug: "adidas",   color: "#ffffff", bg: "linear-gradient(135deg, #000000, #1a1a1a)" },
  { name: "Sony",     slug: "sony",     color: "#ffffff", bg: "linear-gradient(135deg, #000000, #003087)" },
  { name: "LG",       slug: "lg",       color: "#ffffff", bg: "linear-gradient(135deg, #A50034, #d4003f)" },
  { name: "Bosch",    slug: "bosch",    color: "#ffffff", bg: "linear-gradient(135deg, #EA0016, #ff2533)" },
  { name: "Prestige", slug: null,       color: "#ffffff", bg: "linear-gradient(135deg, #7B0F0F, #b01818)" },
  { name: "boAt",     slug: null,       color: "#ffffff", bg: "linear-gradient(135deg, #E85D04, #F48C06)" },
  { name: "Puma",     slug: "puma",     color: "#ffffff", bg: "linear-gradient(135deg, #111827, #374151)" },
];

function BrandLogo({ slug, name, color, bg }: { slug: string | null; name: string; color: string; bg: string }) {
  const [failed, setFailed] = useState(false);

  if (slug && !failed) {
    return (
      <div
        className="flex h-10 w-10 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-xl p-1.5 md:p-2"
        style={{ background: bg }}
      >
        <img
          src={`https://cdn.simpleicons.org/${slug}/${color.replace("#", "")}`}
          alt={name}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-10 w-10 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-xl font-black text-white text-[15px] md:text-[20px]"
      style={{ background: bg }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function BrandStrip() {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="slabel">Top Brands</p>
          <h2 className="stitle">Shop by Brand</h2>
        </div>
      </div>
      <div
        className="flex gap-3 overflow-x-auto md:overflow-hidden pb-1 md:gap-2"
        style={{ scrollbarWidth: "none" }}
      >
        {BRANDS.map((brand) => (
          <Link
            key={brand.name}
            href={`/search?q=${encodeURIComponent(brand.name)}`}
            className="flex h-[60px] md:h-[90px] w-[120px] shrink-0 md:flex-1 flex-row items-center justify-center gap-2 md:gap-3 rounded-xl border border-border bg-white dark:bg-card shadow-xs transition-all duration-150 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 px-2 md:px-4"
          >
            <BrandLogo slug={brand.slug} name={brand.name} color={brand.color} bg={brand.bg} />
            <span className="text-[11px] md:text-[16px] font-bold text-foreground truncate">{brand.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
