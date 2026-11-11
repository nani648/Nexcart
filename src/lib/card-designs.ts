/**
 * Product card designs.
 *
 * Each product carries its own design (`Product.cardDesign`), so one storefront
 * grid can mix styles. This module is the single source of truth: the seller's
 * picker, the storefront card and the API validator all read from CARD_DESIGNS,
 * so adding a style here makes it available everywhere.
 *
 * Pure and dependency-free — safe to import from server and client.
 *
 * SHAPE NOTE: ProductCard styles its frame with an inline style object rather
 * than utility classes, so designs are expressed the same way (a style factory
 * plus a couple of class hints). A registry of Tailwind classes would look
 * tidier here but would not actually reach the component.
 *
 * RANDOM NOTE: there is no randomness at render time. A random choice is
 * resolved ONCE on write and the concrete key is stored. Randomising during
 * render would make the server and browser disagree — a React hydration
 * mismatch — and cards would change on every refresh, which reads as a bug.
 * `pickRandomDesignKey()` exists only for that write-time resolution.
 */

import type { CSSProperties } from "react";
import type { OrnamentKey } from "@/components/product/CardOrnaments";

export type CardDesignKey =
  | "none"
  | "minimal"
  | "bordered"
  | "elevated"
  | "compact"
  | "showcase"
  | "glass"
  | "polaroid"
  | "floral"
  | "botanical"
  | "festive"
  | "luxe"
  | "aurora"
  | "marble"
  | "neon"
  | "sunset"
  | "ocean"
  | "emerald"
  | "royal"
  | "candy"
  | "midnight"
  | "tropical";

export interface CardDesignMeta {
  key: CardDesignKey;
  label: string;
  /** One-line description shown in the seller's picker. */
  description: string;
  /**
   * Tailwind `aspect-[W/H]` class for the image zone — a RATIO, not a fixed
   * pixel height. Card width is fluid (2/3/4-column grid, any viewport), so
   * a fixed height per breakpoint drifts in and out of proportion as the
   * actual rendered width changes — looking fine at one window size and
   * stretched/squashed at another, independent of which breakpoint's number
   * you tune. An aspect ratio scales with the card's own width automatically,
   * so it looks right at every size without per-breakpoint values at all.
   */
  mediaAspect: string;
  /** Extra classes for the content area below the image. */
  bodyClass: string;
  /** Renders the title over the image instead of beneath it. */
  overlay?: boolean;
  /** Tints the frame with the seller's brand colour. */
  usesStoreColor?: boolean;
  /** Frame padding around the media, for framed looks like Polaroid. */
  framePad?: string;
  /** Decorative SVG overlay drawn behind the content. */
  ornament?: OrnamentKey;
  /** Default accent for the ornament when the seller has no store colour. */
  ornamentColor?: string;
  /** Marks the design as decorative, for grouping in the seller's picker. */
  decorative?: boolean;
}

interface FrameContext {
  hovered: boolean;
  /** Seller brand colour (hex), when the design uses it. */
  storeColor?: string;
}

/** Metadata + the frame style factory for one design. */
interface CardDesignDef extends CardDesignMeta {
  frame: (ctx: FrameContext) => CSSProperties;
}

const TRANSITION = "box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease";

