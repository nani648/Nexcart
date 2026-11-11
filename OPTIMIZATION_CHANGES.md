# NexCart — Optimization Pass (2026-08-04)

Scope agreed beforehand: page-load speed, DB query efficiency, client bundle size, and dead-code cleanup — **safe changes only**. Payment, auth-verification, order-placement and payout logic were deliberately not touched.

## Headline finding

Much of the obvious optimization work had already been done by a previous pass. Before changing anything I verified that the following were already in place, so I left them alone:

- ISR/caching on nearly every public page (`revalidate` on home, product, store, category, trending, new, flash-sale, gallery, legal pages; `force-static` + 30-min revalidate on the homepage).
- `next.config.mjs` already has AVIF/WebP, a 30-day image cache TTL, tuned `deviceSizes`/`imageSizes`, `optimizePackageImports` for the 13 heaviest packages, `compress`, and long-lived immutable cache headers for static assets.
- `Promise.all` batching already used in the admin dashboard, notifications, and several API routes.
- A Redis cache-aside helper (`src/lib/cache.ts`) already wired into products, search, and seller endpoints.
- Dynamic imports already used in `layout.tsx`, the homepage, `Navbar`, and `HeroSection`.

The remaining wins were concentrated rather than spread across all ~200 files, so this pass targets those instead of churning files that were already fine.

## Changes made

### 1. Removed redundant DB round-trips (biggest win)

The most repeated inefficiency in the codebase: `db.user.findUnique({ where: { firebaseUid } })` followed by a *second* query filtered on `user.id`. Every authenticated API call paid an extra sequential round-trip to Supabase. Replaced with Prisma nested relation filters, which resolve it in one statement. Ownership/authorization is still enforced — it now happens inside the same query rather than in a separate step, so nothing is loosened.

| File | Handler | Queries before → after |
|---|---|---|
| `src/app/api/cart/route.ts` | GET | 2 → 1 |
| | POST | 4 sequential → 3 (user/product/variant now parallel) |
| | PATCH | 4 → 1 |
| | DELETE | 3 → 1 |
| `src/app/api/wishlist/route.ts` | GET | 2 → 1 |
| | POST | 3 → 3 (user + product now parallel) |
| | DELETE | 4 → 2 |
| `src/app/api/addresses/route.ts` | GET | 2 → 1 |
| `src/app/api/notifications/route.ts` | GET | 3 → 2 (both now parallel) |
| | PATCH | 2 → 1 |
| `src/app/api/notifications/[id]/route.ts` | PATCH | 3 → 2 |

Cart and notifications are polled on nearly every page for logged-in users, so this is the change most likely to be felt.

### 1b. Second pass — remaining routes

| File | Handler | Change |
|---|---|---|
| `api/registry/route.ts` | GET | 2 → 1 (relation filter) |
| `api/registry/[slug]/route.ts` | DELETE | 3 → 1 |
| `api/registry/[slug]/items/route.ts` | POST | 2 → 1 |
| `api/registry/[slug]/items/[itemId]/route.ts` | DELETE | 3 → 1 |
| | PATCH | 3 → 2 |
| `api/products/reviews/route.ts` | POST | 5 sequential → 3 (user/product/purchase-check parallel; seller `userId` now comes from the product relation, removing a lookup) |
| | GET | narrowed product select |
| `api/products/reviews/[reviewId]/vote/route.ts` | POST | user + review now parallel |
| `api/products/[productId]/qa/route.ts` | POST | user + product now parallel |
| `api/products/[productId]/route.ts` | PATCH, DELETE | user + product now parallel |
| `api/sellers/[sellerId]/follow/route.ts` | GET | user lookup removed (relation filter) |
| | POST | 3 sequential → 1 parallel pair; seller's own `firebaseUid` now nested in the seller select |
| `api/sellers/ratings/route.ts` | POST | user + order parallel; **aggregate instead of full-table load** (below); two seller writes merged into one |
| | GET | ratings + seller now parallel |
| `api/admin/sellers/route.ts` | PATCH | `include: { user: true }` narrowed to 3 fields; subscription check+create → single `upsert` |
| `api/orders/[id]/route.ts` | GET | 2 → 1 (relation filter) |
| | PATCH | user + order parallel; `items.seller` narrowed to `{ id, userId }` |
| `api/orders/[id]/tracking/route.ts` | GET | 2 → 1; `seller` narrowed from the full row to 2 fields |

