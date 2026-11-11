# Product card designs

Each product carries its own storefront card style **and** its own text style — two independent choices. Sellers pick both when adding a product (live preview included) and can change either afterwards from **Dashboard → Edit design**.

## Run first

```
npx prisma generate      # cardDesign / cardFont do not exist on the client until this runs
npx prisma migrate deploy
npm run build
```

No new migration was needed for the designs/fonts added in this round — see "Why no new migration" below.

## The 21 designs

| Key | Look |
|---|---|
| `minimal` | No border or shadow, fades slightly on hover |
| `bordered` | Crisp outline — **the default** |
| `elevated` | Soft shadow that lifts on hover, larger radius |
| `compact` | Shorter image, tighter radius, fits more per row |
| `showcase` | Tall image with the title over a scrim |
| `glass` | Frosted panel, border tinted with the store colour |
| `polaroid` | Framed photo with a padded white surround |
| `floral` | Blush card, soft rose spray ornament |
| `botanical` | Cream card, leafy vine down the edge |
| `festive` | Marigold rosette corners — festival sales |
| `luxe` | Gold double hairline, corner flourishes |
| `aurora` | Iridescent pastel wash with scattered sparkle |
| `marble` | Warm stone-grey marble tones, gold hairline |
| `neon` | Near-black card, glowing cyan-magenta edge — tech/gaming |
| `sunset` | Coral-to-violet gradient, golden-hour feel |
| `ocean` | Aqua gradient with a gentle wave line |
| `emerald` | Emerald tint with a gold foil border |
| `royal` | Pale plum card, gold crown motif |
| `candy` | Pastel gradient with a sprinkle of confetti |
| `midnight` | Deep navy night sky, gold star scatter — jewellery/eveningwear |
| `tropical` | Sunny gradient, palm leaves in the corner |

`minimal` through `luxe` are the first round. `aurora` through `tropical` are the ten added this round.

## The 15 text styles

| Key | Look | Suits |
|---|---|---|
| `sans` | Geist Sans — neutral, default | Anything |
| `serif` | Playfair Display — high-contrast serif | Jewellery, fashion, decor |
| `display` | Space Grotesk — geometric, confident | Electronics, streetwear |
| `script` | Caveat — casual handwriting | Handmade, bakery, gifting |
| `mono` | Geist Mono — fixed width | Parts, tools, spec-led listings |
| `poppins` | Poppins — clean geometric, rounded warmth | General purpose, mobile-first |
| `montserrat` | Montserrat — polished geometric | Premium DTC brands |
| `bebas` | Bebas Neue — tall condensed caps | Prices, discounts, flash sales |
| `cormorant` | Cormorant Garamond — refined serif | Jewellery, bridal, premium decor |
| `nunito` | Nunito — soft rounded sans | Kids', baby, home |
| `oswald` | Oswald — bold condensed headline | Streetwear, sportswear |
| `quicksand` | Quicksand — light rounded geometric | Wellness, beauty |
| `dmserif` | DM Serif Display — dramatic high-contrast serif | Home decor, editorial listings |
| `outfit` | Outfit — ultra-clean geometric | Electronics, minimalist brands |
| `pacifico` | Pacifico — bold rounded script | Bakery, candy, gifting |

Design and font are independent columns (`Product.cardDesign`, `Product.cardFont`), so any of the 21 designs can pair with any of the 15 fonts — 315 combinations from two small registries.

All of it lives in `src/lib/card-designs.ts` — one registry read by the storefront card, both seller pickers, and the API validator. Adding an entry there makes it available everywhere at once; nothing else needs to change.

## Why no new migration was needed this round

`cardDesign` and `cardFont` are plain `TEXT` columns, not Postgres enums — deliberately, so new keys are a code-only change. Unknown or `NULL` values fall back to the defaults (`bordered` / `sans`) at render time, so a key later retired from the registry can never break a live storefront. The migrations that added the two columns (`20260804_130000_add_product_card_design`, `20260804_140000_add_product_card_font`) are the only ones this feature needs.

## Dark cards need `overlay: true` — the rest stay pale

