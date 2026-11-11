"use client";

import { Shuffle } from "lucide-react";
import {
  CARD_DESIGN_LIST,
  CARD_FONT_LIST,
  DEFAULT_CARD_DESIGN,
  DEFAULT_CARD_FONT,
  RANDOM_DESIGN_VALUE,
} from "@/lib/card-designs";
import { ProductCard } from "@/components/product/ProductCard";
import { ImagePositionPicker } from "@/components/seller/product-upload/ImagePositionPicker";
import { cn } from "@/lib/utils";

/**
 * ProductCard's full-card <Link> and its wishlist/cart <button>s are real,
 * natively focusable elements. `pointer-events: none` (used below) only
 * blocks mouse hit-testing — it does nothing to stop a keyboard user from
 * Tab-ing onto them and activating with Enter/Space, which would navigate
 * away from this form or write a placeholder item into the seller's real
 * (localStorage-backed) cart/wishlist. Setting the DOM `inert` property
 * removes the whole subtree from focus, hit-testing and the accessibility
 * tree, closing that gap. Applied via ref rather than the `inert` JSX
 * attribute for portability across React type-def versions.
 */
function setInert(el: HTMLDivElement | null) {
  if (el) el.inert = true;
}

interface ProductDesignPickerProps {
  /** A CardDesignKey, or the RANDOM_DESIGN_VALUE sentinel ("random"). */
  value: string;
  onChange: (value: string) => void;
  /** A CardFontKey, or the RANDOM_DESIGN_VALUE sentinel ("random"). */
  fontValue: string;
  onFontChange: (value: string) => void;
  previewName: string;
  previewPrice: number;
  previewComparePrice?: number;
  /** First uploaded product image, if any. No preview card renders without one. */
  previewImage: string;
  previewStock?: number;
  /** Focal point for the cover photo, "X% Y%" — see ImagePositionPicker. */
  imagePosition?: string | null;
  onImagePositionChange: (value: string) => void;
  /** Existing product's ID — passed only on the edit page (see
   * ImagePositionPicker's productId doc comment). */
  productId?: string;
}

/**
 * Card design + text style picker, with a live card preview, shared by the
 * add-product wizard and the edit-product page so both stay in sync with the
 * design registry.
 *
 * The preview renders the real ProductCard (not a mock) so sellers see
 * exactly what shoppers will see — wrapped non-interactively, since the
 * card's own full-card <Link> and cart/wishlist buttons are meant for a real,
 * published product and would otherwise navigate away from the form or
 * mutate the seller's own cart/wishlist with placeholder data.
 */
export function ProductDesignPicker({
  value,
  onChange,
  fontValue,
  onFontChange,
  previewName,
  previewPrice,
  previewComparePrice,
  previewImage,
  previewStock,
  imagePosition,
  onImagePositionChange,
  productId,
}: ProductDesignPickerProps) {
  const plain = CARD_DESIGN_LIST.filter((d) => !d.decorative);
  const fancy = CARD_DESIGN_LIST.filter((d) => d.decorative);
  const isDesignRandom = value === RANDOM_DESIGN_VALUE;
  const isFontRandom = fontValue === RANDOM_DESIGN_VALUE;
  // "random" has no single look to preview — show the default and explain
  // that the real choice is made when the product is saved.
  const previewDesignKey = isDesignRandom ? DEFAULT_CARD_DESIGN : value;
  const previewFontKey = isFontRandom ? DEFAULT_CARD_FONT : fontValue;

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_200px]">
      <div className="space-y-5">
        <div className="space-y-4">
          <ChipGroup label="Simple" items={plain} value={value} onChange={onChange} />
          <ChipGroup label="Decorative" items={fancy} value={value} onChange={onChange} />
          <RandomButton active={isDesignRandom} onClick={() => onChange(RANDOM_DESIGN_VALUE)} />
        </div>

        <div className="space-y-2 border-t border-gray-100 pt-4">
          <ChipGroup
            label="Text style"
            items={CARD_FONT_LIST}
            value={fontValue}
            onChange={onFontChange}
            chipClassName={(f) => f.titleClass}
          />
          <RandomButton active={isFontRandom} onClick={() => onFontChange(RANDOM_DESIGN_VALUE)} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Live preview
        </p>
        {previewImage ? (
          <div
            ref={setInert}
            className="pointer-events-none"
            style={{ width: 176 }}
            aria-hidden="true"
          >
            <ProductCard
              id="preview"
              productId="preview"
              name={previewName || "Your product name"}
              price={previewPrice || 0}
              comparePrice={previewComparePrice}
              image={previewImage}
              rating={0}
              reviewCount={0}
              sellerId="preview"
              sellerName="Your Store"
              stock={previewStock ?? 10}
              cardDesign={previewDesignKey}
              cardFont={previewFontKey}
              cardImagePosition={imagePosition}
              previewMobileHeight
            />
          </div>
        ) : (
          <div className="flex h-[220px] w-[176px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-center text-[11px] text-gray-400">
            Upload a product photo to see a live preview
          </div>
        )}
        {previewImage && (
          <div className="mt-4">
            <ImagePositionPicker
              image={previewImage}
              value={imagePosition}
              onChange={onImagePositionChange}
              cardDesign={previewDesignKey}
              productId={productId}
            />
          </div>
        )}
        {(isDesignRandom || isFontRandom) && (
          <p className="mt-2 max-w-[176px] text-[10px] leading-snug text-gray-400">
            {isDesignRandom && isFontRandom
              ? "A design and text style will be chosen for you when you save"
              : isDesignRandom
              ? "A design will be chosen for you when you save"
              : "A text style will be chosen for you when you save"}
            {" "}— shown here as the default look.
          </p>
        )}
      </div>
    </div>
  );
}

function RandomButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-medium transition-colors",
        active
          ? "border-blue-600 bg-blue-50 text-blue-700"
          : "border-gray-200 text-gray-600 hover:bg-gray-50"
      )}
    >
      <Shuffle className="h-3.5 w-3.5" />
      Surprise me — pick one at random
    </button>
  );
}

interface ChipItem {
  key: string;
  label: string;
  description: string;
}

function ChipGroup<T extends ChipItem>({
  label,
  items,
  value,
  onChange,
  chipClassName,
}: {
  label: string;
  items: T[];
  value: string;
  onChange: (value: string) => void;
  /** Optional extra class per item — used to render font chips in their own typeface. */
  chipClassName?: (item: T) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = value === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              aria-pressed={active}
              title={item.description}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-[12px] font-medium transition-colors",
                active
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50",
                chipClassName?.(item)
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