export const CARD_DESIGNS: Record<CardDesignKey, CardDesignDef> = {
  none: {
    key: "none",
    label: "None",
    description: "No design applied — a plain card with no border, shadow or background.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    // Every value here is a hard "off": no fill, no outline, no lift, no
    // rounding, no hover reaction. This is the true baseline every other
    // design decorates on top of — see the module-level RANDOM NOTE for why
    // it's still safe to land in the "Surprise me" pool along with the rest.
    frame: () => ({
      background: "transparent",
      border: "none",
      boxShadow: "none",
      borderRadius: 0,
    }),
  },

  minimal: {
    key: "minimal",
    label: "Minimal",
    description: "No border or shadow. Lets the photo do the work.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "px-0.5",
    frame: ({ hovered }) => ({
      background: "transparent",
      border: "1px solid transparent",
      boxShadow: "none",
      borderRadius: 12,
      opacity: hovered ? 0.92 : 1,
      transition: TRANSITION + ", opacity 0.22s ease",
    }),
  },

  bordered: {
    key: "bordered",
    label: "Bordered",
    description: "Crisp outline on every card. Tidy, catalogue-like.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    frame: ({ hovered }) => ({
      background: "#ffffff",
      border: hovered ? "1px solid #a1a1aa" : "1px solid #e4e4e7",
      boxShadow: hovered ? "0 4px 14px rgba(0,0,0,0.06)" : "0 1px 4px rgba(0,0,0,0.03)",
      borderRadius: 12,
      transition: TRANSITION,
    }),
  },

  elevated: {
    key: "elevated",
    label: "Elevated",
    description: "Soft shadow that lifts on hover. Feels premium.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    frame: ({ hovered }) => ({
      background: "#ffffff",
      border: "1px solid rgba(228,228,231,0.6)",
      boxShadow: hovered
        ? "0 16px 40px rgba(0,0,0,0.13)"
        : "0 2px 10px rgba(0,0,0,0.05)",
      borderRadius: 16,
      transition: TRANSITION,
    }),
  },

  compact: {
    key: "compact",
    label: "Compact",
    description: "Dense and small. Fits more products per row.",
    mediaAspect: "aspect-[400/243]",
    bodyClass: "text-[12px]",
    frame: ({ hovered }) => ({
      background: "#ffffff",
      border: hovered ? "1px solid #d4d4d8" : "1px solid #ececef",
      boxShadow: "none",
      borderRadius: 8,
      transition: TRANSITION,
    }),
  },

  showcase: {
    key: "showcase",
    label: "Showcase",
    description: "Tall, dark-framed photo. Best for strong product shots.",
    mediaAspect: "aspect-[25/27]",
    bodyClass: "",
    overlay: true,
    frame: ({ hovered }) => ({
      background: "#0a0a0a",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: hovered
        ? "0 18px 44px rgba(0,0,0,0.30)"
        : "0 3px 14px rgba(0,0,0,0.16)",
      borderRadius: 16,
      transition: TRANSITION,
    }),
  },

  glass: {
    key: "glass",
    label: "Glass",
    description: "Frosted panel tinted with your store colour.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    usesStoreColor: true,
    frame: ({ hovered, storeColor }) => ({
      background: hovered ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.09)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: hovered
        ? `1px solid ${storeColor ? `${storeColor}66` : "rgba(255,255,255,0.22)"}`
        : "1px solid rgba(255,255,255,0.10)",
      boxShadow: hovered
        ? "0 8px 32px rgba(0,0,0,0.35)"
        : "0 2px 12px rgba(0,0,0,0.25)",
      borderRadius: 16,
      transition: TRANSITION,
    }),
  },

  polaroid: {
    key: "polaroid",
    label: "Polaroid",
    description: "Framed photo with a wide base. Playful, handmade feel.",
    mediaAspect: "aspect-[100/81]",
    bodyClass: "pb-2",
    framePad: "p-2 pb-0",
    frame: ({ hovered }) => ({
      background: "#fdfdfb",
      border: "1px solid #e7e5e0",
      boxShadow: hovered
        ? "0 10px 26px rgba(0,0,0,0.14)"
        : "0 2px 8px rgba(0,0,0,0.07)",
      borderRadius: 6,
      transition: TRANSITION,
    }),
  },
  // ── Decorative ───────────────────────────────────────────────────────────
  // These carry an SVG ornament (see components/product/CardOrnaments.tsx).
  // Backgrounds stay very pale so product photography still leads; the
  // ornament sits behind the content at low opacity, never over the image.

  floral: {
    key: "floral",
    label: "Floral",
    description: "Blush card with a soft rose spray in the corner.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    ornament: "floral",
    ornamentColor: "#d946a6",
    decorative: true,
    usesStoreColor: true,
    frame: ({ hovered }) => ({
      background: "#fff7fb",
      border: hovered ? "1px solid #f0b7d8" : "1px solid #f6dcea",
      boxShadow: hovered ? "0 8px 24px rgba(217,70,166,0.13)" : "0 1px 6px rgba(217,70,166,0.06)",
      borderRadius: 16,
      transition: TRANSITION,
    }),
  },

  botanical: {
    key: "botanical",
    label: "Botanical",
    description: "Cream card with a leafy vine down the edge.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    ornament: "botanical",
    ornamentColor: "#3f7d4f",
    decorative: true,
    frame: ({ hovered }) => ({
      background: "#f8faf5",
      border: hovered ? "1px solid #b9d0bd" : "1px solid #dde8dd",
      boxShadow: hovered ? "0 8px 24px rgba(63,125,79,0.12)" : "0 1px 6px rgba(63,125,79,0.05)",
      borderRadius: 14,
      transition: TRANSITION,
    }),
  },

  festive: {
    key: "festive",
    label: "Festive",
    description: "Marigold rosettes at the corners. Good for festival sales.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    ornament: "festive",
    ornamentColor: "#e08a1e",
    decorative: true,
    usesStoreColor: true,
    frame: ({ hovered }) => ({
      background: "#fffaf0",
      border: hovered ? "1px solid #f0c88a" : "1px solid #f7e3c2",
      boxShadow: hovered ? "0 8px 24px rgba(224,138,30,0.16)" : "0 1px 6px rgba(224,138,30,0.07)",
      borderRadius: 14,
      transition: TRANSITION,
    }),
  },

  luxe: {
    key: "luxe",
    label: "Luxe",
    description: "Gold double hairline with corner flourishes.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    ornament: "luxe",
    ornamentColor: "#a98240",
    decorative: true,
    framePad: "p-1.5",
    frame: ({ hovered }) => ({
      background: "#fdfcf8",
      border: hovered ? "1px solid #d8c08a" : "1px solid #ebe0c8",
      boxShadow: hovered ? "0 10px 28px rgba(169,130,64,0.15)" : "0 1px 6px rgba(169,130,64,0.06)",
      borderRadius: 4,
      transition: TRANSITION,
    }),
  },

  // ── Decorative, round two ────────────────────────────────────────────────
  // Two of these (neon, midnight) are dark-photo-frame cards, so they set
  // `overlay: true` — this only affects the frame's own fill colour now,
  // since the info block always renders below the photo in plain text and
  // has no seller-colour-driven text logic left to key off this flag. The
  // other eight stay pale for the same reason the first round did: default
  // body text is dark, so a light background is what keeps it legible.

  aurora: {
    key: "aurora",
    label: "Aurora",
    description: "Iridescent pastel wash with a scatter of sparkle.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    ornament: "sparkle",
    ornamentColor: "#a855f7",
    decorative: true,
    frame: ({ hovered }) => ({
      background: "linear-gradient(135deg, #fdf4ff 0%, #f0f9ff 35%, #fefce8 70%, #fff1f2 100%)",
      border: hovered ? "1px solid #c4b5fd" : "1px solid #e9d5ff",
      boxShadow: hovered ? "0 10px 30px rgba(168,85,247,0.18)" : "0 2px 10px rgba(168,85,247,0.08)",
      borderRadius: 18,
      transition: TRANSITION,
    }),
  },

  marble: {
    key: "marble",
    label: "Marble",
    description: "Warm stone-grey marble tones with a fine gold hairline.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    decorative: true,
    frame: ({ hovered }) => ({
      background: "linear-gradient(160deg, #fbfbfa 0%, #f3f1ee 45%, #ece7df 100%)",
      border: hovered ? "1px solid #d6cfc2" : "1px solid #e8e3d9",
      boxShadow: hovered ? "0 12px 30px rgba(120,113,98,0.16)" : "0 2px 8px rgba(120,113,98,0.06)",
      borderRadius: 10,
      transition: TRANSITION,
    }),
  },

  neon: {
    key: "neon",
    label: "Neon",
    description: "Near-black card with a glowing cyan-magenta edge. Bold, for tech and gaming.",
    mediaAspect: "aspect-[25/27]",
    bodyClass: "",
    overlay: true,
    decorative: true,
    frame: ({ hovered }) => ({
      background: "#0b0b14",
      border: hovered ? "1px solid #22d3ee" : "1px solid rgba(34,211,238,0.35)",
      boxShadow: hovered
        ? "0 0 26px rgba(34,211,238,0.45), 0 0 50px rgba(217,70,239,0.22)"
        : "0 0 14px rgba(34,211,238,0.22)",
      borderRadius: 14,
      transition: TRANSITION + ", box-shadow 0.22s ease",
    }),
  },

  sunset: {
    key: "sunset",
    label: "Sunset",
    description: "Soft coral-to-violet gradient, like golden hour.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    decorative: true,
    frame: ({ hovered }) => ({
      background: "linear-gradient(150deg, #fff1eb 0%, #fde2e2 40%, #f3e8ff 100%)",
      border: hovered ? "1px solid #f0b8a8" : "1px solid #f7d9d0",
      boxShadow: hovered ? "0 10px 28px rgba(244,114,90,0.16)" : "0 2px 10px rgba(244,114,90,0.07)",
      borderRadius: 16,
      transition: TRANSITION,
    }),
  },

  ocean: {
    key: "ocean",
    label: "Ocean",
    description: "Cool aqua gradient with a gentle wave line. Fresh, for beauty and outdoor goods.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    ornament: "wave",
    ornamentColor: "#0ea5e9",
    decorative: true,
    frame: ({ hovered }) => ({
      background: "linear-gradient(160deg, #f0fbff 0%, #e0f4fb 100%)",
      border: hovered ? "1px solid #93cbe0" : "1px solid #c9e8f2",
      boxShadow: hovered ? "0 8px 24px rgba(14,165,233,0.15)" : "0 1px 6px rgba(14,165,233,0.06)",
      borderRadius: 16,
      transition: TRANSITION,
    }),
  },

  emerald: {
    key: "emerald",
    label: "Emerald",
    description: "Soft emerald tint with a gold foil border. Rich and botanical.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    decorative: true,
    framePad: "p-1",
    frame: ({ hovered }) => ({
      background: "linear-gradient(160deg, #f4faf6 0%, #e9f5ec 100%)",
      border: hovered ? "1px solid #a8cbb0" : "1px solid #cfe6d5",
      boxShadow: hovered ? "0 10px 26px rgba(16,120,70,0.16)" : "0 1px 6px rgba(16,120,70,0.06)",
      borderRadius: 10,
      transition: TRANSITION,
    }),
  },

  royal: {
    key: "royal",
    label: "Royal",
    description: "Pale plum card with a gold crown motif. Regal, for premium and gifting brands.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    ornament: "crown",
    ornamentColor: "#b8860b",
    decorative: true,
    frame: ({ hovered }) => ({
      background: "#faf5ff",
      border: hovered ? "1px solid #d6bdf0" : "1px solid #e8d9f5",
      boxShadow: hovered ? "0 10px 28px rgba(124,58,237,0.15)" : "0 1px 6px rgba(124,58,237,0.06)",
      borderRadius: 14,
      transition: TRANSITION,
    }),
  },

  candy: {
    key: "candy",
    label: "Candy",
    description: "Playful pastel gradient with a sprinkle of confetti. Fun, for kids and gifting stores.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    ornament: "confetti",
    ornamentColor: "#f472b6",
    decorative: true,
    frame: ({ hovered }) => ({
      background: "linear-gradient(135deg, #fff0f6 0%, #fef9e7 50%, #eef9f2 100%)",
      border: hovered ? "1px solid #f5b8d3" : "1px solid #fbdce9",
      boxShadow: hovered ? "0 10px 26px rgba(244,114,182,0.16)" : "0 1px 6px rgba(244,114,182,0.06)",
      borderRadius: 18,
      transition: TRANSITION,
    }),
  },

  midnight: {
    key: "midnight",
    label: "Midnight",
    description: "Deep navy night sky scattered with gold stars. Dramatic, for jewellery and eveningwear.",
    mediaAspect: "aspect-[25/27]",
    bodyClass: "",
    overlay: true,
    ornament: "star",
    ornamentColor: "#facc15",
    decorative: true,
    frame: ({ hovered }) => ({
      background: "#0d1226",
      border: hovered ? "1px solid #3b4374" : "1px solid rgba(250,204,21,0.18)",
      boxShadow: hovered ? "0 18px 42px rgba(0,0,0,0.4)" : "0 3px 14px rgba(0,0,0,0.22)",
      borderRadius: 16,
      transition: TRANSITION,
    }),
  },

  tropical: {
    key: "tropical",
    label: "Tropical",
    description: "Sunny gradient with palm leaves in the corner. Fresh, for summer and travel goods.",
    mediaAspect: "aspect-[80/81]",
    bodyClass: "",
    ornament: "palm",
    ornamentColor: "#16a34a",
    decorative: true,
    frame: ({ hovered }) => ({
      background: "linear-gradient(150deg, #fefce8 0%, #f0fdf4 100%)",
      border: hovered ? "1px solid #a3d9a5" : "1px solid #d3ecd4",
      boxShadow: hovered ? "0 8px 24px rgba(22,163,74,0.14)" : "0 1px 6px rgba(22,163,74,0.05)",
      borderRadius: 16,
      transition: TRANSITION,
    }),
  },
};