**The most consequential fix in this pass** is in `api/sellers/ratings/route.ts`. Submitting a rating previously ran:

```ts
const allRatings = await db.sellerRating.findMany({ where: { sellerId } });   // every rating row
const sellerOrders = await db.orderItem.findMany({ where: { sellerId } });    // every order item row
```

…purely to compute an average and two `.length` values. Both loaded the seller's entire history into memory on every single rating submission, so the cost grew linearly with seller success. Replaced with `aggregate({ _avg, _count })` and `count()`, which the database answers without shipping rows. Also folded the verified-badge write into the main `seller.update` instead of issuing a second one.

Two smaller payload wins worth noting: `orders/[id]/tracking` and `orders/[id]` PATCH were both pulling **entire `Seller` rows** — including the large JSON storefront-config columns (`spinWheelSegments`, `shakeConfig`, `floatingBarConfig`, `quickTags`, `highlights`) — when only `storeName`/`userId`/`phone` were read. Now narrowed to explicit selects.

**Behavior changes to be aware of** — all are error-path only, and no successful response changed shape:

- `PATCH /api/cart`, `PATCH /api/notifications/[id]`, `DELETE /api/registry/[slug]`, and the registry item routes previously distinguished "user not found" / "cart not found" / "forbidden". They now return a single `404`. Same status family, and it avoids leaking whether an id exists.
- `GET /api/orders/[id]/tracking` returned `403 Forbidden` when an order belonged to someone else; it now returns `404 Order not found`.
- `POST /api/products/reviews` now reports `404 Product not found` before `403 …only review products you have purchased` when the product doesn't exist at all (previously the 403 won, since a nonexistent product also has no purchase record).

If any client code branches on those specific messages or on 403-vs-404, it needs a look.

### 1c. Third pass — `api/sellers/analytics/route.ts`

Two real fixes in the seller analytics endpoint (the seven main queries were already correctly batched in a `Promise.all`):

- **Distinct-order count.** `db.orderItem.findMany({ select: { orderId }, distinct: ["orderId"] })` loaded one row per distinct order into memory purely to read `.length`. Replaced with `db.order.count({ where: { items: { some: { sellerId } }, … } })` — semantically identical, answered entirely by the database. Same class of bug as the `sellers/ratings` fix, and it grew with the seller's order history.
- **Chart payload.** The 30-day order-item query used `include`, pulling every `OrderItem` column when only `price` and `order.createdAt` are read. Narrowed to an explicit `select`.

### 1d. Where I looked and found nothing to fix

Recorded so nobody re-does this work. All of the following were checked and are already correct:

- `tsconfig.json` — already has `skipLibCheck`, `incremental`, `moduleResolution: bundler`, `isolatedModules`, and excludes `node_modules` + `nexcart-catalog`. This is already the fast-compile configuration; there is no meaningful build-time win left here.
- `next.config.mjs` — already has AVIF/WebP, 30-day image cache TTL, tuned `deviceSizes`/`imageSizes`, `optimizePackageImports` across 13 packages, `compress`, immutable static-asset headers, and `serverComponentsExternalPackages` for Prisma/firebase-admin.
- `api/deals-of-the-day` and `store/[sellerId]/deals` — a grep for "query inside a loop" flagged these, but the loops are pure in-memory JSON parsing. Both already batch with `id: { in: [...] }`. Correct as written.
- `(admin)/admin/page.tsx` — already batches 8 queries in one `Promise.all`.
- `src/lib/store/index.ts`, `src/lib/hooks/index.ts` — small, no barrel-file re-export cost.
- ISR/caching — already applied across every public page.

### 2. Client bundle — deferred recharts

`src/app/(seller)/dashboard/page.tsx` statically imported `RevenueChart`, which pulls in **recharts** — one of the heaviest dependencies in the project — into the dashboard's initial JS payload. Converted to `next/dynamic` with `ssr: false` and a skeleton placeholder. The chart renders below the stats cards, so it now loads after the meaningful content instead of blocking it.

### 3. `.gitignore` hardening

