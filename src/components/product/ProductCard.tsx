"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star, ImageOff } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useWishlistStore } from "@/lib/store";
import { formatPrice, cn } from "@/lib/utils";
import { calcDiscount, parseVariantLabel } from "@/lib/product-utils";
import { resolveCardDesign, resolveCardFont } from "@/lib/card-designs";
import { CardOrnament } from "@/components/product/CardOrnaments";
import { parseStoreColor, toCssBackground, hexToRgba } from "@/lib/store-color";

export interface ProductVariantProp {
  id: string;
  name: string;
  value: string;
  price?: number | null;
  stock: number;
}

interface ProductCardProps {
  id: string;
  productId: string;
  name: string;
  /** Full product description. A short snippet is derived from it and shown on the card, Flipkart-spec-line style. */
  description?: string | null;
  price: number;
  comparePrice?: number | null;
  image: string;
  rating: number;
  priority?: boolean;
  reviewCount: number;
  sellerId: string;
  sellerName: string;
  stock: number;
  isFeatured?: boolean;
  isNew?: boolean;
  className?: string;
  isSponsored?: boolean;
  isBestSeller?: boolean;
  isAssured?: boolean;
  deliveryDate?: string;
  /**
   * No longer rendered on the card — the info block was trimmed to match a
   * requested reference design (rating, name, store, price + offer,
   * description only). Kept in the prop type as a harmless no-op so
   * existing callers passing it don't need to change.
   */
  deliveryInfo?: string;
  bankOffer?: string;
  offers?: { id: string; title: string; offerType: string }[];
  condition?: "ORIGINAL" | "REFURBISHED" | "BOX_OPEN";
  variants?: ProductVariantProp[];
  images?: string[];
  blackBorder?: boolean;
  buyNowGradient?: string;
  glassy?: boolean;
  sellerColor?: string;
  /**
   * Per-product card style key (see lib/card-designs.ts). Unknown or missing
   * values fall back to the default design.
   */
  cardDesign?: string | null;
  /** Per-product text style key (see CARD_FONTS in lib/card-designs.ts). */
  cardFont?: string | null;
  /**
   * Manual override for the info block below the photo — set by the seller
   * on the Basic Information step. When filled, this exact text replaces
   * the auto title + description snippet (the real product name is still
   * used everywhere else — product page, cart, search). Blank/unset falls
   * back to the normal name + description display, unchanged.
   */
  cardDisplayText?: string | null;
  /**
   * Seller-wide colour/gradient (see lib/store-color.ts format) for a thin
   * padded border frame drawn around the outside of the PHOTO only — the
   * photo sits inset within it, like a small mat/frame. The info block
   * (name, price, variants) below the photo is never inside this frame.
   * Unset means "no border" — the photo renders exactly as it does today.
   */
  cardBorderColor?: string | null;
  /**
   * Focal point for the cover photo, as a CSS object-position value (e.g.
   * "50% 20%") — set by the seller dragging the photo in the Product Card
   * Design preview so a portrait shot's crop can be aimed at the part that
   * matters (a face, the border pattern, etc.) instead of always being cut
   * from dead centre. Unset/null means "50% 50%" (today's default, and
   * every existing product until a seller repositions one).
   */
  cardImagePosition?: string | null;
  /**
   * Whether this card auto-slides through ALL of the product's photos on a
   * timer (like the storefront's Store Highlights banner, but slower) —
   * set per-product on the Edit design page. Unset/false = today's default
   * behaviour unchanged (primary photo, swaps to the 2nd photo on hover
   * only). Has no effect on products with 0 or 1 image either way.
   */
  cardImageAutoSlide?: boolean | null;
  /**
   * Whether the small variant picker (size/colour dropdown) renders on this
   * card at all — set by the seller on the Add/Edit Product page, right
   * after configuring variants. Undefined/true = show (today's default
   * behaviour, unchanged); false = never render it here, even if the
   * product has multiple variants (the shopper picks on the product page
   * instead). Has no effect on products with 0 or 1 variant either way.
   */
  showVariantsOnCard?: boolean;
  /**
   * No longer needed. Card designs used to set a FIXED PIXEL height per
   * Tailwind breakpoint (mobile/`md:`), which responds to *viewport* width,
   * not this card's own rendered width — a narrow preview box on a wide
   * desktop screen would wrongly pick up the taller "desktop" height meant
   * for much wider grid cards, giving the preview a different aspect ratio
   * (and therefore a different `object-cover` crop) than the real card.
   * `mediaAspect` (see card-designs.ts) replaced fixed heights with a ratio
   * that scales with the card's own width, so every context — preview,
   * phone, wide desktop grid — is proportioned correctly automatically.
   * Kept as a harmless no-op prop so existing callers don't need updating.
   */
  previewMobileHeight?: boolean;
}

