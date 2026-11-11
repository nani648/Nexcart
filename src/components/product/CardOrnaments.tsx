/**
 * Decorative overlays for ornamental product card designs.
 *
 * Inline SVG rather than image files: they scale to any card size, cost no
 * extra network request, inherit `currentColor` so a seller's store colour can
 * tint them, and add nothing to the image budget on a grid of 50 products.
 *
 * Every ornament is purely decorative — `aria-hidden` and `pointer-events-none`
 * so it never intercepts a tap on the card link or blocks a screen reader.
 */

export type OrnamentKey =
  | "floral"
  | "botanical"
  | "festive"
  | "luxe"
  | "sparkle"
  | "wave"
  | "crown"
  | "confetti"
  | "star"
  | "palm";

interface OrnamentProps {
  /** Accent colour, usually the seller's store colour. */
  color?: string;
}

/** Soft rose spray in the top-right, with a faint mirrored echo bottom-left. */
function FloralOrnament({ color = "#d946a6" }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <g opacity="0.5" transform="translate(88 14)" fill={color}>
        <circle r="7" opacity="0.55" />
        <circle r="7" cx="-11" cy="6" opacity="0.4" />
        <circle r="7" cx="4" cy="12" opacity="0.45" />
        <circle r="7" cx="-8" cy="-9" opacity="0.35" />
        <circle r="3.2" cx="-2" cy="1" opacity="0.85" />
      </g>
      <g opacity="0.28" transform="translate(16 104)" fill={color}>
        <circle r="5.5" />
        <circle r="5.5" cx="9" cy="-5" opacity="0.7" />
        <circle r="5.5" cx="-4" cy="-9" opacity="0.6" />
        <circle r="2.4" cx="2" cy="-3" opacity="0.9" />
      </g>
      <path
        d="M104 30 C96 46, 84 54, 70 58"
        fill="none"
        stroke={color}
        strokeWidth="1.1"
        opacity="0.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Leafy vine tracing the left edge and curling across the base. */
function BotanicalOrnament({ color = "#3f7d4f" }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <g opacity="0.42" stroke={color} fill="none" strokeLinecap="round">
        <path d="M10 6 C10 40, 12 78, 26 114" strokeWidth="1.2" />
        <path d="M10 26 C18 22, 24 24, 27 30" strokeWidth="1" />
        <path d="M11 46 C3 42, -1 44, -2 50" strokeWidth="1" />
        <path d="M13 66 C21 62, 27 64, 30 70" strokeWidth="1" />
        <path d="M17 88 C9 85, 5 87, 4 93" strokeWidth="1" />
      </g>
      <g opacity="0.34" fill={color}>
        <ellipse cx="28" cy="30" rx="5.5" ry="2.6" transform="rotate(-28 28 30)" />
        <ellipse cx="-1" cy="50" rx="5.5" ry="2.6" transform="rotate(24 -1 50)" />
        <ellipse cx="31" cy="70" rx="5.5" ry="2.6" transform="rotate(-28 31 70)" />
        <ellipse cx="3" cy="93" rx="5" ry="2.4" transform="rotate(24 3 93)" />
      </g>
    </svg>
  );
}

/** Marigold-style rosette corners — a festive, rangoli-adjacent motif. */
function FestiveOrnament({ color = "#e08a1e" }: OrnamentProps) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <g opacity="0.45" transform="translate(12 12)" fill={color}>
        {petals.map((deg) => (
          <ellipse key={deg} rx="3" ry="8" transform={`rotate(${deg}) translate(0 -7)`} opacity="0.7" />
        ))}
        <circle r="3" />
      </g>
      <g opacity="0.3" transform="translate(108 108)" fill={color}>
        {petals.map((deg) => (
          <ellipse key={deg} rx="2.4" ry="6.4" transform={`rotate(${deg}) translate(0 -6)`} opacity="0.7" />
        ))}
        <circle r="2.4" />
      </g>
      <path
        d="M0 100 Q30 92 60 100 T120 100"
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.22"
        strokeDasharray="3 5"
      />
    </svg>
  );
}

/** Restrained double hairline with corner flourishes — quiet luxury. */
function LuxeOrnament({ color = "#a98240" }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <rect
        x="5" y="5" width="110" height="110"
        fill="none" stroke={color} strokeWidth="0.9" opacity="0.5"
      />
      <rect
        x="8.5" y="8.5" width="103" height="103"
        fill="none" stroke={color} strokeWidth="0.5" opacity="0.28"
      />
      <g stroke={color} strokeWidth="0.9" fill="none" opacity="0.55" strokeLinecap="round">
        <path d="M5 18 C12 18, 18 12, 18 5" />
        <path d="M115 18 C108 18, 102 12, 102 5" />
        <path d="M5 102 C12 102, 18 108, 18 115" />
        <path d="M115 102 C108 102, 102 108, 102 115" />
      </g>
    </svg>
  );
}

/** Scattered four-point sparkles with a couple of pinpricks — a shimmer. */
function SparkleOrnament({ color = "#a855f7" }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <g fill={color}>
        <path d="M20 14 L22 20 L28 22 L22 24 L20 30 L18 24 L12 22 L18 20 Z" opacity="0.55" />
        <path d="M98 24 L100 29 L105 31 L100 33 L98 38 L96 33 L91 31 L96 29 Z" opacity="0.4" />
        <path d="M104 90 L106.5 96 L113 98 L106.5 100 L104 106 L101.5 100 L95 98 L101.5 96 Z" opacity="0.5" />
        <circle cx="70" cy="16" r="2" opacity="0.5" />
        <circle cx="14" cy="70" r="1.6" opacity="0.4" />
        <circle cx="90" cy="60" r="1.4" opacity="0.32" />
      </g>
    </svg>
  );
}