/* ── Text styles ────────────────────────────────────────────────────────────
   A separate axis from the card design, so any font pairs with any frame — a
   seller can put handwritten text on a minimal card, or a serif on floral.
   The families are loaded in app/layout.tsx via next/font and wired up in
   tailwind.config.ts; before that, `font-serif` and `font-display` silently
   fell back to Georgia and Geist Sans.                                       */

export type CardFontKey =
  | "sans"
  | "serif"
  | "display"
  | "script"
  | "mono"
  | "poppins"
  | "montserrat"
  | "bebas"
  | "cormorant"
  | "nunito"
  | "oswald"
  | "quicksand"
  | "dmserif"
  | "outfit"
  | "pacifico";

export interface CardFont {
  key: CardFontKey;
  label: string;
  description: string;
  /** Applied to the product title. */
  titleClass: string;
  /** Applied to the price. */
  priceClass: string;
}

export const CARD_FONTS: Record<CardFontKey, CardFont> = {
  sans: {
    key: "sans",
    label: "Clean",
    description: "Geist Sans — the default. Neutral and highly readable.",
    titleClass: "font-sans",
    priceClass: "font-sans",
  },
  serif: {
    key: "serif",
    label: "Elegant",
    description: "Playfair Display — high contrast serif. Suits jewellery, fashion, decor.",
    titleClass: "font-serif tracking-normal",
    priceClass: "font-serif",
  },
  display: {
    key: "display",
    label: "Bold",
    description: "Space Grotesk — geometric and confident. Good for electronics and streetwear.",
    titleClass: "font-display tracking-tight",
    priceClass: "font-display tracking-tight",
  },
  script: {
    key: "script",
    label: "Handwritten",
    description: "Caveat — casual script. Suits handmade, bakery and gifting stores.",
    // Script faces read small at the same px size, so the title is nudged up.
    titleClass: "font-script text-[15px] md:text-[26px] leading-tight",
    priceClass: "font-sans",
  },
  mono: {
    key: "mono",
    label: "Technical",
    description: "Geist Mono — fixed width. Suits parts, tools and spec-led listings.",
    titleClass: "font-mono tracking-tight",
    priceClass: "font-mono",
  },

  // ── Second round — ten more, picked for real e-commerce use cases ────────
  poppins: {
    key: "poppins",
    label: "Modern",
    description: "Poppins — clean geometric sans with rounded warmth. Easy to scan on mobile, works for almost any store.",
    titleClass: "font-poppins font-semibold",
    priceClass: "font-poppins font-semibold",
  },
  montserrat: {
    key: "montserrat",
    label: "Premium",
    description: "Montserrat — polished geometric sans used by top DTC brands. Confident and trustworthy.",
    titleClass: "font-montserrat font-medium tracking-tight",
    priceClass: "font-montserrat font-semibold",
  },
  bebas: {
    key: "bebas",
    label: "Bold Sale",
    description: "Bebas Neue — tall condensed caps. Built for prices, discounts and flash-sale badges.",
    // Condensed caps read small at normal sizes, same nudge pattern as script.
    titleClass: "font-bebas tracking-wide uppercase text-[14px] md:text-[24px] leading-tight",
    priceClass: "font-bebas tracking-wide",
  },
  cormorant: {
    key: "cormorant",
    label: "Luxury",
    description: "Cormorant Garamond — refined high-fashion serif. Suits jewellery, bridal and premium decor.",
    titleClass: "font-cormorant text-[15px] md:text-[25px] leading-tight",
    priceClass: "font-cormorant",
  },
  nunito: {
    key: "nunito",
    label: "Friendly",
    description: "Nunito — soft rounded sans. Warm and approachable, great for kids', baby and home stores.",
    titleClass: "font-nunito font-semibold",
    priceClass: "font-nunito font-bold",
  },
  oswald: {
    key: "oswald",
    label: "Editorial",
    description: "Oswald — bold condensed headline font. Strong shelf presence for streetwear and sportswear.",
    titleClass: "font-oswald uppercase tracking-wide",
    priceClass: "font-oswald",
  },
  quicksand: {
    key: "quicksand",
    label: "Soft Minimal",
    description: "Quicksand — light rounded geometric sans. Calm and airy, suits wellness and beauty brands.",
    titleClass: "font-quicksand font-medium",
    priceClass: "font-quicksand font-semibold",
  },
  dmserif: {
    key: "dmserif",
    label: "Editorial Serif",
    description: "DM Serif Display — dramatic high-contrast serif. Suits home decor and magazine-style listings.",
    titleClass: "font-dmserif text-[15px] md:text-[24px] leading-tight",
    priceClass: "font-dmserif",
  },
  outfit: {
    key: "outfit",
    label: "Minimal Tech",
    description: "Outfit — ultra-clean geometric sans. Suits electronics, gadgets and minimalist brands.",
    titleClass: "font-outfit tracking-tight",
    priceClass: "font-outfit font-medium",
  },
  pacifico: {
    key: "pacifico",
    label: "Playful Script",
    description: "Pacifico — bold rounded script. Fun and casual, for bakery, candy and gifting stores.",
    titleClass: "font-pacifico text-[15px] md:text-[24px] leading-tight",
    priceClass: "font-sans",
  },
};