Two of the ten new designs (`neon`, `midnight`) use near-black/navy backgrounds. `ProductCard`'s info panel only switches to white text when `design.overlay === true` (the same flag `showcase` already used) — it doesn't inspect the background colour. So `neon` and `midnight` set `overlay: true` and get the taller image + title-over-scrim treatment `showcase` uses. The other eight new designs stay pale for the same reason the first four decorative designs did: default title/price text is dark, and a light background is what keeps it legible without touching `ProductCard`'s colour logic at all.

## Ornaments

Inline SVG, not image files — no extra network request, scales to any card size, and tints via the `color` prop (usually the seller's store colour). Ten ornaments now exist in `src/components/product/CardOrnaments.tsx`:

`floral`, `botanical`, `festive`, `luxe` (first round) and `sparkle` (aurora), `wave` (ocean), `crown` (royal), `confetti` (candy — deliberately multicolour, not just tinted), `star` (midnight), `palm` (tropical).

`marble`, `neon`, `sunset` and `emerald` carry no ornament — their look comes from gradient background + border/glow treatment alone, same pattern as the plain first-round designs.

## Fonts are self-hosted via `next/font/google`, with explicit weights

All ten new fonts are loaded in `src/app/layout.tsx` with an explicit `weight` array (e.g. `["400", "600", "700"]`) rather than pulling a full variable-font range — that caps how many weight instances actually ship, since a card only ever needs two or three. Three fonts (`Bebas Neue`, `DM Serif Display`, `Pacifico`) only exist at weight 400, so those request just the one.

**Trade-off worth knowing:** this is now 13 self-hosted font families loaded on every page (Geist Sans/Mono + 3 from the first round + 10 here), each with `display: "swap"` so text never goes invisible while a font loads. That's real additional payload versus the 2-font baseline the project started with. If initial page weight becomes a concern, the fix is trimming unused weights or lazy-loading fonts only used by decorative designs — not something to do preemptively without a real measurement.

## The important decision, unchanged: random is resolved on write, never on render

"Surprise me" does **not** randomise while rendering. A concrete key is picked once and saved to the database — for both `cardDesign` and `cardFont` independently. Randomising at render time would cause a React hydration mismatch (server and browser disagreeing on the design) and would make cards change style on every refresh, which reads as a bug rather than a feature. `pickRandomDesignKey()` / the font equivalent in `normalizeFontForStorage()` are only ever called from write paths.

## Files touched this round

**New**

- 10 new entries in `src/lib/card-designs.ts` (`CARD_DESIGNS`)
- 10 new entries in `src/lib/card-designs.ts` (`CARD_FONTS`)
- 6 new ornament components in `src/components/product/CardOrnaments.tsx`

**Modified**

- `src/app/layout.tsx` — 10 new `next/font/google` declarations + body class wiring
- `tailwind.config.ts` — 10 new `fontFamily` keys mapped to the new CSS vars

**Unchanged, and correctly so**

- `src/components/product/ProductCard.tsx` — no edits needed; `isOverlay` logic already generalised from the first round
- `src/components/seller/DesignManagerClient.tsx`, `src/components/seller/product-upload/ProductDesignPicker.tsx` — both map over `CARD_DESIGN_LIST`/`CARD_FONT_LIST` and filter by `.decorative`, so the new entries appear automatically
- `src/app/api/sellers/products/design/route.ts`, `src/app/api/products/route.ts` — validate against `CARD_DESIGN_KEYS`/`CARD_FONT_KEYS`, derived from the registries, so no hardcoded lists to update

## Known gaps (unchanged from the first round)

- **Only the seller storefront passes `cardDesign`/`cardFont`.** The homepage, search, category, trending and flash-sale grids still render the default. Tell me if you want per-product designs there too.
- **`nexcart-catalog` doesn't have either column.** If you deploy that app, mirror `cardDesign` and `cardFont` into its schema and `catalog-sync.ts` — same trap as `storeHandle`.
- **Not compiled.** As with everything else this session, `tsc` and `next build` have not been run in this sandbox (Prisma's engine binaries are unreachable here — 403 from `binaries.prisma.sh`). Run `npx prisma generate && npm run build` locally before trusting this.
