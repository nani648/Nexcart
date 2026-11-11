# Store Handles — vanity store URLs (`nexcart.com/pickles_02`)

Implemented 2026-08-04. Sellers claim a short handle; their storefront is served from the root URL and the old `/store/<sellerId>` link keeps working forever.

## Before you run this

```
# 1. BACK UP FIRST — this folder is not a git repo, there is no undo
git init && git add -A && git commit -m "before store handles"

# 2. Reconcile migration drift (see HANDOFF_NOTES.md §7.3) BEFORE applying
npx prisma migrate dev --create-only --name baseline_sync

# 3. Then
npx prisma migrate deploy
npx prisma generate
npx tsc --noEmit && npm run build
```

`npx prisma generate` is **required** — `storeHandle` and the `StoreHandleHistory` model do not exist on the Prisma client until you run it, and every file below will fail to type-check without it.

## What was built

**New files**

| File | Purpose |
|---|---|
| `src/lib/store-handle.ts` | Pure string logic — normalise, validate, **RESERVED_HANDLES** |
| `src/lib/store-handle-db.ts` | Availability check, handle resolution, transactional rename |
| `src/lib/store-view.tsx` | Shared storefront loader + view used by both routes |
| `src/app/[handle]/page.tsx` | The vanity URL route |
| `src/app/api/sellers/check-handle/route.ts` | Live availability endpoint |
| `src/components/seller/StoreHandleField.tsx` | Handle picker with debounced checking |
| `prisma/migrations/20260804_120000_add_store_handle/migration.sql` | Schema migration |

**Modified**

`prisma/schema.prisma` · `src/lib/validations.ts` · `src/app/api/sellers/route.ts` · `src/app/api/sellers/profile/route.ts` · `src/app/store/[sellerId]/page.tsx` · `src/app/become-seller/page.tsx` · `src/components/dashboard/SettingsClient.tsx` · `src/app/(seller)/dashboard/qr-code/page.tsx` · `nexcart-catalog/prisma/schema.prisma` · `nexcart-catalog/src/lib/catalog-sync.ts`

## The three decisions that matter

### 1. Reserved handles are load-bearing

Handles sit at the site root, so they compete with every top-level route. Next.js resolves static segments first, so `/cart` still works — but a seller who claimed `cart` would own a store that is **silently unreachable**, with nothing in the logs explaining it.

`RESERVED_HANDLES` in `src/lib/store-handle.ts` blocks this. It deliberately includes routes that **don't exist yet** — `careers`, `help`, `blog`, `press`, `pricing`, `cookies`, `returns` — because your footer already links to them. The day someone builds `/careers`, it would shadow that seller.

> **Adding any new top-level route? Add it to `RESERVED_HANDLES` in the same commit and check no seller owns it.**

### 2. Printed QR codes cannot break

`dashboard/qr-code` generates a downloadable PNG that sellers **print**. Those codes can't be recalled.

- `/store/<sellerId>` is kept forever and now `permanentRedirect`s (308) to the handle when one exists — old printed codes still work.
- The QR page now generates the handle URL for new codes.
- Renamed handles are parked in `StoreHandleHistory` and redirect to the current one, so a handle change doesn't kill links already shared to Instagram/WhatsApp.

### 3. Handles are stored lowercase

Postgres `UNIQUE` is case-sensitive. Without normalising on write, `Pickles_02` and `pickles_02` would both insert as separate stores one shift-key apart. `normalizeHandle()` lowercases everything before it reaches the DB, and also strips what sellers actually paste: `@pickles_02`, `instagram.com/pickles_02`, a full `https://…/` URL.

## Behaviour

- Handle is **optional**. Sellers who skip it stay on `/store/<sellerId>` and can claim one later from Settings.
- Signup pre-fills a suggestion from the store name, but only until the seller edits the field. `AK FOOT WEARuuulkjh` produces nothing usable, so it's left blank rather than auto-generating garbage.
- Rules match Instagram's (3–30 chars, `a-z0-9._`, no leading/trailing or doubled separators) since most sellers are copying their Instagram handle across.
- Purely numeric handles rejected — ambiguous against any future numeric ID route.
- Availability endpoint is rate limited to 30/min/IP and never reveals which store owns a taken handle.

