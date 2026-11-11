"use client";

/**
 * Compact "whole store" mockup — a mini banner strip above a mini product
 * grid — used inside both colour pickers on the Settings page (banner
 * colour, product card back colour) so a seller judges a colour the same
 * way a customer will actually see it: banner and cards together, not as
 * an isolated swatch.
 *
 * Purely presentational. Callers own all colour logic and pass in already
 * resolved CSS values (see the `resolvePreviewColors` helper used on the
 * Settings page), so this component has no dependency on `store-color.ts`.
 */
interface MiniStorePreviewProps {
  bannerBg: string;
  bannerTextColor: string;
  bannerBadgeBg: string;
  cardBg: string;
  cardTextColor: string;
  storeName?: string;
  /**
   * The real storefront tints its whole page background with a low-opacity
   * wash of the banner colour (see SellerStoreClient's `hexToRgba(bannerColor,
   * 0.28)` on the page wrapper) — this is that same computed value, passed in
   * so the mockup shows it too instead of a generic neutral grey. Falls back
   * to a plain muted grey (the pre-existing look) when not supplied.
   */
  pageBg?: string;
  /**
   * When set, each mini product card gets a thin padded border/mat of this
   * CSS background — mirrors the real storefront's "Product Card Border"
   * setting (see ProductCard.tsx's cardBorderColorBg). Omit for no border,
   * the pre-existing look.
   */
  cardBorderBg?: string;
}

export function MiniStorePreview({
  bannerBg,
  bannerTextColor,
  bannerBadgeBg,
  cardBg,
  cardTextColor,
  storeName = "Your Store Name",
  pageBg,
  cardBorderBg,
}: MiniStorePreviewProps) {
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
      {/* Mini banner */}
      <div
        className="h-14 w-full flex items-center justify-center gap-2 px-3 transition-all duration-150"
        style={{ background: bannerBg }}
      >
        <span className="font-bold text-[12px] truncate" style={{ color: bannerTextColor }}>
          {storeName || "Your Store Name"}
        </span>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold"
          style={{ background: bannerBadgeBg, color: bannerTextColor }}
        >
          ✓ VERIFIED
        </span>
      </div>

      {/* Mini product grid — background matches the real storefront's
          banner-derived page tint when pageBg is supplied. */}
      <div
        className={`grid grid-cols-3 gap-2 p-2.5 transition-colors duration-150 ${pageBg ? "" : "bg-muted/20"}`}
        style={pageBg ? { backgroundColor: pageBg } : undefined}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cardBorderBg ? "p-[5px] transition-all duration-150" : undefined}
            style={cardBorderBg ? { background: cardBorderBg, borderRadius: 12 } : undefined}
          >
            <div
              className="rounded-lg overflow-hidden border border-black/5 transition-all duration-150"
              style={{ background: cardBg }}
            >
              <div className="h-8 w-full bg-black/10" />
              <div className="px-1.5 py-1.5 space-y-0.5">
                <span className="block text-[8px] font-semibold truncate" style={{ color: cardTextColor }}>
                  Product {i}
                </span>
                <span className="block text-[8px] font-bold" style={{ color: cardTextColor }}>
                  ₹{i}99
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="px-3 py-1.5 text-[9px] text-muted-foreground text-center border-t border-border/50">
        Live preview — banner &amp; product cards together
      </p>
    </div>
  );
}
