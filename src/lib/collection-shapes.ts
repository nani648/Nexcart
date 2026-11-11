/**
 * Icon-frame shapes for Store Collection circles on the storefront (the
 * tappable "Shirts", "Sarees", etc. icons above the product grid) — lets a
 * seller swap the classic plain circle for a themed frame (e.g. a palace-gate
 * arch), independently per collection, or apply one shape to every collection
 * at once. Stored in `StoreCollection.iconShape` — same raw-SQL, no-Prisma-
 * model pattern as `fontStyle` (see collection-heading-styles.ts and the
 * migration in prisma/migrations/20260815_..._add_collection_icon_shape).
 * NULL means "no shape chosen yet" → falls back to "circle", i.e. pixel-
 * identical to how every collection rendered before this feature existed.
 *
 * Every shape is expressed as a single Tailwind arbitrary-value class driving
 * either `border-radius` or `clip-path`, using PERCENTAGES only (never px) —
 * the same reason product-card image zones moved from fixed pixel heights to
 * `aspect-[W/H]` ratios: a percentage-based shape scales cleanly with
 * whatever size box it's dropped into (56px mobile pill, 96px desktop pill,
 * 80px "View All" grid tile, a picker preview swatch, …) instead of looking
 * right only at the one size it was tuned for.
 *
 * Rendering note: a plain CSS `border` does NOT draw a clean outline around a
 * `clip-path` shape — the border paints along the element's rectangular box
 * edge, which a polygon like a diamond or star only touches at a few single
 * points, so the border would appear as barely-visible slivers instead of a
 * ring. Render sites must NOT rely on `border-*` for the active-state ring;
 * instead wrap the shaped tile in a slightly larger same-shape container and
 * use padding + background colour to fake a uniform-width ring (works
 * identically for both `border-radius` and `clip-path` shapes, so every
 * render site can share one code path regardless of which shape is active).
 */

export type CollectionShapeKey =
  | "circle"
  | "arch"
  | "rounded_square"
  | "squircle"
  | "hexagon"
  | "diamond"
  | "shield"
  | "octagon"
  | "petal"
  | "star";

export interface CollectionShapeDef {
  key: CollectionShapeKey;
  label: string;
  description: string;
  /** Tailwind class applying the shape (border-radius or clip-path). Apply
   * this SAME class to both the outer ring layer and the inner image layer
   * — see the file doc comment above for why. */
  shapeClass: string;
}

export const COLLECTION_SHAPES: CollectionShapeDef[] = [
  {
    key: "circle",
    label: "Classic Circle",
    description: "The original round icon — no change for existing collections.",
    shapeClass: "rounded-full",
  },
  {
    key: "arch",
    label: "Palace Arch",
    description: "Domed gateway top, flat base — like a palace entrance.",
    shapeClass: "[border-radius:50%_50%_10%_10%]",
  },
  {
    key: "rounded_square",
    label: "Rounded Square",
    description: "Soft-edged square frame.",
    shapeClass: "[border-radius:18%]",
  },
  {
    key: "squircle",
    label: "Squircle",
    description: "Rounder, app-icon-style square.",
    shapeClass: "[border-radius:34%]",
  },
  {
    key: "hexagon",
    label: "Hexagon",
    description: "Six-sided modern frame.",
    shapeClass: "[clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]",
  },
  {
    key: "diamond",
    label: "Diamond",
    description: "Rotated square with sharp points.",
    shapeClass: "[clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]",
  },
  {
    key: "shield",
    label: "Shield",
    description: "Badge-style shield frame.",
    shapeClass: "[clip-path:polygon(50%_0%,100%_20%,100%_60%,50%_100%,0%_60%,0%_20%)]",
  },
  {
    key: "octagon",
    label: "Octagon",
    description: "Eight-sided stop-sign frame.",
    shapeClass: "[clip-path:polygon(30%_0%,70%_0%,100%_30%,100%_70%,70%_100%,30%_100%,0%_70%,0%_30%)]",
  },
  {
    key: "petal",
    label: "Petal",
    description: "Soft asymmetric teardrop.",
    shapeClass: "[border-radius:0%_50%_50%_50%]",
  },
  {
    key: "star",
    label: "Star",
    description: "Five-point star frame.",
    shapeClass:
      "[clip-path:polygon(50%_0%,61%_35%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_35%)]",
  },
];

export const DEFAULT_COLLECTION_SHAPE: CollectionShapeKey = "circle";

export function isCollectionShapeKey(value: unknown): value is CollectionShapeKey {
  return typeof value === "string" && COLLECTION_SHAPES.some((s) => s.key === value);
}

/** Resolve a stored `iconShape` value to its shape def, deterministically
 * falling back to the classic circle for null/invalid/unmigrated values —
 * never a random shape, so an unrecognised value never looks broken. */
export function resolveCollectionShape(value: unknown): CollectionShapeDef {
  const found = isCollectionShapeKey(value) ? COLLECTION_SHAPES.find((s) => s.key === value) : undefined;
  return found ?? (COLLECTION_SHAPES.find((s) => s.key === DEFAULT_COLLECTION_SHAPE) as CollectionShapeDef);
}