export const CARD_FONT_KEYS = Object.keys(CARD_FONTS) as CardFontKey[];
export const CARD_FONT_LIST: CardFont[] = CARD_FONT_KEYS.map((k) => CARD_FONTS[k]);
export const DEFAULT_CARD_FONT: CardFontKey = "sans";

export function isCardFontKey(value: unknown): value is CardFontKey {
  return typeof value === "string" && value in CARD_FONTS;
}

/** Resolve a stored font value, falling back to the default. */
export function resolveCardFont(value: unknown): CardFont {
  return isCardFontKey(value) ? CARD_FONTS[value] : CARD_FONTS[DEFAULT_CARD_FONT];
}

/** Normalise a submitted font value for storage. "random" is resolved on write. */
export function normalizeFontForStorage(value: unknown): CardFontKey {
  if (value === RANDOM_DESIGN_VALUE) {
    return CARD_FONT_KEYS[Math.floor(Math.random() * CARD_FONT_KEYS.length)];
  }
  return isCardFontKey(value) ? value : DEFAULT_CARD_FONT;
}

export const CARD_DESIGN_KEYS = Object.keys(CARD_DESIGNS) as CardDesignKey[];

/** Metadata only — safe to send to the client picker without the functions. */
export const CARD_DESIGN_LIST: CardDesignMeta[] = CARD_DESIGN_KEYS.map((k) => {
  const { frame: _frame, ...meta } = CARD_DESIGNS[k];
  return meta;
});