/** Two soft wave lines low in the card, with a couple of rising bubbles. */
function WaveOrnament({ color = "#0ea5e9" }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <g fill="none" stroke={color} strokeLinecap="round">
        <path d="M-4 100 Q16 88, 36 100 T76 100 T124 100" strokeWidth="1.4" opacity="0.4" />
        <path d="M-4 109 Q16 99, 36 109 T76 109 T124 109" strokeWidth="1.1" opacity="0.26" />
      </g>
      <g fill={color} opacity="0.3">
        <circle cx="18" cy="18" r="3" />
        <circle cx="30" cy="11" r="1.8" />
      </g>
    </svg>
  );
}

/** Small jewelled crown, top-right, with a faint echo bottom-left. */
function CrownOrnament({ color = "#b8860b" }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <g transform="translate(92 20)" fill={color} opacity="0.5">
        <path d="M-14 6 L-14 -2 L-8 4 L-4 -8 L0 4 L4 -8 L8 4 L14 -2 L14 6 Z" />
        <rect x="-14" y="6" width="28" height="3" rx="1" />
      </g>
      <g transform="translate(16 102) scale(0.6)" fill={color} opacity="0.26">
        <path d="M-14 6 L-14 -2 L-8 4 L-4 -8 L0 4 L4 -8 L8 4 L14 -2 L14 6 Z" />
        <rect x="-14" y="6" width="28" height="3" rx="1" />
      </g>
    </svg>
  );
}

/** Scattered confetti squares in a small fixed palette (color prop is one hue among several — true confetti reads as multicolor, not tinted). */
function ConfettiOrnament({ color = "#f472b6" }: OrnamentProps) {
  const palette = [color, "#facc15", "#60a5fa", "#34d399"];
  const pieces = [
    { x: 14, y: 16, r: 22, c: 0 },
    { x: 30, y: 10, r: -12, c: 1 },
    { x: 100, y: 20, r: 40, c: 2 },
    { x: 108, y: 34, r: -25, c: 3 },
    { x: 12, y: 100, r: 15, c: 1 },
    { x: 26, y: 108, r: -30, c: 2 },
    { x: 102, y: 100, r: 10, c: 0 },
  ];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      {pieces.map((p, i) => (
        <rect
          key={i}
          x={p.x}
          y={p.y}
          width="5"
          height="5"
          rx="1"
          fill={palette[p.c % palette.length]}
          opacity="0.5"
          transform={`rotate(${p.r} ${p.x + 2.5} ${p.y + 2.5})`}
        />
      ))}
    </svg>
  );
}

/** Scattered four-point stars of varying size — for a night-sky design. */
function StarOrnament({ color = "#facc15" }: OrnamentProps) {
  const stars = [
    { x: 20, y: 20, s: 1 },
    { x: 96, y: 16, s: 0.7 },
    { x: 106, y: 50, s: 0.5 },
    { x: 14, y: 60, s: 0.6 },
    { x: 90, y: 92, s: 0.8 },
    { x: 40, y: 8, s: 0.4 },
  ];
  const starPath = "M0 -6 L1.8 -1.8 L6 0 L1.8 1.8 L0 6 L-1.8 1.8 L-6 0 L-1.8 -1.8 Z";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <g fill={color}>
        {stars.map((s, i) => (
          <path key={i} d={starPath} transform={`translate(${s.x} ${s.y}) scale(${s.s})`} opacity={0.35 + s.s * 0.4} />
        ))}
      </g>
    </svg>
  );
}

/** Two palm fronds fanning up from the bottom-left corner. */
function PalmOrnament({ color = "#16a34a" }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <g transform="translate(6 114)" fill={color} opacity="0.4">
        <path d="M0 0 C14 -18, 10 -40, 2 -54 C16 -42, 30 -30, 36 -10 C22 -14, 10 -10, 0 0 Z" />
        <path d="M0 0 C20 -10, 34 -26, 38 -44 C44 -28, 44 -12, 38 4 C26 -4, 12 -4, 0 0 Z" opacity="0.85" />
        <path d="M0 0 C8 -6, 20 -6, 30 2 C18 4, 8 8, 0 14 Z" opacity="0.7" />
      </g>
    </svg>
  );
}

const ORNAMENTS: Record<OrnamentKey, (props: OrnamentProps) => JSX.Element> = {
  floral: FloralOrnament,
  botanical: BotanicalOrnament,
  festive: FestiveOrnament,
  luxe: LuxeOrnament,
  sparkle: SparkleOrnament,
  wave: WaveOrnament,
  crown: CrownOrnament,
  confetti: ConfettiOrnament,
  star: StarOrnament,
  palm: PalmOrnament,
};

export function CardOrnament({ ornament, color }: { ornament?: OrnamentKey; color?: string }) {
  if (!ornament) return null;
  const Component = ORNAMENTS[ornament];
  if (!Component) return null;
  // Explicit (non-auto) z-index so this decorative layer is guaranteed to
  // paint *below* the image zone and info section regardless of whether
  // those siblings are in normal flow or positioned — z-index:auto on a
  // positioned element can otherwise still paint above plain static text,
  // which let ornaments wash over product names/prices on some card designs.
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      <Component color={color} />
    </div>
  );
}