Added `*.log`, `dev.err`, `*.bak`, `sync-test.txt`, `tsconfig.tsbuildinfo`, `*.tsbuildinfo` so local scratch artifacts stop accumulating in the repo.

The stray files themselves (`dev.log`, `dev.err`, `sync-test.txt`, `public/icon-192.png.bak`) are **still on disk** — the Linux sandbox never finished booting this session so I couldn't delete them safely. They're harmless; delete them whenever convenient.

## Deliberately NOT changed — and why

- **`src/app/api/webhooks/route.ts`** — this is a second, older Razorpay webhook handler that duplicates `webhooks/razorpay/route.ts` but is weaker: it uses a plain `!==` string compare instead of `timingSafeEqual`, dereferences `process.env.RAZORPAY_WEBHOOK_SECRET!` with no null guard (throws if unset), and does *not* create payout rows or update order status. It looks like dead legacy code — but if your Razorpay dashboard still points a webhook at `/api/webhooks`, deleting it would silently break payment capture. **Check the Razorpay dashboard webhook URL, then delete this file if it's unused.** Worth doing; it's a real footgun sitting in the payment path.
- **`src/components/dashboard/AnalyticsChart.tsx`** — confirmed unused (nothing imports it). Left in place in case it's about to be wired up; safe to delete otherwise. No bundle cost today since unreferenced modules aren't bundled.
- **`src/lib/rate-limit.ts`** (in-memory) vs **`src/lib/ratelimit.ts`** (Upstash) — two different rate limiters coexist. The in-memory one is used by `search`, `search/autocomplete`, and `coupons`; it doesn't actually work on serverless (each lambda instance has its own `Map`) and holds a module-scope `setInterval`. Migrating those three routes to the Upstash limiter would be correct — but Upstash isn't configured in your `.env`, so it would currently no-op and *remove* what little protection exists. Fix the Upstash config first, then consolidate.
- Payment/order/payout/auth-verification paths — out of scope per the agreed constraints.

## ⚠️ Nothing here has been compiled — read this first

**23 files were changed across three passes and not one of them has been compiled, linted, or run.** The Linux sandbox failed to start for the entire session, so every performance claim in this document is reasoning about query counts and payload sizes, not measurement.

**There is also no `.git` directory in this project.** This is an unzipped folder, not a repository, so there is no `git diff` to review and no way to revert the changes. Before anything else:

1. **Copy the whole folder somewhere safe**, or run `git init && git add -A && git commit -m "before optimization"` so you have a restore point.
2. Then run:

```
npx tsc --noEmit
npm run lint
npm run build
```

3. Smoke-test the touched flows: add to cart, update quantity, remove from cart, wishlist add/remove, mark notifications read, place/view an order, submit a seller rating, open the seller analytics page.

If the build fails, the error will almost certainly be in one of the 23 files listed above, and reverting a single file is enough.

## Suggested next steps (bigger wins, need more than a safe pass)

1. **Configure Upstash Redis.** `src/lib/cache.ts` and the rate limiter are both already written and wired in — they silently no-op without credentials. This is the single highest-leverage change available: it turns on caching *and* abuse protection across products, search, and seller endpoints with zero code changes.
2. **Resolve the webhook duplication** above.
3. **Audit for more full-table-load-then-count patterns** like the one fixed in `sellers/ratings`. That one was found by reading; a systematic grep for `findMany` results that are only ever used via `.length` or `.reduce` would likely turn up others. These are invisible at low volume and painful at high volume.
4. **Make the gift-registry purchase counter atomic.** `PATCH /api/registry/[slug]/items/[itemId]` reads `purchased`/`quantity`, compares, then increments — two gift-givers clicking simultaneously can both pass the check and over-count. Same class of bug the team already fixed for product stock with a conditional `updateMany`. Left alone here because fixing it is a logic change, not an optimization.

## Routes deliberately left alone

`api/orders/route.ts` (order placement), `api/payments/*`, `api/webhooks/razorpay`, `api/cron/process-payouts`, and the `MARK_REFUNDED` transaction in `api/admin/returns` were read but not modified. They contain the carefully-written concurrency-safe logic — conditional `updateMany` stock guards, `timingSafeEqual` signature checks, transaction claims against double-refund — and the agreed constraint was to leave payment/order/payout business logic untouched. Their data-fetching was already batched where it mattered.
