"use client";

/**
 * Reusable colour picker: search bar (name or hex, exact/partial/nearest
 * matching), curated solid + gradient preset libraries grouped by category,
 * a custom solid colour input, and a custom two-tone gradient builder with
 * a colour-theory "Surprise me" generator.
 *
 * Used across the seller dashboard — the storefront banner colour
 * (`storeColor`), the product background colour, and the per-product card
 * border colour all reuse it — so this file owns 100% of the picker UI and
 * each caller only supplies the current value and a save callback.
 */
import { useState, useMemo, useEffect, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Shuffle, Search, X, Plus } from "lucide-react";
import {
  SOLID_CATEGORIES,
  GRADIENT_CATEGORIES,
  parseStoreColor,
  isGradientStoreColor,
  buildGradientValue,
  generateHarmoniousGradient,
  getReadableTextColor,
  isLightColor,
  isLightStoreColor,
  searchColors,
  normalizeHexInput,
  toCssBackground,
} from "@/lib/store-color";

interface ColorPickerSectionProps {
  /** Current saved value — "" / undefined means nothing picked yet. */
  value: string;
  /** Called with the new value whenever the seller picks/applies a colour. */
  onApply: (color: string) => void | Promise<void>;
  saving: boolean;
  searchPlaceholder?: string;
  /** Renders the live preview strip; receives the CSS background + a readable text colour + a matching badge background. */
  renderPreview: (bg: string, textColor: string, badgeBg: string, primary: string) => ReactNode;
  /** Colour shown when nothing has been picked yet. */
  fallbackColor?: string;
}

