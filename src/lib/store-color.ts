/**
 * Seller storefront "Page Colour" — sellers pick this in Dashboard → Settings
 * and it drives the accent colour across their public store page (banner,
 * buttons, badges, glows).
 *
 * Stored as a single string on `Seller.storeColor`:
 *   - "#rrggbb"          -> flat colour. Renderers that want a two-tone
 *                            effect fall back to their own darkened shade of
 *                            this one colour (kept local to each renderer
 *                            since the "how much darker" factor differs by
 *                            context — a banner gradient vs. a subtle text
 *                            shadow don't want the same amount of darkening).
 *   - "#rrggbb,#rrggbb"  -> an explicit two-colour gradient the seller chose
 *                            (from a curated preset, the random generator, or
 *                            built by hand with two colour pickers). Both
 *                            stops are used as-is.
 *
 * This file is the single source of truth for that format, the curated
 * palette, and the "surprise me" generator, so the Settings picker UI and
 * every place that renders `storeColor` all agree on it.
 */

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const GRADIENT_RE = /^#[0-9a-fA-F]{6},#[0-9a-fA-F]{6}$/;

export function isValidStoreColor(raw: string): boolean {
  return HEX_RE.test(raw) || GRADIENT_RE.test(raw);
}

/** True if `raw` encodes a two-colour gradient rather than a flat colour. */
export function isGradientStoreColor(raw: string | null | undefined): boolean {
  return !!raw && GRADIENT_RE.test(raw);
}

/**
 * Splits a stored `storeColor` value into its gradient stops.
 * - Two-colour value -> `{ primary, secondary }` with both stops as stored.
 * - Flat colour       -> `{ primary, secondary: null }`; caller decides how
 *   to derive a second stop (or doesn't need one).
 * - Missing/invalid    -> `null`; caller should fall back to a default.
 */
export function parseStoreColor(
  raw: string | null | undefined
): { primary: string; secondary: string | null } | null {
  if (!raw) return null;
  if (GRADIENT_RE.test(raw)) {
    const [c1, c2] = raw.split(",");
    return { primary: c1, secondary: c2 };
  }
  if (HEX_RE.test(raw)) return { primary: raw, secondary: null };
  return null;
}

/** Builds the storable value for a two-colour gradient. */
export function buildGradientValue(c1: string, c2: string): string {
  return `${c1},${c2}`;
}

/** Convenience: a ready-to-use `linear-gradient(...)` CSS value, or a flat colour if `secondary` is null. */
export function toCssBackground(
  parsed: { primary: string; secondary: string | null },
  angle = "135deg"
): string {
  return parsed.secondary
    ? `linear-gradient(${angle}, ${parsed.primary}, ${parsed.secondary})`
    : parsed.primary;
}