export const DEFAULT_CARD_DESIGN: CardDesignKey = "bordered";

/** Sentinel the picker submits to mean "choose one for me". */
export const RANDOM_DESIGN_VALUE = "random";

export function isCardDesignKey(value: unknown): value is CardDesignKey {
  return typeof value === "string" && value in CARD_DESIGNS;
}

/**
 * Resolve a stored value to a real design, falling back to the default.
 * Null values (products predating this feature) and keys later retired from the
 * registry degrade gracefully — a bad value must never break a storefront.
 */
export function resolveCardDesign(value: unknown): CardDesignDef {
  return isCardDesignKey(value) ? CARD_DESIGNS[value] : CARD_DESIGNS[DEFAULT_CARD_DESIGN];
}

/**
 * Pick a random design key. Call ONLY when persisting a choice (product
 * creation, or the "randomise all" bulk action) — never during render.
 */
export function pickRandomDesignKey(): CardDesignKey {
  return CARD_DESIGN_KEYS[Math.floor(Math.random() * CARD_DESIGN_KEYS.length)];
}

/**
 * Normalise a submitted design value for storage. Resolving "random" here is
 * what makes the choice permanent, so the product looks identical on every
 * subsequent page load.
 */
export function normalizeDesignForStorage(value: unknown): CardDesignKey {
  if (value === RANDOM_DESIGN_VALUE) return pickRandomDesignKey();
  return isCardDesignKey(value) ? value : DEFAULT_CARD_DESIGN;
}
