/**
 * Decorative heading styles for Store Collection headings on the storefront
 * (the rectangle-box section titles like "SHIRTS", "PICKLES") — a separate,
 * lighter-weight system from the shared CARD_FONTS registry in
 * card-designs.ts. CARD_FONTS only changes the CSS font-family/class of the
 * EXISTING text (used for product-card titles, and as the plain-typeface
 * option for collection headings) — these styles instead TRANSFORM the text
 * itself (uppercase + Unicode character substitution) and wrap it with
 * decorative symbols, e.g. "Shirts" -> "✦ 𝓢𝓗𝓘𝓡𝓣𝓢 ✦". That only makes sense
 * for a short heading, never for a full product title, so it's
 * intentionally its own registry rather than folded into CARD_FONTS.
 *
 * Stored in the SAME `StoreCollection.fontStyle` column as CARD_FONT keys —
 * the two key spaces never collide (these all use a "deco_" prefix) — so no
 * extra schema change was needed. A stored value is resolved by checking
 * this registry FIRST (see getCollectionHeadingStyle); only if it isn't a
 * decorative-style key does the storefront fall back to treating it as a
 * CARD_FONTS key instead (see resolveCardFont in card-designs.ts).
 */

export type CollectionHeadingStyleKey =
  | "deco_signature"
  | "deco_royal"
  | "deco_fullwidth"
  | "deco_swords"
  | "deco_bloom"
  | "deco_blossom";

export interface CollectionHeadingStyle {
  key: CollectionHeadingStyleKey;
  label: string;
  description: string;
  /** Pure — same name always produces the same styled string, so this is
   * safe to call during server render with no hydration-mismatch risk. */
  apply: (name: string) => string;
}

// Mathematical Bold Script (U+1D4D0.. for A-Z, U+1D4EA.. for a-z) is a
// CONTIGUOUS Unicode block — unlike the plain (non-bold) Script block, it
// has no compatibility-decomposition gaps that redirect certain letters
// (B, E, F, H, ...) to unrelated legacy codepoints — so a flat codepoint
// offset correctly covers every letter A-Z / a-z.
function toBoldScript(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      out += String.fromCodePoint(0x1d4d0 + (code - 65)); // A-Z
    } else if (code >= 97 && code <= 122) {
      out += String.fromCodePoint(0x1d4ea + (code - 97)); // a-z
    } else {
      out += ch;
    }
  }
  return out;
}

// Fullwidth Forms block: every printable ASCII character (letters, digits,
// punctuation alike) sits at a fixed +0xFEE0 offset from its normal
// codepoint, so one flat shift covers the whole block.
function toFullwidth(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (code >= 0x21 && code <= 0x7e) {
      out += String.fromCodePoint(code + 0xfee0);
    } else {
      out += ch; // keep plain spaces — reads better in a short heading
    }
  }
  return out;
}

export const COLLECTION_HEADING_STYLES: CollectionHeadingStyle[] = [
  {
    key: "deco_signature",
    label: "Signature",
    description: "Elegant bold-script lettering framed with a star.",
    apply: (name) => `✦ ${toBoldScript(name.toUpperCase())} ✦`,
  },
  {
    key: "deco_royal",
    label: "Royal Frame",
    description: "Bold-script lettering inside ornate corner brackets.",
    apply: (name) => `꧁ ${toBoldScript(name.toUpperCase())} ꧂`,
  },
  {
    key: "deco_fullwidth",
    label: "Wide Spaced",
    description: "Wide, evenly-spaced letterforms framed with stars.",
    apply: (name) => `✦ ${toFullwidth(name.toUpperCase())} ✦`,
  },
  {
    key: "deco_swords",
    label: "Bold Edge",
    description: "Crisp uppercase framed with crossed swords.",
    apply: (name) => `⚔ ${name.toUpperCase()} ⚔`,
  },
  {
    key: "deco_bloom",
    label: "Bloom",
    description: "Crisp uppercase framed with a flower mark.",
    apply: (name) => `ꕤ ${name.toUpperCase()} ꕤ`,
  },
  {
    key: "deco_blossom",
    label: "Blossom",
    description: "Crisp uppercase framed with a blossom mark.",
    apply: (name) => `❀ ${name.toUpperCase()} ❀`,
  },
];

export function isCollectionHeadingStyleKey(value: unknown): value is CollectionHeadingStyleKey {
  return typeof value === "string" && COLLECTION_HEADING_STYLES.some((s) => s.key === value);
}

/** Resolve a stored fontStyle value to a decorative heading style, or null
 * if it isn't one (e.g. it's a plain CARD_FONTS key, or unset). */
export function getCollectionHeadingStyle(value: unknown): CollectionHeadingStyle | null {
  if (!isCollectionHeadingStyleKey(value)) return null;
  return COLLECTION_HEADING_STYLES.find((s) => s.key === value) ?? null;
}