/**
 * Converts a "#rrggbb" hex string into an `rgba(r, g, b, alpha)` CSS value.
 * Shared so every renderer that tints something with a fraction of the
 * seller's colour (banner glows, the storefront page background, badges…)
 * computes the exact same output for the same input — including the
 * Settings live preview, which needs to match what the real storefront
 * page actually renders.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Contrast safety ──────────────────────────────────────────────────────
// The storefront renders white text/icons directly over `storeColor`, so a
// pale pick (cream, ivory, pastel...) needs a way to stay legible without
// forcing sellers into a dark-colours-only palette. `getRelativeLuminance`
// is the standard WCAG formula; `isLightColor` turns that into a simple
// yes/no renderers can branch on (e.g. darken text, or lay a scrim under it)
// instead of every consumer re-deriving its own threshold.

/** WCAG relative luminance (0 = black, 1 = white) of a "#rrggbb" hex string. */
export function getRelativeLuminance(hex: string): number {
  const c = HEX_RE.test(hex) ? hex : "#000000";
  const r = parseInt(c.slice(1, 3), 16) / 255;
  const g = parseInt(c.slice(3, 5), 16) / 255;
  const b = parseInt(c.slice(5, 7), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** True if `hex` is pale enough that plain white text/icons on it would be hard to read. */
export function isLightColor(hex: string, threshold = 0.6): boolean {
  return getRelativeLuminance(hex) > threshold;
}

/** True if either stop of a parsed storeColor is light — the conservative check for a gradient. */
export function isLightStoreColor(
  parsed: { primary: string; secondary: string | null } | null,
  threshold = 0.6
): boolean {
  if (!parsed) return false;
  return isLightColor(parsed.primary, threshold) || (!!parsed.secondary && isLightColor(parsed.secondary, threshold));
}

/** The readable colour to use for text/icons placed directly on `hex` — white, or a near-black for pale colours. */
export function getReadableTextColor(hex: string, threshold = 0.6): string {
  return isLightColor(hex, threshold) ? "#151515" : "#ffffff";
}

export interface GradientPreset {
  label: string;
  colors: [string, string];
}

export interface GradientCategory {
  category: string;
  gradients: GradientPreset[];
}

/**
 * A large, hand-curated library of two-tone gradients, organised the way a
 * design system would group a colour palette — by mood, not alphabetically.
 * Every pair is deliberately mid-to-dark in at least one stop so white text
 * and the existing text-shadow treatment on the storefront stay legible.
 * "Signature" is the featured/recommended row shown first.
 */
export const GRADIENT_CATEGORIES: GradientCategory[] = [
  {
    category: "Signature",
    gradients: [
      { label: "Royal Velvet",    colors: ["#4776E6", "#8E54E9"] },
      { label: "Emerald Empire",  colors: ["#0F2027", "#2C7744"] },
      { label: "Sunset Boulevard",colors: ["#FF512F", "#DD2476"] },
      { label: "Golden Hour",     colors: ["#F2994A", "#F2C94C"] },
      { label: "Deep Ocean",      colors: ["#000428", "#004E92"] },
      { label: "Rose Gold Luxe",  colors: ["#B24592", "#F15F79"] },
      { label: "Onyx Gold",       colors: ["#232526", "#BF953F"] },
      { label: "Aurora",          colors: ["#4E54C8", "#8F94FB"] },
    ],
  },
  {
    category: "Luxury & Elegant",
    gradients: [
      { label: "Black Diamond",   colors: ["#000000", "#434343"] },
      { label: "Platinum Silk",   colors: ["#BDC3C7", "#2C3E50"] },
      { label: "Burgundy Reserve",colors: ["#870000", "#190A05"] },
      { label: "Amethyst Dream",  colors: ["#8E2DE2", "#4A00E0"] },
      { label: "Champagne Gold",  colors: ["#D4AF37", "#7B5E12"] },
      { label: "Sapphire Depths", colors: ["#0F2027", "#2C5364"] },
      { label: "Twilight Mauve",  colors: ["#3A1C71", "#D76D77"] },
      { label: "Rosewood",        colors: ["#4B134F", "#C94B4B"] },
    ],
  },
  {
    category: "Vibrant & Bold",
    gradients: [
      { label: "Electric Violet", colors: ["#7F00FF", "#E100FF"] },
      { label: "Cyber Punk",      colors: ["#F953C6", "#B91D73"] },
      { label: "Neon Fire",       colors: ["#F83600", "#F9D423"] },
      { label: "Miami Vice",      colors: ["#FC466B", "#3F5EFB"] },
      { label: "Volcanic",        colors: ["#C31432", "#240B36"] },
      { label: "Tropical Punch",  colors: ["#FF0844", "#FFB199"] },
      { label: "Ultraviolet",     colors: ["#654EA3", "#EAAFC8"] },
      { label: "Cosmic Fusion",   colors: ["#FF00CC", "#333399"] },
    ],
  },
  {
    category: "Nature & Fresh",
    gradients: [
      { label: "Forest Canopy",   colors: ["#134E5E", "#71B280"] },
      { label: "Meadow Green",    colors: ["#56AB2F", "#A8E063"] },
      { label: "Mint Fresh",      colors: ["#00B09B", "#96C93D"] },
      { label: "Jade Garden",     colors: ["#0F9B0F", "#96E6A1"] },
      { label: "Autumn Leaves",   colors: ["#D38312", "#A83279"] },
      { label: "Bamboo",          colors: ["#11998E", "#38EF7D"] },
      { label: "Olive Sand",      colors: ["#3E5151", "#DECBA4"] },
      { label: "Pine Forest",     colors: ["#16222A", "#3A6073"] },
    ],
  },
  {
    category: "Ocean & Sky",
    gradients: [
      { label: "Deep Sea",        colors: ["#2C3E50", "#4CA1AF"] },
      { label: "Tropical Ocean",  colors: ["#2193B0", "#6DD5ED"] },
      { label: "Sky Voyage",      colors: ["#1488CC", "#2B32B2"] },
      { label: "Arctic Ice",      colors: ["#83A4D4", "#B6FBFF"] },
      { label: "Twilight Sky",    colors: ["#0F2027", "#203A43"] },
      { label: "Coral Reef",      colors: ["#00C9FF", "#92FE9D"] },
      { label: "Storm Front",     colors: ["#373B44", "#4286F4"] },
      { label: "Blue Lagoon",     colors: ["#4CA1AF", "#C4E0E5"] },
    ],
  },
  {
    category: "Warm & Sunset",
    gradients: [
      { label: "Peach Fizz",      colors: ["#ED4264", "#FFEDBC"] },
      { label: "Mango Tango",     colors: ["#FFE000", "#799F0C"] },
      { label: "Coral Sunset",    colors: ["#FF9A8B", "#FF6A88"] },
      { label: "Amber Glow",      colors: ["#F7971E", "#FFD200"] },
      { label: "Blood Orange",    colors: ["#CB356B", "#BD3F32"] },
      { label: "Fire Opal",       colors: ["#F12711", "#F5AF19"] },
      { label: "Desert Rose",     colors: ["#E96443", "#904E95"] },
      { label: "Papaya",          colors: ["#FFE259", "#FFA751"] },
    ],
  },
  {
    category: "Dark & Moody",
    gradients: [
      { label: "Void",            colors: ["#000000", "#1A1A2E"] },
      { label: "Ink Violet",      colors: ["#1A2980", "#26D0CE"] },
      { label: "Iron Gate",       colors: ["#29323C", "#485563"] },
      { label: "Obsidian",        colors: ["#232526", "#000000"] },
      { label: "Shadow Wolf",     colors: ["#0F0C29", "#302B63"] },
      { label: "Deep Slate",      colors: ["#2B5876", "#4E4376"] },
      { label: "Nightfall",       colors: ["#16222A", "#1A2980"] },
      { label: "Storm Cloud",     colors: ["#536976", "#292E49"] },
    ],
  },
  {
    category: "Pastel & Soft",
    gradients: [
      { label: "Cotton Candy",    colors: ["#FBC2EB", "#A6C1EE"] },
      { label: "Peach Cream",     colors: ["#FFDEE9", "#B5FFFC"] },
      { label: "Lavender Mist",   colors: ["#E0C3FC", "#8EC5FC"] },
      { label: "Soft Blush",      colors: ["#FFECD2", "#FCB69F"] },
      { label: "Mint Whisper",    colors: ["#D4FC79", "#96E6A1"] },
      { label: "Sky Pastel",      colors: ["#A1C4FD", "#C2E9FB"] },
    ],
  },
  {
    category: "Monochrome",
    gradients: [
      { label: "Slate Fade",      colors: ["#1A1A2E", "#4D4D4D"] },
      { label: "Ash to Fog",      colors: ["#333333", "#CCCCCC"] },
      { label: "Charcoal Pearl",  colors: ["#18181B", "#E6E6E6"] },
      { label: "Steel Wash",      colors: ["#4682B4", "#B3B3B3"] },
      { label: "Graphite Silver", colors: ["#333333", "#C0C0C0"] },
      { label: "Deep to Light",   colors: ["#0F172A", "#F5F5F5"] },
    ],
  },
  {
    category: "Earth & Autumn",
    gradients: [
      { label: "Sienna Dusk",     colors: ["#8B4513", "#D2691E"] },
      { label: "Saddle to Sand",  colors: ["#8B4513", "#F4A460"] },
      { label: "Wheat Field",     colors: ["#D2691E", "#F5DEB3"] },
      { label: "Terracotta",      colors: ["#A0522D", "#CD853F"] },
      { label: "Olive Grove",     colors: ["#556B2F", "#9ACD32"] },
      { label: "Copper Rose",     colors: ["#A0522D", "#BC8F8F"] },
    ],
  },
];

/** Flattened list of every gradient preset — handy when a category grouping isn't needed. */
export const GRADIENT_PRESETS: GradientPreset[] = GRADIENT_CATEGORIES.flatMap((c) => c.gradients);

export interface SolidPreset {
  label: string;
  hex: string;
}

export interface SolidCategory {
  category: string;
  colors: SolidPreset[];
}

// ── Full spectrum library (500 generated solids) ────────────────────────
// 20 hues around the colour wheel (18° apart) × 25 lightness steps each,
// built via the same HSL->hex conversion the "Surprise me" gradient
// generator already uses (`hslToHex`, defined further down — a plain
// `function` declaration, so it's hoisted and callable from here). Computed
// once at module load: arithmetic, not 500 individually hand-typed hex
// strings, so there's no possibility of a typo or an invalid hex slipping
// in — every value is a real, valid "#rrggbb".
const SPECTRUM_HUES: { name: string; hue: number }[] = [
  { name: "Red",          hue: 0 },
  { name: "Vermilion",    hue: 18 },
  { name: "Orange",       hue: 36 },
  { name: "Amber",        hue: 54 },
  { name: "Yellow",       hue: 72 },
  { name: "Chartreuse",   hue: 90 },
  { name: "Green",        hue: 108 },
  { name: "Emerald",      hue: 126 },
  { name: "Spring Green", hue: 144 },
  { name: "Teal",         hue: 162 },
  { name: "Cyan",         hue: 180 },
  { name: "Sky Blue",     hue: 198 },
  { name: "Azure",        hue: 216 },
  { name: "Blue",         hue: 234 },
  { name: "Indigo",       hue: 252 },
  { name: "Violet",       hue: 270 },
  { name: "Purple",       hue: 288 },
  { name: "Magenta",      hue: 306 },
  { name: "Pink",         hue: 324 },
  { name: "Rose",         hue: 342 },
];

const SPECTRUM_STEPS_PER_HUE = 25; // 20 hues × 25 steps = exactly 500

function buildHueRamp(hueName: string, hue: number): SolidPreset[] {
  const presets: SolidPreset[] = [];
  for (let i = 0; i < SPECTRUM_STEPS_PER_HUE; i++) {
    const t = i / (SPECTRUM_STEPS_PER_HUE - 1); // 0 → 1
    const lightness = 94 - t * 88; // 94% down to 6%
    // Slightly desaturate near white/black so those ends read as clean
    // near-neutrals instead of a neon or muddy version of the hue.
    const saturation = lightness > 85 || lightness < 15 ? 40 : 68;
    presets.push({
      label: `${hueName} ${Math.round(lightness)}`,
      hex: hslToHex(hue, saturation, lightness),
    });
  }
  return presets;
}

/** 20 hues × 25 lightness steps = 500 generated solids, one category per hue. */
const SPECTRUM_SOLID_CATEGORIES: SolidCategory[] = SPECTRUM_HUES.map(({ name, hue }) => ({
  category: name,
  colors: buildHueRamp(name, hue),
}));

// "Pure white at reduced opacity" has no single correct hex on its own — it
// depends on what's behind it, and this format (see the top of this file)
// is a plain opaque "#rrggbb" with no alpha channel. What's generated here
// is white composited over a solid black backdrop at each opacity level —
// the standard alpha-compositing result for white (result = 255 × opacity),
// i.e. exactly what `rgba(255,255,255,X)` would look like over a dark
// background, which is the overwhelmingly common real use for "soft white."
// Still a genuine, valid opaque hex at every step — not an approximation of
// the maths, just expressed as the equivalent solid shade since that's all
// this format can store.
const WHITE_OPACITY_LEVELS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
const WHITE_OPACITY_SOLIDS: SolidPreset[] = WHITE_OPACITY_LEVELS.map((pct) => {
  const channel = Math.round(255 * (pct / 100));
  const hexPair = channel.toString(16).padStart(2, "0");
  return { label: `White ${pct}%`, hex: `#${hexPair}${hexPair}${hexPair}` };
});

/** Curated flat-colour presets, grouped the same way as the gradients. */
export const SOLID_CATEGORIES: SolidCategory[] = [
  {
    category: "Classic",
    colors: [
      { label: "Forest Green", hex: "#16a34a" },
      { label: "Ruby Red",     hex: "#dc2626" },
      { label: "Ocean Blue",   hex: "#2563eb" },
      { label: "Royal Purple", hex: "#9333ea" },
      { label: "Sunset Orange",hex: "#ea580c" },
      { label: "Cyan Breeze",  hex: "#0891b2" },
      { label: "Hot Pink",     hex: "#db2777" },
      { label: "Amber Gold",   hex: "#ca8a04" },
    ],
  },
  {
    category: "Deep & Rich",
    colors: [
      { label: "Midnight",  hex: "#0f172a" },
      { label: "Wine Red",  hex: "#7f1d1d" },
      { label: "Emerald",   hex: "#047857" },
      { label: "Violet",    hex: "#7c3aed" },
      { label: "Navy",      hex: "#1e3a8a" },
      { label: "Espresso",  hex: "#451a03" },
      { label: "Charcoal",  hex: "#18181b" },
      { label: "Deep Rose", hex: "#be123c" },
    ],
  },
  {
    category: "Vibrant",
    colors: [
      { label: "Lime Punch",   hex: "#65a30d" },
      { label: "Fuchsia",      hex: "#c026d3" },
      { label: "Sky Blue",     hex: "#0284c7" },
      { label: "Teal",         hex: "#0d9488" },
      { label: "Indigo",       hex: "#4338ca" },
      { label: "Crimson",      hex: "#b91c1c" },
      { label: "Coral",        hex: "#f97316" },
      { label: "Cobalt",       hex: "#1d4ed8" },
    ],
  },
  {
    // Pale/near-white tones. These only look right because the storefront
    // now auto-switches to dark text/adds a scrim when it detects a light
    // `storeColor` (see `isLightColor` / `getReadableTextColor` above) —
    // without that, white banner text would vanish on any of these.
    category: "Light & Soft",
    colors: [
      { label: "Ivory Cream", hex: "#FFFAF0" },
      { label: "Pearl White", hex: "#F8F5EC" },
      { label: "Soft Sand",   hex: "#F5EBDD" },
      { label: "Blush Pearl", hex: "#FBEAE5" },
      { label: "Powder Blue", hex: "#E8F1F8" },
      { label: "Mint Cream",  hex: "#EAF6EF" },
    ],
  },
  // ── Expanded library ─────────────────────────────────────────────────────
  // A much larger, hue-organised sweep on top of the curated sets above —
  // covers the visible spectrum plus neutrals/greys so there's a solid
  // preset within a short reach of almost any colour a seller has in mind.
  // (True "every colour" is a continuous, infinite space — for that exact
  // shade, the search box and the custom colour picker below both accept
  // any hex directly.)
  {
    category: "Reds & Pinks",
    colors: [
      { label: "Tomato",     hex: "#FF6347" },
      { label: "Coral",      hex: "#FF7F50" },
      { label: "Salmon",     hex: "#FA8072" },
      { label: "Crimson",    hex: "#DC143C" },
      { label: "Hot Pink",   hex: "#FF69B4" },
      { label: "Deep Pink",  hex: "#FF1493" },
      { label: "Orchid",     hex: "#DA70D6" },
      { label: "Cerise",     hex: "#C71585" },
    ],
  },
  {
    category: "Oranges & Yellows",
    colors: [
      { label: "Gold",         hex: "#FFD700" },
      { label: "Orange",       hex: "#FFA500" },
      { label: "Dark Orange",  hex: "#FF8C00" },
      { label: "Khaki",        hex: "#F0E68C" },
      { label: "Goldenrod",    hex: "#DAA520" },
      { label: "Peru",         hex: "#CD853F" },
      { label: "Chocolate",    hex: "#D2691E" },
      { label: "Sandy Brown",  hex: "#F4A460" },
    ],
  },
  {
    category: "Greens",
    colors: [
      { label: "Lime Green",       hex: "#32CD32" },
      { label: "Spring Green",     hex: "#00FF7F" },
      { label: "Sea Green",        hex: "#2E8B57" },
      { label: "Medium Sea Green", hex: "#3CB371" },
      { label: "Olive Drab",       hex: "#6B8E23" },
      { label: "Dark Olive",       hex: "#556B2F" },
      { label: "Yellow Green",     hex: "#9ACD32" },
      { label: "Chartreuse",       hex: "#7FFF00" },
    ],
  },
  {
    category: "Blues & Cyans",
    colors: [
      { label: "Deep Sky Blue",    hex: "#00BFFF" },
      { label: "Dodger Blue",      hex: "#1E90FF" },
      { label: "Steel Blue",       hex: "#4682B4" },
      { label: "Cornflower Blue",  hex: "#6495ED" },
      { label: "Royal Blue",       hex: "#4169E1" },
      { label: "Medium Blue",      hex: "#0000CD" },
      { label: "Turquoise",        hex: "#40E0D0" },
      { label: "Dark Turquoise",   hex: "#00CED1" },
    ],
  },
  {
    category: "Purples & Violets",
    colors: [
      { label: "Medium Purple", hex: "#9370DB" },
      { label: "Blue Violet",   hex: "#8A2BE2" },
      { label: "Dark Violet",   hex: "#9400D3" },
      { label: "Dark Orchid",   hex: "#9932CC" },
      { label: "Indigo",        hex: "#4B0082" },
      { label: "Slate Blue",    hex: "#6A5ACD" },
      { label: "Medium Orchid", hex: "#BA55D3" },
      { label: "Thistle",       hex: "#D8BFD8" },
    ],
  },
  {
    category: "Earth & Neutral",
    colors: [
      { label: "Saddle Brown", hex: "#8B4513" },
      { label: "Sienna",       hex: "#A0522D" },
      { label: "Tan",          hex: "#D2B48C" },
      { label: "Beige",        hex: "#F5F5DC" },
      { label: "Wheat",        hex: "#F5DEB3" },
      { label: "Rosy Brown",   hex: "#BC8F8F" },
      { label: "Dim Gray",     hex: "#696969" },
      { label: "Silver",       hex: "#C0C0C0" },
    ],
  },
  {
    category: "Grayscale",
    colors: [
      { label: "Black",        hex: "#000000" },
      { label: "Onyx",         hex: "#1A1A1A" },
      { label: "Graphite",     hex: "#333333" },
      { label: "Slate Gray",   hex: "#4D4D4D" },
      { label: "Gray",         hex: "#666666" },
      { label: "Ash Gray",     hex: "#808080" },
      { label: "Light Gray",   hex: "#999999" },
      { label: "Pale Gray",    hex: "#B3B3B3" },
      { label: "Fog",          hex: "#CCCCCC" },
      { label: "Cloud",        hex: "#E6E6E6" },
      { label: "Snow",         hex: "#F5F5F5" },
      { label: "White",        hex: "#FFFFFF" },
    ],
  },
  {
    category: "White (Opacity)",
    colors: WHITE_OPACITY_SOLIDS,
  },
  // 500 generated solids — one category per hue (see SPECTRUM_SOLID_CATEGORIES above).
  ...SPECTRUM_SOLID_CATEGORIES,
];

/** Flattened list of every solid preset. */
export const SOLID_PRESETS: SolidPreset[] = SOLID_CATEGORIES.flatMap((c) => c.colors);

// ── Random "surprise me" gradient generator ─────────────────────────────
// Not just any two random colours — picks a base hue, then a second hue at
// a harmonious offset (analogous / complementary / near-triadic, chosen at
// random for variety), keeps saturation and lightness in ranges that read
// as "premium storefront" rather than neon or washed-out, and biases the
// second stop slightly darker so the pair has real depth. This is the same
// basic colour-theory approach a designer would use to pick a palette by
// hand, just automated so a seller can hit "Surprise me" for effectively
// unlimited good-looking, on-brand options beyond the curated presets.

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export type GradientHarmony = "analogous" | "complementary" | "triadic";

export function generateHarmoniousGradient(harmony?: GradientHarmony): [string, string] {
  const baseHue = Math.random() * 360;
  const style: GradientHarmony = harmony ?? (["analogous", "complementary", "triadic"] as const)[Math.floor(Math.random() * 3)];

  let hue2: number;
  if (style === "analogous") hue2 = (baseHue + 25 + Math.random() * 20) % 360;
  else if (style === "complementary") hue2 = (baseHue + 150 + Math.random() * 60) % 360;
  else hue2 = (baseHue + 100 + Math.random() * 40) % 360; // triadic-leaning

  const sat1 = 55 + Math.random() * 30;   // 55–85%: rich but not neon
  const sat2 = 55 + Math.random() * 30;
  const light1 = 40 + Math.random() * 12; // 40–52%
  const light2 = 28 + Math.random() * 15; // 28–43%: darker for gradient depth

  return [hslToHex(baseHue, sat1, light1), hslToHex(hue2, sat2, light2)];
}

// ── Colour search ────────────────────────────────────────────────────────
// Lets a seller search the *entire* library — every solid and every
// gradient, across every category — in one box, by name ("rose gold") or by
// hex ("#870000", or just "870000", or a 3-digit shorthand). Matching is
// layered so the most useful result always sorts first:
//   1. exact hex hit
//   2. hex substring hit (typed a fragment of a stop's hex)
//   3. name/category substring hit
//   4. nearest colours by perceptual distance (only computed for a valid hex
//      query, and only to fill out the list if steps 1–3 didn't already)
// All of this runs client-side over ~90 entries, so it's instant on every
// keystroke — no debounce or network round trip needed for "efficient".

/** Accepts "870000", "#870000", "abc", "#abc" (3-digit shorthand) and returns a normalised "#rrggbb", or null if it isn't a valid hex. */
export function normalizeHexInput(raw: string): string | null {
  const cleaned = raw.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) return `#${cleaned.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const expanded = cleaned.split("").map((ch) => ch + ch).join("");
    return `#${expanded.toLowerCase()}`;
  }
  return null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

/**
 * "Redmean" colour distance — a cheap, well-known approximation of
 * perceptual difference between two RGB colours (weights the channels by
 * how sensitive the eye is to each, unlike plain Euclidean RGB distance).
 * Lower = more similar. 0 = identical.
 */
export function colorDistance(hexA: string, hexB: string): number {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const rMean = (a.r + b.r) / 2;
  const dR = a.r - b.r;
  const dG = a.g - b.g;
  const dB = a.b - b.b;
  return Math.sqrt((2 + rMean / 256) * dR * dR + 4 * dG * dG + (2 + (255 - rMean) / 256) * dB * dB);
}

export type ColorSwatchType = "solid" | "gradient";
export type ColorMatchType = "exact-hex" | "partial-hex" | "name" | "nearest";

export interface SearchableSwatch {
  type: ColorSwatchType;
  label: string;
  category: string;
  hexes: string[]; // length 1 for a solid, 2 for a gradient
}

export interface ColorSearchResult extends SearchableSwatch {
  matchType: ColorMatchType;
}

/** Every preset — solid and gradient — flattened into one searchable index. */
export const ALL_SWATCHES: SearchableSwatch[] = [
  ...SOLID_CATEGORIES.flatMap((cat) =>
    cat.colors.map((c) => ({ type: "solid" as const, label: c.label, category: cat.category, hexes: [c.hex] }))
  ),
  ...GRADIENT_CATEGORIES.flatMap((cat) =>
    cat.gradients.map((g) => ({ type: "gradient" as const, label: g.label, category: cat.category, hexes: g.colors }))
  ),
];

/**
 * Searches the whole preset library by name or hex. Always returns results
 * sorted by relevance (see layers above). `limit` caps the result count —
 * the "nearest colours" fallback only kicks in for a valid hex query, and
 * only enough to top the list up to `limit`.
 */
export function searchColors(query: string, limit = 48): ColorSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hexQuery = normalizeHexInput(q);
  const hexDigits = q.replace(/^#/, "");

  const nameMatches: ColorSearchResult[] = [];
  const hexMatches: ColorSearchResult[] = [];

  for (const swatch of ALL_SWATCHES) {
    const labelHay = `${swatch.label} ${swatch.category}`.toLowerCase();
    if (labelHay.includes(q)) {
      nameMatches.push({ ...swatch, matchType: "name" });
      continue;
    }
    if (hexDigits.length >= 2) {
      const hexHit = swatch.hexes.some((h) => h.toLowerCase().replace("#", "").includes(hexDigits));
      if (hexHit) {
        const isExact = !!hexQuery && swatch.hexes.some((h) => h.toLowerCase() === hexQuery);
        hexMatches.push({ ...swatch, matchType: isExact ? "exact-hex" : "partial-hex" });
      }
    }
  }

  // Exact hex first, then other hex hits, then name hits.
  hexMatches.sort((a, b) => (a.matchType === "exact-hex" ? -1 : 0) - (b.matchType === "exact-hex" ? -1 : 0));
  let results: ColorSearchResult[] = [...hexMatches, ...nameMatches];

  // For a fully-typed hex, top up with the closest-looking presets so a
  // colour that isn't in the library yet still returns *something* useful.
  if (hexQuery && results.length < limit) {
    const already = new Set(results.map((r) => r.label));
    const nearest = ALL_SWATCHES
      .filter((s) => !already.has(s.label))
      .map((s) => ({ swatch: s, dist: Math.min(...s.hexes.map((h) => colorDistance(h, hexQuery))) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, limit - results.length)
      .map(({ swatch }): ColorSearchResult => ({ ...swatch, matchType: "nearest" }));
    results = [...results, ...nearest];
  }

  return results.slice(0, limit);
}