/**
 * Derives the short spec-line shown under the seller name — Flipkart cards
 * carry a one-line description/spec snippet there, not the full text.
 * Takes roughly half the description's length (so it scales with how much
 * the seller wrote) but hard-caps it at 80 characters so a long paragraph
 * doesn't blow out the card, and trims to the last whole word so it never
 * cuts a word in half.
 */
function truncateDescription(desc: string, percent = 0.5, maxChars = 80): string {
  if (!desc) return "";
  const trimmed = desc.trim();
  const targetLen = Math.min(Math.round(trimmed.length * percent), maxChars);
  if (targetLen >= trimmed.length) return trimmed;
  const slice = trimmed.slice(0, targetLen);
  const lastSpace = slice.lastIndexOf(" ");
  const clean = lastSpace > 20 ? slice.slice(0, lastSpace) : slice;
  return `${clean.trim()}…`;
}

/**
 * Frame used when the legacy `glassy` prop is passed directly.
 * Kept so existing callers keep their exact look without migrating to a design
 * key; the `glass` entry in the design registry is the equivalent for products
 * that opt in via cardDesign.
 */
const CARD_GLASS_FALLBACK = (hovered: boolean): React.CSSProperties => ({
  background: hovered ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.07)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: hovered ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.10)",
  boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.35)" : "0 2px 12px rgba(0,0,0,0.25)",
  // Radius previously lived in a `rounded-[12px]` class on the container; it
  // now comes from the style object so each design can set its own.
  borderRadius: 12,
  transition: "box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease",
});