## Not done — needs your decision

**Backfill for the 4 existing sellers.** No handles assigned. `Krishna Store` → `krishna_store` slugifies cleanly; `AK FOOT WEARuuulkjh` and `Nani` don't. They'll be prompted in Settings — or tell me and I'll write a backfill script.

**Catalog app storefronts.** Schema + sync now carry `storeHandle`, but `nexcart-catalog` has **no `/[handle]` route** — it only serves `/store/[sellerId]`. If you deploy that app publicly, add the equivalent route there.

**`SettingsClient` may be sending unauthenticated PATCHes.** Pre-existing, unrelated to this work: its `fetch("/api/sellers/profile")` sends no `Authorization: Bearer` header, while `getVerifiedUid` requires one. Either that component is unused or saving settings is already broken. Worth checking.

## Suggestions when a handle is taken

Instagram-style alternatives (`pickles_02` taken → `pickles_02_official`, `pickles_021`, …), offered as clickable chips under the error.

- `generateHandleCandidates()` in `store-handle.ts` — pure, builds ~15 candidates from descriptive suffixes (`_official`, `_store`, `_shop`, `_hq`, `_in`), numeric variants, and prefixed forms. Every candidate is run through `validateHandle`, so a reserved word can never be suggested.
- `suggestAvailableHandles()` in `store-handle-db.ts` — filters them against the DB **in two queries** using `in`, not one query per candidate. That matters: this endpoint is hit on every keystroke, so the naive loop would be ~30 round trips per character typed.
- Only computed when the handle is actually unavailable — an available handle costs nothing extra.
- Long names are clipped to fit the 30-char limit, and any trailing `.`/`_` left by clipping is stripped so the suggestion stays valid.

## Self-review pass (2026-08-04) — 3 bugs found and fixed

Re-read every file after writing it. Found and fixed:

1. **Dead cache-busting call.** `profile/route.ts` called `bustCache(CACHE_KEYS.seller(previousHandle))` on rename. `CACHE_KEYS.seller` is keyed by **sellerId**, not handle, so this deleted a Redis key that never existed — and the comment claimed it was preventing stale pages. Removed; `revalidateTag("sellers")` is what actually covers it.
2. **Unused variable that would have failed the build.** Removing the above orphaned `previousHandle`. Your `next.config.mjs` sets `eslint: { ignoreDuringBuilds: false }`, so an unused variable is a **build failure**, not a warning.
3. **Concurrent handle claim returned a 500.** Two signups submitting the same handle both pass the advisory availability check; one loses at the unique constraint and fell into the generic catch. Now returns `400 "That handle was just taken."`

Also verified by hand: no unused imports in any new file (same build-failure risk), no circular imports, `getSeller` returns `storeHandle` (Prisma `include` returns all scalars), and no root-level dynamic-route conflict with `[handle]`.

## What could NOT be verified

`tsc`, `eslint` and `prisma validate` were all attempted and none completed — the first two exceed the sandbox time limit on a project this size, and Prisma's engine download is blocked by the network allowlist (403). **The code has still never been compiled.**

One mitigation worth knowing: your `package.json` already does `"build": "prisma generate && next build"` and `"postinstall": "prisma generate"`, so a normal build regenerates the client automatically. You only need to run `npx prisma generate` by hand before `next dev`.

Until then, `db.storeHandleHistory` is `undefined` on the client. `resolveHandle` calls it whenever a URL doesn't match a seller — so **without `prisma generate`, every 404 on the site throws a TypeError instead of rendering not-found.**

## Verification checklist

1. Register a store with handle `pickles_02` → visit `/pickles_02`
2. Try `cart`, `admin`, `careers` → rejected as reserved
3. Try `Pickles_02` → normalises to the taken `pickles_02`, reported unavailable
4. Visit `/store/<sellerId>` → 308 redirect to `/pickles_02`
5. Rename to `pickles_03` → `/pickles_02` still redirects to `/pickles_03`
6. Visit `/definitely-not-a-store` → 404
7. Confirm `/cart`, `/search`, `/dashboard`, `/admin` still resolve normally