export function ColorPickerSection({
  value,
  onApply,
  saving,
  searchPlaceholder = `Search colours — a name like "Rose Gold" or a hex like #870000…`,
  renderPreview,
  fallbackColor: fallbackColorProp = "#16a34a",
}: ColorPickerSectionProps) {
  // Defensive: callers are only supposed to pass a single hex here, but a
  // caller could plausibly hand this a gradient string (e.g. "match the
  // other picker's current value" when that value happens to be a
  // gradient). Normalising to just the primary stop means this always
  // behaves like the single hex it's documented to be, however it arrives.
  const fallbackColor = parseStoreColor(fallbackColorProp)?.primary ?? fallbackColorProp;
  // Custom two-colour gradient builder — seeded with a sensible default,
  // re-seeded from the saved value whenever it's itself a gradient (so
  // re-opening this picker shows what's actually live).
  const [gradC1, setGradC1] = useState("#667eea");
  const [gradC2, setGradC2] = useState("#764ba2");
  const [colorSearch, setColorSearch] = useState("");
  // Custom solid colour draft — the native <input type="color"> fires
  // onChange continuously while dragging, so this stays purely local until
  // "Apply Colour" is clicked (otherwise every drag tick would fire a save).
  const [customSolid, setCustomSolid] = useState(() => parseStoreColor(value)?.primary ?? fallbackColor);
  // Live preview override — null means "show the applied `value`". Set the
  // instant the seller drags the custom solid swatch, moves either gradient
  // stop, or hits "Surprise me", so the preview strip reflects what they're
  // *building*, not just what's already saved. Cleared back to null whenever
  // `value` changes (i.e. right after a successful Apply), at which point
  // `value` itself already equals what livePreview was showing — so there's
  // no flicker, just a handoff from "draft" to "applied".
  const [livePreview, setLivePreview] = useState<string | null>(null);

  // Re-seeds on `value` alone — deliberately NOT on `fallbackColor` too.
  // The Product Card picker's fallbackColor tracks the banner colour, so
  // including it here would reset this picker's in-progress custom drag
  // every time the seller tweaks the *other* colour section on the same
  // page, before this one was ever saved.
  useEffect(() => {
    const parsed = parseStoreColor(value);
    if (parsed?.secondary) {
      setGradC1(parsed.primary);
      setGradC2(parsed.secondary);
    }
    // Re-seed the solid draft too, so re-opening this picker (or switching
    // between banner/card sections) shows what's actually saved.
    setCustomSolid(parsed?.primary ?? fallbackColor);
    setLivePreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Recomputed only when the search text changes — the library is small
  // (~90 presets) so this is instant, but memoising still avoids redoing
  // the work on unrelated re-renders.
  const colorSearchResults = useMemo(() => searchColors(colorSearch), [colorSearch]);
  const colorSearchHex = useMemo(() => normalizeHexInput(colorSearch), [colorSearch]);

  // Drives the preset checkmarks/rings — deliberately based on `value` only
  // (what's actually saved), never on the live draft below.
  const isGradientActive = isGradientStoreColor(value);
  const parsedActive = parseStoreColor(value);
  const activeColor = parsedActive?.primary ?? fallbackColor;
  const customGradientValue = buildGradientValue(gradC1, gradC2);
  const isCustomGradientActive = value === customGradientValue;

  // Drives the preview strip — this one DOES fall back to the in-progress
  // draft (livePreview) when there is one, so dragging the custom builder
  // moves the preview in real time instead of waiting for "Apply".
  const previewSource = livePreview ?? value;
  const previewParsed = parseStoreColor(previewSource);
  const previewPrimary = previewParsed?.primary ?? fallbackColor;
  const previewSecondary = previewParsed?.secondary ?? null;
  const previewBg = previewSecondary
    ? `linear-gradient(135deg, ${previewPrimary}, ${previewSecondary})`
    : `linear-gradient(135deg, ${previewPrimary}, ${previewPrimary}cc)`;
  // Same pale-colour safety net as the live storefront: pick readable text
  // for the preview strip instead of assuming white always works. Checks
  // BOTH gradient stops (not just the primary) — the same conservative rule
  // the real storefront banner and product cards use — so this never shows
  // a text colour that would actually go unreadable against either half of
  // a two-tone pick.
  const previewIsLight = isLightStoreColor({ primary: previewPrimary, secondary: previewSecondary });
  const previewTextColor = previewIsLight ? "#151515" : "#ffffff";
  const previewBadgeBg = previewIsLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.2)";

  const shuffleGradient = () => {
    const [c1, c2] = generateHarmoniousGradient();
    setGradC1(c1);
    setGradC2(c2);
    setLivePreview(buildGradientValue(c1, c2));
  };

  // Presets and search results apply (and save) immediately on click, but
  // that save is a network round-trip — without this, the preview would sit
  // frozen for however long that takes. Setting livePreview first makes the
  // click feel instant, same as dragging the custom builder; the effect
  // above then clears it right as `value` catches up, so there's no flicker.
  const applyColor = (color: string) => {
    setLivePreview(color);
    onApply(color);
  };

  return (
    <div className="space-y-6">
      {/* Live preview strip — text colour flips automatically for pale picks */}
      {renderPreview(previewBg, previewTextColor, previewBadgeBg, previewPrimary)}

      {/* Search — every solid + gradient, by name or hex, in one box */}
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={colorSearch}
            onChange={(e) => setColorSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 pr-9"
          />
          {colorSearch && (
            <button
              type="button"
              onClick={() => setColorSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {colorSearch.trim() ? (
        /* ── Search results ── */
        <div className="space-y-3">
          {colorSearchHex && (
            <button
              type="button"
              onClick={() => applyColor(colorSearchHex)}
              disabled={saving}
              className="w-full flex items-center gap-3 rounded-xl border border-dashed border-border p-3 hover:border-foreground/50 transition-colors text-left"
            >
              <div className="h-9 w-9 rounded-full border-2 border-border shrink-0" style={{ background: colorSearchHex }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Use custom colour {colorSearchHex}</p>
                <p className="text-[11px] text-muted-foreground">Not in the library — apply it directly</p>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          )}

          {colorSearchResults.length === 0 && !colorSearchHex ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No colours match &ldquo;{colorSearch}&rdquo;. Try a colour name (e.g. &ldquo;emerald&rdquo;) or a hex code (e.g. &ldquo;#870000&rdquo;).
            </p>
          ) : (
            <>
              {colorSearchResults.length > 0 && (
                <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
                  {colorSearchResults.some(r => r.matchType === "exact-hex" || r.matchType === "partial-hex" || r.matchType === "name")
                    ? `${colorSearchResults.length} match${colorSearchResults.length === 1 ? "" : "es"}`
                    : "Closest matches"}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                {colorSearchResults.map((r) => {
                  const isGradientResult = r.type === "gradient";
                  const [c1, c2] = r.hexes;
                  const swatchValue = isGradientResult ? buildGradientValue(c1, c2) : c1;
                  const isActive = value === swatchValue;
                  const bg = isGradientResult ? toCssBackground({ primary: c1, secondary: c2 }) : c1;
                  const markColor = isGradientResult
                    ? (isLightColor(c1) || isLightColor(c2) ? "#151515" : "#ffffff")
                    : getReadableTextColor(c1);
                  return (
                    <button
                      key={`${r.type}-${r.label}`}
                      type="button"
                      title={`${r.label} · ${r.category}`}
                      onClick={() => applyColor(swatchValue)}
                      disabled={saving}
                      className="group relative flex flex-col items-center gap-1 shrink-0 w-16"
                    >
                      <div
                        className={`relative border-2 transition-all group-hover:scale-105 group-active:scale-95 shadow-sm ${isGradientResult ? "h-12 w-16 rounded-xl" : "h-11 w-11 rounded-full mx-auto"}`}
                        style={{
                          background: bg,
                          borderColor: isActive ? markColor : "transparent",
                          boxShadow: isActive ? `0 0 0 2px ${c1}, 0 4px 14px ${c1}88` : "0 2px 8px rgba(0,0,0,0.15)",
                        }}
                      >
                        {isActive && (
                          <Check className="absolute inset-0 m-auto h-4 w-4 drop-shadow" strokeWidth={3} style={{ color: markColor }} />
                        )}
                      </div>
                      <span className="text-[9.5px] text-muted-foreground truncate w-full text-center leading-tight">{r.label}</span>
                      {r.matchType === "nearest" && (
                        <span className="text-[8px] text-muted-foreground/60 leading-tight">closest match</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── Browse by category (default view) ── */
        <>
          {/* Solid preset swatches, grouped */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Solid colours</p>
            {SOLID_CATEGORIES.map(({ category, colors }) => (
              <div key={category}>
                <p className="text-[10px] text-muted-foreground mb-1.5">{category}</p>
                <div className="flex flex-wrap gap-2.5">
                  {colors.map(({ hex, label }) => {
                    const isSelected = !isGradientActive && activeColor === hex;
                    // Pale swatches (Light & Soft category) need a dark
                    // ring + check instead of the usual white — a white
                    // ring on an off-white swatch would be invisible.
                    const markColor = getReadableTextColor(hex);
                    return (
                      <button
                        key={hex}
                        type="button"
                        title={label}
                        onClick={() => applyColor(hex)}
                        disabled={saving}
                        className="relative h-9 w-9 rounded-full border-[3px] transition-all hover:scale-110 active:scale-95"
                        style={{
                          background: hex,
                          borderColor: isSelected ? markColor : "transparent",
                          boxShadow: isSelected ? `0 0 0 2px ${hex}, 0 4px 12px ${hex}88` : "0 2px 6px rgba(0,0,0,0.2)",
                        }}
                      >
                        {isSelected && (
                          <Check className="absolute inset-0 m-auto h-4 w-4 drop-shadow" strokeWidth={3} style={{ color: markColor }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Gradient presets — a full curated library, grouped by mood */}
          <div className="space-y-4">
            <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Gradients
            </p>
            {GRADIENT_CATEGORIES.map(({ category, gradients }) => (
              <div key={category}>
                <p className="text-[10px] text-muted-foreground mb-1.5">{category}</p>
                <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {gradients.map(({ label, colors: [c1, c2] }) => {
                    const swatchValue = buildGradientValue(c1, c2);
                    const isActive = value === swatchValue;
                    // Use the lighter of the two stops to decide the ring/check
                    // colour — conservative, so it stays visible either way.
                    const markColor = isLightColor(c1) || isLightColor(c2) ? "#151515" : "#ffffff";
                    return (
                      <button
                        key={label}
                        type="button"
                        title={label}
                        onClick={() => applyColor(swatchValue)}
                        disabled={saving}
                        className="group relative flex flex-col items-center gap-1 shrink-0 w-16"
                      >
                        <div
                          className="relative h-12 w-16 rounded-xl border-2 transition-all group-hover:scale-105 group-active:scale-95 shadow-sm"
                          style={{
                            background: `linear-gradient(135deg, ${c1}, ${c2})`,
                            borderColor: isActive ? markColor : "transparent",
                            boxShadow: isActive ? `0 0 0 2px ${c1}, 0 4px 14px ${c1}88` : "0 2px 8px rgba(0,0,0,0.15)",
                          }}
                        >
                          {isActive && (
                            <Check className="absolute inset-0 m-auto h-5 w-5 drop-shadow" strokeWidth={3} style={{ color: markColor }} />
                          )}
                        </div>
                        <span className="text-[9.5px] text-muted-foreground truncate w-full text-center leading-tight">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Custom solid colour input */}
      <div>
        <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide mb-2">Custom solid colour</p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={customSolid}
              onChange={e => { setCustomSolid(e.target.value); setLivePreview(e.target.value); }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-lg"
            />
            <div className="h-10 w-10 rounded-lg border-2 border-border cursor-pointer shadow-sm" style={{ background: customSolid }} />
          </div>
          <span className="font-mono text-sm text-muted-foreground">{customSolid}</span>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => onApply(customSolid)}
            className="ml-auto"
          >
            {saving ? "Saving…" : "Apply Colour"}
          </Button>
        </div>
      </div>

      {/* Custom gradient builder — mix any two colours, or let the generator suggest a harmonious pair */}
      <div>
        <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide mb-2">Custom gradient</p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <input
              type="color"
              value={gradC1}
              onChange={e => { setGradC1(e.target.value); setLivePreview(buildGradientValue(e.target.value, gradC2)); }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-lg"
            />
            <div className="h-10 w-10 rounded-lg border-2 border-border cursor-pointer shadow-sm" style={{ background: gradC1 }} />
          </div>
          <span className="text-muted-foreground text-xs">→</span>
          <div className="relative">
            <input
              type="color"
              value={gradC2}
              onChange={e => { setGradC2(e.target.value); setLivePreview(buildGradientValue(gradC1, e.target.value)); }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-lg"
            />
            <div className="h-10 w-10 rounded-lg border-2 border-border cursor-pointer shadow-sm" style={{ background: gradC2 }} />
          </div>
          <div
            className="h-10 flex-1 min-w-[80px] rounded-lg border border-border/50"
            style={{ background: `linear-gradient(135deg, ${gradC1}, ${gradC2})` }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={shuffleGradient}
            title="Suggest a harmonious pair"
          >
            <Shuffle className="h-3.5 w-3.5" /> Surprise me
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isCustomGradientActive ? "secondary" : "default"}
            disabled={saving}
            onClick={() => onApply(customGradientValue)}
          >
            {saving ? "Saving…" : isCustomGradientActive ? "Applied ✓" : "Apply Gradient"}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Click a preset, hit &ldquo;Surprise me&rdquo; for a designer-picked gradient, mix your own, or use the colour picker for a custom flat shade.
      </p>
    </div>
  );
}