export function ProductCard({
  id, productId, name, description, price, comparePrice, image,
  rating, reviewCount, sellerId, sellerName, stock,
  isFeatured, isBestSeller, isNew, condition, className, blackBorder, glassy,
  // deliveryInfo intentionally not destructured — see its doc comment on
  // ProductCardProps. No longer rendered; kept as a harmless no-op prop.
  variants = [], images = [],
  sellerColor,
  cardDesign,
  cardFont,
  cardDisplayText,
  cardBorderColor,
  cardImagePosition,
  cardImageAutoSlide,
  showVariantsOnCard = true,
  priority = false,
  // previewMobileHeight intentionally not destructured — see its doc
  // comment on ProductCardProps. mediaAspect made it a no-op; kept in the
  // prop type only so existing callers don't need to change.
}: ProductCardProps) {
  const objectPosition = cardImagePosition || "50% 50%";
  const design = resolveCardDesign(cardDesign);
  const font = resolveCardFont(cardFont);
  const variantRef = useRef<HTMLDivElement>(null);
  const [variantOpen, setVariantOpen] = useState(false);

  // Close variant picker on outside click
  useEffect(() => {
    if (!variantOpen) return;
    const fn = (e: MouseEvent) => {
      if (!variantRef.current?.contains(e.target as Node)) setVariantOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [variantOpen]);

  // mounted guards any wishlist / tilt logic that must not run on the server
  const [mounted, setMounted] = useState(false);
  const [hov, setHov] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [showSecondaryImage, setShowSecondaryImage] = useState(false);
  // No usable image at all → nothing to lazy-load, so start "loaded" to skip
  // the skeleton shimmer and go straight to the "No image" placeholder.
  const [loaded, setLoaded]       = useState(() => {
    const hasImages = images.some(u => typeof u === "string" && u.trim().length > 0);
    const hasSingle = typeof image === "string" && image.trim().length > 0;
    return !hasImages && !hasSingle;
  });
  const [img2loaded, setImg2loaded] = useState(false);
  const [wishPop, setWishPop]     = useState(false);
  // Tracks a broken/404 image URL (as opposed to no URL at all) so a bad
  // link also falls back to the placeholder instead of leaving blank space.
  const [imgBroken, setImgBroken] = useState(false);

  // CSS-based tilt — NO framer-motion MotionValues, NO extra hooks
  const [, setTilt]           = useState({ rx: 0, ry: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariantProp | null>(
    variants.length > 0 ? variants[0] : null
  );

  // Filter out blank/whitespace-only URLs — a product with images: [""] (a
  // common shape left over from an aborted upload) used to slip past a plain
  // `.length > 0` check and hand next/image an empty src, which renders
  // nothing and no fallback. Trim + drop empties so the "No image" placeholder
  // below reliably kicks in for any product that has no *usable* photo.
  const allImages = (images.length > 0 ? images : image ? [image] : [])
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0);
  const hasSecondImage = allImages.length > 1;
  const activePrice   = selectedVariant?.price ?? price;
  const activeStock   = selectedVariant?.stock ?? stock;
  const disc          = calcDiscount(activePrice, comparePrice);

  const { addItem: addWish, removeItem: rmWish, hasItem } = useWishlistStore();
  const wishlisted = mounted && hasItem(id);

  // Auto-slide back and forth between just the FIRST TWO photos on a timer —
  // a per-product setting (Edit design → Product Card Image Slide), off
  // unless the seller turns it on. Deliberately capped at 2 images (not
  // every photo the product has) — a shopper scanning a whole grid only
  // needs a quick "here's another angle" cue, not a full slideshow through
  // 10 photos. Mirrors the storefront's Store Highlights carousel, but
  // noticeably slower (5s vs Highlights' 3.5s). Pauses while the card is
  // hovered so a shopper reading the price/name isn't distracted by the
  // photo changing under their cursor; resumes from wherever it left off.
  const slideImages = allImages.slice(0, 2);
  const autoSlideOn = !!cardImageAutoSlide && slideImages.length > 1;
  useEffect(() => {
    if (!autoSlideOn || hov) return;
    const intervalId = setInterval(() => {
      setImgIdx((i) => (i + 1) % slideImages.length);
    }, 5000);
    return () => clearInterval(intervalId);
  }, [autoSlideOn, hov, slideImages.length]);

  /* ── mouse handlers ────────────────────────────────────────── */
  const handleMouseMove = () => {};
  const handleMouseEnter = () => {
    setHov(true);
    // Auto-slide already cycles through every photo on its own timer — the
    // old "jump to photo #2 on hover" behaviour only applies when it's off.
    if (!autoSlideOn && hasSecondImage) {
      setImgIdx(1);
      setShowSecondaryImage(true);
    }
  };
  const handleMouseLeave = () => {
    setHov(false);
    setTilt({ rx: 0, ry: 0 });
    if (!autoSlideOn) {
      setImgIdx(0);
      setShowSecondaryImage(false);
    }
  };

  const onWish = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setWishPop(true);
    setTimeout(() => setWishPop(false), 400);
    if (wishlisted) rmWish(id);
    else addWish({ productId: id, productName: name, productImage: allImages[0] || image, price: activePrice, sellerId });
    toast(wishlisted ? "Removed from wishlist" : "Saved to wishlist", { duration: 1200 });
  };

  /* ── frame CSS ───────────────────────────────────────────────
     Fixed, consistent card frame for every product — this is the single
     default look (white background, light border that darkens slightly on
     hover, subtle shadow) requested to replace the old per-product
     `cardDesign` frame variety. Making it fixed here — rather than pulling
     from design.frame() — also fixes a real bug: some designs (e.g.
     "midnight"/"neon") set a near-black frame background, and now that this
     frame wraps the WHOLE card (photo + info block together, see the outer
     wrapper below) instead of just the photo, that dark background sat
     directly behind the info block's dark text, making it unreadable. The
     legacy `glassy` prop still wins when set, so any caller that still
     passes it keeps its look without needing to migrate. */
  const cardStyle: React.CSSProperties = glassy
    ? {
        ...CARD_GLASS_FALLBACK(hov),
        willChange: "transform",
      }
    : {
        background: "#ffffff",
        border: hov ? "1px solid #a1a1aa" : "1px solid #e4e4e7",
        boxShadow: hov ? "0 4px 14px rgba(0,0,0,0.06)" : "0 1px 4px rgba(0,0,0,0.03)",
        borderRadius: 14,
        transition: "border-color 0.25s ease, box-shadow 0.25s ease",
        willChange: "transform",
      };

  // The border/background/shadow above now wraps the WHOLE card (photo +
  // info block together — see the outer wrapper below), not just the photo,
  // so shoppers see one bordered "product card" the way the reference design
  // does instead of a bordered photo with plain text floating under it. The
  // photo itself still needs its own top-corner rounding (to match the
  // outer box) and its own overflow-hidden (to clip the image/badges) since
  // the outer wrapper intentionally has NO overflow-hidden — that would clip
  // the variant-picker dropdown, which pops open above the button and can
  // extend past the card's own top edge.
  const photoRadius = cardStyle.borderRadius;
  const photoTopRadius: React.CSSProperties["borderRadius"] =
    typeof photoRadius === "number" ? `${photoRadius}px ${photoRadius}px 0 0` : photoRadius;

  // Manual card-display override — when the seller filled it in, it takes
  // over the title + description block below; blank/whitespace-only falls
  // back to the normal name + description behaviour.
  const trimmedDisplayText = cardDisplayText?.trim() || "";
  const hasCustomDisplayText = trimmedDisplayText.length > 0;

  // Seller-wide border frame colour (Edit design → Product Card Border).
  // Unset → cardBorderColorBg is null → the wrapper div below is a
  // no-op pass-through, so the photo looks exactly as it did before.
  const parsedCardBorderColor = cardBorderColor ? parseStoreColor(cardBorderColor) : null;
  const cardBorderColorBg = parsedCardBorderColor ? toCssBackground(parsedCardBorderColor) : null;

  // The info block always sits on the plain page background now — never
  // over the photo — so only the legacy `glassy` design needs light text.
  const useLightPalette = glassy;

  // Rating star/score and the discount tag both follow the seller's banner
  // colour (passed in as sellerColor) so they read as "this store's colour"
  // rather than a fixed brand green. Falls back to the original emerald when
  // no sellerColor was supplied — e.g. a caller outside a seller's own
  // storefront that hasn't been threaded through yet.
  const accentColor = sellerColor || "#059669";

  // The whole card is the link — NOT a separate absolutely-positioned overlay
  // sibling like it used to be. That overlay sat BEHIND the photo box
  // (z-10) and the info block (same z-index, but later in DOM order also
  // wins the paint order), so it could only ever catch a click in the thin
  // gap between them — which is why tapping a product routinely failed to
  // open it. Making the actual <Link> the wrapping parent fixes that: any
  // plain content on the card is properly inside it, and the buttons that
  // must NOT trigger navigation (wishlist heart, image dot strip, variant
  // picker, the seller-name link) already call preventDefault/stopPropagation
  // in their own onClick handlers below, which correctly stops the click
  // from bubbling up into this Link's navigation.
  return (
    <Link
      href={`/product/${productId}`}
      aria-label={name}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("relative group select-none h-full block", className)}
    >
      {/* Border frame — a seller's "Product Card Border" setting
          (cardBorderColor) now wraps the ENTIRE card — photo and info block
          together — in a padded mat of this colour/gradient, matching the
          requested reference design (one solid-coloured frame around the
          whole card, not just the photo). No prop set → plain pass-through
          div, zero visual change. Deliberately no overflow-hidden — see the
          note above photoTopRadius for why (it would clip the variant
          dropdown, which can pop up past the card's own top edge). */}
      <div
        className={cn("h-full flex flex-col", cardBorderColorBg && "p-[5px] sm:p-[9px]")}
        style={cardBorderColorBg ? { background: cardBorderColorBg, borderRadius: 20 } : undefined}
      >
      {/* Whole-card frame — the base white card style (background/border/
          shadow/radius) sits INSIDE the coloured mat above (when set), or
          is the outermost visible box when no border colour is set.
          Deliberately no overflow-hidden here either — see the note above
          photoTopRadius for why. */}
      <div
        style={cardStyle}
        className="relative flex h-full flex-col"
      >
        {/* Photo frame — plain <div> + CSS tilt; no MotionValue in style.
            Holds ONLY the product photo (plus its badges/buttons) — name,
            price and variants render in the separate info block below,
            outside this box entirely. Only the top corners are rounded
            (photoTopRadius) since it sits flush inside the card frame
            instead of being its own separate rounded box. */}
        <div
          style={{ borderRadius: photoTopRadius }}
          className={cn(
            "relative z-10 overflow-hidden",
            !glassy && design.framePad
          )}
        >
          {/* Decorative overlay for ornamental designs (floral, botanical,
              festive, luxe). Sits above the frame but below the image, so
              it never covers product photography. */}
          {!glassy && design.ornament && (
            <CardOrnament
              ornament={design.ornament}
              color={design.usesStoreColor && sellerColor ? sellerColor : design.ornamentColor}
            />
          )}

          {/* ── IMAGE ZONE ─────────────────────────────────────── */}
          <div
            className={cn(
              "relative z-[1] overflow-hidden",
              glassy ? "aspect-[80/81]" : design.mediaAspect,
              disc >= 20 && "nxc-heat-shimmer"
            )}
            style={{ background: glassy ? "rgba(255,255,255,0.06)" : "rgba(248,250,252,0.85)", borderBottom: glassy ? "1px solid rgba(255,255,255,0.07)" : undefined }}
          >

            {/* Skeleton shimmer */}
            {!loaded && (
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(214_32%_95%)] via-[hsl(214_32%_98%)] to-[hsl(214_32%_95%)] dark:from-[hsl(220_17%_10%)] dark:via-[hsl(220_17%_14%)] dark:to-[hsl(220_17%_10%)] animate-pulse" />
            )}

            {/* Primary image — or a graceful inline placeholder when the
                product has no uploaded images at all (avoids pointing
                next/image at a static asset that may not exist). */}
            {allImages.length === 0 || imgBroken ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[hsl(214_32%_95%)] dark:bg-[hsl(220_17%_12%)]">
                <ImageOff className="h-7 w-7 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">No image</span>
              </div>
            ) : autoSlideOn ? (
              /* Auto-slide mode — only the first TWO photos are layered here,
                 crossfading back and forth to whichever one imgIdx (advanced
                 by the interval above, or a manual dot hover below) currently
                 points at. Kept as its own separate branch rather than folded
                 into the default primary/secondary rendering below, so the
                 far more common default look (off unless a seller opts in)
                 stays completely untouched. */
              <div className="absolute inset-0" style={{ transform: hov ? "scale(1.07)" : "scale(1)", transition: "transform 0.4s ease" }}>
                {slideImages.map((src, i) => (
                  <div
                    key={src + i}
                    className="absolute inset-0"
                    style={{ opacity: i === imgIdx ? 1 : 0, transition: "opacity 1s ease-in-out" }}
                  >
                    <Image
                      src={src}
                      alt={name}
                      fill
                      sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,280px"
                      className={cn("object-cover", i === 0 && "transition-opacity duration-300", i === 0 && (loaded ? "opacity-100" : "opacity-0"))}
                      style={{ objectPosition }}
                      onLoad={i === 0 ? () => setLoaded(true) : undefined}
                      onError={i === 0 ? () => setImgBroken(true) : undefined}
                      priority={i === 0 ? priority : false}
                      loading={i === 0 && priority ? undefined : "lazy"}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div
                  className="absolute inset-0"
                  style={{
                    transform: hov ? "scale(1.07)" : "scale(1)",
                    transition: "transform 0.4s ease",
                  }}
                >
                  <Image
                    src={allImages[0]}
                    alt={name}
                    fill
                    sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,280px"
                    className={cn("object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
                    style={{ objectPosition }}
                    onLoad={() => setLoaded(true)}
                    onError={() => setImgBroken(true)}
                    priority={priority}
                    loading={priority ? undefined : "lazy"}
                  />
                </div>

                {/* Secondary image — load only when the hover state is active */}
                {hasSecondImage && showSecondaryImage && (
                  <div
                    className="absolute inset-0"
                    style={{
                      opacity: 1,
                      transform: hov ? "scale(1.07)" : "scale(1)",
                      transition: "opacity 0.38s ease, transform 0.4s ease",
                    }}
                  >
                    <Image
                      src={allImages[1]}
                      alt={name}
                      fill
                      sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,280px"
                      className="object-cover"
                      style={{ objectPosition }}
                      loading="lazy"
                    />
                  </div>
                )}
              </>
            )}

            {/* Bottom gradient */}
            <div
              className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none"
              style={{ opacity: hov ? 1 : 0, transition: "opacity 0.3s ease" }}
            />

            {/* ── TOP-LEFT BADGES ── */}
            <div className="absolute left-2.5 top-2.5 z-10 flex flex-col gap-1">
              {condition === "REFURBISHED" && (
                <span className="rounded-[4px] bg-amber-500 px-2 py-[3px] text-[10px] md:text-[17.6px] md:px-2.5 md:py-1 font-semibold text-white leading-none shadow-sm">Refurb</span>
              )}
              {isBestSeller && !disc && (
                <span className="rounded-[4px] bg-[#0f1117] px-2 py-[3px] text-[10px] md:text-[17.6px] md:px-2.5 md:py-1 font-semibold text-white leading-none shadow-sm">Top Seller</span>
              )}
              {isNew && !disc && !isBestSeller && (
                <span className="rounded-[4px] bg-primary px-2 py-[3px] text-[10px] md:text-[17.6px] md:px-2.5 md:py-1 font-semibold text-white leading-none shadow-sm">New</span>
              )}
            </div>

            {/* ── WISHLIST BUTTON ── */}
            <button
              onClick={onWish}
              suppressHydrationWarning
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 dark:bg-[hsl(220_17%_12%)] shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-white/40 transition-all duration-200 active:scale-90"
              style={{ opacity: hov || wishlisted ? 1 : 0 }}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5 transition-colors duration-200",
                  wishlisted ? "fill-red-500 text-red-500" : "text-slate-500 dark:text-slate-400"
                )}
              />
            </button>

            {/* ── IMAGE DOT STRIP ──
                In auto-slide mode this tracks just the 2 sliding photos and
                stays visible the whole time (no hover needed) so a shopper
                can actually see it change as the photo crossfades. Outside
                auto-slide it's the original hover-only manual preview across
                up to 5 photos, unchanged. Sized with responsive Tailwind
                classes (not inline px) specifically so mobile can stay small
                while desktop gets the bigger, easier-to-see dots — a plain
                inline-style width applies at every screen size, which is why
                the first pass looked oversized on phones. Sits right at the
                bottom edge of the photo (bottom-2) rather than the old
                52px-up offset — that offset was left over from a design
                where text used to sit inside the photo box; the info block
                now lives entirely below the photo, so nothing is there
                anymore and the dots were floating awkwardly over the middle
                of the picture instead of hugging its bottom edge. */}
            {allImages.length > 1 && (
              <div
                className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1 sm:gap-2"
                style={{
                  opacity: autoSlideOn || hov ? 1 : 0,
                  transform: autoSlideOn || hov ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(4px)",
                  transition: "opacity 0.22s ease, transform 0.22s ease",
                }}
              >
                {(autoSlideOn ? slideImages : allImages.slice(0, 5)).map((_, i) => (
                  <button
                    key={i}
                    onMouseEnter={(e) => { e.preventDefault(); e.stopPropagation(); setImgIdx(i); }}
                    className={cn(
                      "h-[4px] sm:h-[7px] rounded-full transition-all duration-200",
                      imgIdx === i ? "w-[14px] sm:w-[26px]" : "w-[4px] sm:w-[9px]"
                    )}
                    style={{
                      background: imgIdx === i ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                    }}
                  />
                ))}
              </div>
            )}

            {/* ── LOW STOCK WARNING ── */}
            {activeStock > 0 && activeStock <= 5 && (
              <div
                className="absolute bottom-[52px] left-3 z-10"
                style={{ opacity: hov ? 1 : 0, transform: hov ? "translateY(0)" : "translateY(3px)", transition: "opacity 0.2s ease, transform 0.2s ease" }}
              >
                <span className="flex items-center gap-1 rounded-[4px] bg-[#0f1117]/80 backdrop-blur-sm px-2 py-[3px] text-[10px] font-medium text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                  Only {activeStock} left
                </span>
              </div>
            )}

            {/* ── OUT OF STOCK OVERLAY ── */}
            {!activeStock && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 dark:bg-black/65 backdrop-blur-[3px]">
                <span className="rounded-[6px] border border-border/60 bg-white dark:bg-[hsl(220_17%_10%)] px-4 py-1.5 text-[12px] md:text-[17.6px] font-medium text-muted-foreground shadow-sm">
                  Out of Stock
                </span>
              </div>
            )}

          </div>

          {/* Border — subtle by default, accent ring on hover. Rings just
              the photo box — the info block below is outside this frame. */}
          <div
            className="pointer-events-none absolute inset-0 rounded-[12px] transition-all duration-300"
            style={{ border: mounted && hov ? "1.5px solid #18181b" : blackBorder ? "1px solid #d4d4d8" : "1px solid transparent" }}
          />
        </div>

      {/* ── INFO BLOCK ─────────────────────────────────────────
          A standalone block below the (possibly bordered) photo box, never
          enclosed inside it — only the product photo lives in the box;
          name, price, variants and everything else render outside it.
          Order matches the requested reference design: rating pill, name,
          store name, price + offer, then description — rating star/score
          and the discount tag both follow the store's banner colour (falls
          back to the original emerald when no sellerColor was passed in,
          e.g. contexts outside a seller's own storefront). */}
      <div
        className={cn(
          "relative z-[1] flex flex-col mt-2 px-2.5 pb-2 md:px-3 md:pb-3",
          !glassy && design.bodyClass
        )}
      >

        {/* Rating — single pill: banner-coloured star + score, muted review
            count, separated by a divider — mirrors the reference design. */}
        {reviewCount > 0 && (
          <div
            className="inline-flex w-fit items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] md:text-[13.2px] font-semibold leading-none"
            style={{ borderColor: hexToRgba(accentColor, 0.35), color: accentColor }}
          >
            {rating.toFixed(1)}
            <Star className="h-[10px] w-[10px]" style={{ fill: accentColor, color: accentColor }} />
            <span className={cn("font-medium", useLightPalette ? "text-white/40" : "text-zinc-400")}>|</span>
            <span className={cn("font-medium", useLightPalette ? "text-white/50" : "text-zinc-400")}>
              {reviewCount >= 1000 ? `${(reviewCount / 1000).toFixed(1)}k` : reviewCount}
            </span>
          </div>
        )}

        {/* Product name — primary (or the seller's manual card-display
            text, when set, replacing the auto name here) */}
        <h3
          className={cn(
            "text-[13px] md:text-[16.5px] font-semibold leading-snug line-clamp-2",
            reviewCount > 0 && "mt-1.5",
            font.titleClass,
            glassy ? "text-white/90" : "text-zinc-900"
          )}
        >
          {hasCustomDisplayText ? trimmedDisplayText : name}
        </h3>

        {/* Seller name — subtle, below name, links to seller's store */}
        <Link
          href={`/store/${sellerId}`}
          onClick={(e) => e.stopPropagation()}
          style={sellerColor ? { color: sellerColor } : undefined}
          className={cn(
            "relative z-[2] inline-block w-fit max-w-full text-[10px] md:text-[13.2px] font-semibold truncate mt-1 transition-colors hover:underline underline-offset-2",
            !sellerColor && (useLightPalette ? "text-white/40 hover:text-white/70" : isFeatured ? "text-orange-600 hover:text-orange-700" : "text-zinc-400 hover:text-zinc-600")
          )}
        >
          {sellerName}
        </Link>

        {/* Price block */}
        <div className="mt-1.5">
          {/* Price row */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span
              className={cn("text-[15px] md:text-[19.8px] font-bold tabular-nums nxc-price-slot", font.priceClass, glassy ? "text-white" : "text-zinc-900")}
              style={{ transformOrigin: "left center" }}
            >
              {formatPrice(activePrice)}
            </span>
            {comparePrice && comparePrice > activePrice && (
              <span className={cn("text-[11px] md:text-[13.2px] line-through tabular-nums", useLightPalette ? "text-white/35" : "text-zinc-400")}>
                {formatPrice(comparePrice)}
              </span>
            )}
            {disc >= 5 && (
              <span className="text-[10px] md:text-[13.2px] font-semibold" style={{ color: accentColor }}>
                {disc}% off
              </span>
            )}
          </div>

          {/* Out of stock — kept as a small functional flag even though it's
              outside the requested field list, so a shopper never lands on
              "Add to Cart" for something unavailable without warning. */}
          {activeStock === 0 && (
            <p className="mt-1 text-[11px] md:text-[13.2px] font-medium text-red-400">
              Out of stock
            </p>
          )}
        </div>

        {/* Spec/description snippet — Flipkart-style one-liner, now last in
            the stack per the requested order. Skipped when a manual
            card-display override is set (that text already replaced the
            title above). */}
        {description && !hasCustomDisplayText && (
          <p
            className={cn(
              "mt-1 text-[10px] md:text-[12.1px] leading-snug line-clamp-1",
              useLightPalette ? "text-white/45" : "text-zinc-400"
            )}
          >
            {truncateDescription(description)}
          </p>
        )}

        {/* Variant picker — small button, dropdown on tap. Not part of the
            requested field list, but kept (rather than deleted) since it's
            a real "choose before you buy" control, not decorative text —
            only ever appears when a product actually has multiple variants,
            and only when the seller hasn't turned it off for this product. */}
        {variants.length > 1 && showVariantsOnCard !== false && (
          <div ref={variantRef} className="relative mt-1.5 z-20">
            {/* Small trigger button */}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVariantOpen(v => !v); }}
              className={cn(
                "flex items-center gap-1 rounded-[6px] border px-2.5 py-1 text-[10px] md:text-[13.2px] font-semibold transition-all active:scale-95",
                glassy
                  ? "border-white/30 bg-white/15 text-white/80 hover:bg-white/25"
                  : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-900 hover:text-zinc-900"
              )}
            >
              <span>{selectedVariant ? parseVariantLabel(selectedVariant.value) : "Options"}</span>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className={`transition-transform duration-200 ${variantOpen ? "rotate-180" : ""}`}>
                <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

              {/* Dropdown picker */}
              {variantOpen && (
                <div
                  className="absolute bottom-full left-0 mb-1.5 z-30 rounded-xl border border-border bg-white dark:bg-card shadow-[0_8px_24px_rgba(0,0,0,0.14)] p-2 overflow-y-auto min-w-[140px] max-w-[220px] max-h-[200px]" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {variants.map(v => (
                    <button
                      key={v.id}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedVariant(v); setVariantOpen(false); }}
                      className={cn(
                        "rounded-[5px] border px-2.5 py-1 text-[10px] md:text-[13.2px] font-semibold transition-all active:scale-95 leading-none",
                        selectedVariant?.id === v.id
                          ? "border-foreground bg-foreground text-background shadow-sm"
                          : "border-border/50 text-muted-foreground hover:border-foreground/50 hover:text-foreground hover:bg-muted/40",
                        v.stock === 0 ? "opacity-35 line-through cursor-not-allowed" : ""
                      )}
                      disabled={v.stock === 0}
                    >
                      {parseVariantLabel(v.value)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>
      </div>
      </div>
    </Link>
  );
}
