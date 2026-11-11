# NexCart — Detailed Project Survey

*Surveyed from the codebase at `NexCart6-main` on 2026-08-04.*

## 1. What NexCart is

NexCart is a multi-vendor e-commerce marketplace, similar in shape to Flipkart/Amazon marketplace or Etsy: many independent sellers list products under one storefront, customers browse/buy across sellers in a single cart, and the platform takes a commission and handles logistics/payouts. It is built as **two separate Next.js 14 (App Router) applications sharing one conceptual product**, plus a PostgreSQL database (via Prisma) and a cluster of third-party services for everything the platform doesn't do itself.

Four roles are modeled end-to-end: `CUSTOMER`, `SELLER`, `ADMIN`, `DELIVERY_AGENT`.

## 2. Repo layout — two apps, one platform

**`NexCart6-main/` (root) — the main app.** Everything transactional: auth, cart, checkout, orders, payments, payouts, reviews, returns, seller dashboard, admin dashboard, delivery-agent dashboard. This is the one with the database of record.

**`nexcart-catalog/` — a second, independent Next.js app.** Its own `package.json`, own Prisma schema, own database. Purpose: serve the read-heavy, high-traffic browse/search pages (home, category, product, search, storefront) from a *separate* database so browsing traffic never competes with the main app's connection pool for order/payment writes. Data flows one-way, main DB → catalog DB, via `nexcart-catalog/scripts/sync.ts`, intended to run on a schedule (Vercel Cron or a small worker) every 5–15 minutes. The catalog app has no auth, no cart/checkout — "Buy Now" always links back to the main app. It's fully additive; removing it doesn't affect the main app.

This is a deliberate scaling pattern, not an accident — worth knowing before touching either app's schema, since the two Prisma schemas (`prisma/schema.prisma` and `nexcart-catalog/prisma/schema.prisma`) are independent and must be kept compatible manually.

## 3. Technology stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS, Radix UI primitives, `class-variance-authority`, `framer-motion` |
| State | Zustand (client store), React Hook Form + Zod (forms/validation) |
| Database | PostgreSQL (Supabase-hosted), Prisma ORM 5.10 |
| Auth | Firebase Authentication (client SDK + Admin SDK server-side verification) |
| Payments | Razorpay (orders/checkout) + Razorpay Route (seller payouts) |
| Images | Cloudinary (`next-cloudinary`) |
| Shipping/courier | Shiprocket (full API client — shipment creation, AWB, pickup, labels, tracking, cancellation, reverse pickup) |
| Email | Resend |
| Push notifications | Firebase Cloud Messaging (`firebase-messaging-sw.js`, FCM tokens stored per user) |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) — optional, no-ops if unconfigured |
| PWA | `@ducanh2912/next-pwa`, manifest, service worker |
| Testing | Vitest (unit tests), Playwright (installed as a dev dependency) |
| CI | GitHub Actions — type-check, lint, `next build` on every push/PR |
| Hosting | Vercel (`vercel.json` defines cron schedules) |

## 4. Data model (Prisma, main app — 25 models)

Grouped by domain:

**Identity & sellers:** `User` (role enum, Firebase UID, email verification), `Seller` (store profile, GSTIN/state for GST invoicing, wallet balance, storefront customization fields like `spinWheelSegments`, `festivalThemeEnabled`, `floatingBarConfig`), `Subscription` (TRIAL/MONTHLY/HALF_YEARLY/YEARLY plans tied to a seller), `DeliveryAgent` (belongs to one seller).

**Catalog:** `Category`, `Product` (condition enum ORIGINAL/REFURBISHED/BOX_OPEN, GST rate + HSN code, JSON `specifications`/`variantImages`), `ProductVariant`.

**Commerce:** `Cart`/`CartItem`, `Wishlist`/`WishlistItem`, `Address`, `Order` (rich delivery-method/status/COD/pickup/tracking fields), `OrderItem`, `Payment` (Razorpay IDs + signature), `Coupon`, `SellerOffer` (buy-x-get-y, percent/flat off, deals-of-the-day).

**Post-purchase:** `Return` (reason enum, shipping-cost-attribution, COD refund tracking), `Review`/`ReviewVote` (with seller replies), `SellerRating`, `ProductQA`.

**Money movement:** `Payout` (unique per seller+order to block duplicate webhook-driven payouts), `SellerBankAccount`, `SellerTransaction` (wallet ledger).

**Engagement/misc:** `Notification` (18 notification types), `FcmToken`, `StoreFollow`, `StoreView`, `StoreCollection`, `GiftRegistry`/`GiftRegistryItem`.

Indexing is thoughtful throughout — composite indexes exist for the actual query patterns used (e.g. `Product` has separate `[isActive, createdAt]`, `[isActive, isFeatured]`, `[isActive, salesCount]`, `[isActive, price]` indexes rather than one generic index).

14 migrations exist, dated May–June 2026, covering product type/specs, subscription plans, product condition, email verification, notifications, product Q&A, review votes, order `deliveredAt`, payout uniqueness, seller GSTIN, GST invoice fields, and variant compare price. Per `HANDOFF_NOTES.md`, some schema changes were applied via `prisma db push` rather than `migrate dev`, so migration history doesn't fully reconstruct the current schema — flagged there as needing a `migrate dev --create-only --name baseline_sync` reconciliation before deploying to a fresh database.

## 5. Application routes (`src/app`, route groups)

- **`(customer)`** — account, cart, checkout, orders (+ detail, invoice, pickup, tracking sub-pages), notifications, registry, wishlist.
- **`(seller)/dashboard`** — overview, analytics, products (+ new/edit), orders, returns, payouts, subscription, flash-sale, offers, collections, gallery, highlights, delivery-agents, QR code, settings.
- **`(admin)/admin`** — overview, sellers, products, orders, payments, payouts, returns, delivery-agents.
- **`(delivery)/delivery/dashboard`** — delivery agent's assigned-orders view.
- **Public storefront** — `/` (home), `/product/[productId]`, `/store/[sellerId]` (+ `/deals`, `/flash-sale` sub-pages), `/categories/[category]`, `/search`, `/deals`, `/trending`, `/flash-sale`, `/new`, `/registry/[slug]`, `/gallery/[sellerId]`, plus `/about`, `/become-seller`, `/terms`, `/privacy`, `/refund-policy`.
- **Auth** — `/sign-in`, `/sign-up`, `/verify-email`, `/verify-email-pending`, `/onboarding`.
- **PWA/SEO plumbing** — `manifest.ts`, `robots.ts`, `sitemap.ts`.

## 6. API surface (`src/app/api`, 84 route files)

Roughly organized as:

- **Auth/account:** `auth/sync`, `auth/verify-email`, `user`, `account/summary`.
- **Catalog:** `products` (+ `[productId]`, `variants`, `variants/bulk`, `customers-also-bought`, `recently-viewed`, `reviews` + reply/vote, `qa` + reply), `categories`, `search` + `autocomplete`, `deals-of-the-day`, `flash-sale`.
- **Cart/commerce:** `cart`, `wishlist`, `addresses`, `coupons`, `registry` (+ items).
- **Orders/payments:** `orders` (+ `[id]`, `tracking`), `payments` (+ `verify`, `subscription`), `returns` (+ `[id]`).
- **Seller-side:** `sellers` (public seller profile, collections, follow, offers, viewing-presence), `sellers/products` (+ csv-import, duplicate), `sellers/orders` (+ assign-agent, delivery, location, pickup, ship), `sellers/analytics`, `sellers/collections`, `sellers/delivery-agents`, `sellers/flash-sale`, `sellers/gallery`, `sellers/highlights`, `sellers/offers`, `sellers/payout`/`payouts`, `sellers/presence`, `sellers/ratings`, `sellers/returns/[id]/confirm`, `sellers/wallet`, `sellers/profile`, `sellers/check-local`, `seller/bank-account`.
- **Admin:** `admin/analytics`, `admin/payouts`, `admin/returns` (+ `[id]/cod-refund`), `admin/sellers`.
- **Delivery agent:** `delivery/orders` (+ `[id]/confirm`).
- **Infra/system:** `health` (real `SELECT 1` DB check), `upload` (Cloudinary), `fcm-token`, `notifications` (+ `[id]`), `webhooks/razorpay`, `webhooks/clerk`, `webhooks` (bare — see finding below), `cron/inventory-alerts`, `cron/process-payouts`, `cron/subscription-reminders`.

Auth pattern: there is **no centralized authorization in middleware** (`src/middleware.ts` only distinguishes public vs. non-public paths and passes everything else through). Every route individually calls `getVerifiedUid(req)` / `getAuthUser(req)` from `src/lib/auth.ts`. This is a normal App Router pattern but means there's no safety net — a new route that forgets the auth check is a real vulnerability.

## 7. Core `src/lib` layer

- **`auth.ts`** — `getVerifiedUid`/`getAuthUser`. Verifies the Firebase ID token server-side via Admin SDK (`adminAuth.verifyIdToken(token, true)`, checks revocation). Has a documented, fail-closed-in-production dev fallback (decodes JWT payload unverified, or accepts a raw Firebase UID matched against the DB) for local development without Admin SDK credentials — explicitly disabled when `NODE_ENV === "production"`.
- **`firebase-admin.ts`** — builds the service-account credential from either one JSON blob (`FIREBASE_SERVICE_ACCOUNT_JSON`) or three discrete env vars.
- **`db.ts`** — Prisma singleton with a fallback proxy: if `@prisma/client` isn't generated, the app degrades gracefully (returns empty/default results) instead of crashing, and logs setup instructions. Also auto-appends `connection_limit=1&pool_timeout=10` to the connection string, tuned for serverless + PgBouncer (Supabase transaction pooling).
- **`razorpay.ts` / `razorpay-route.ts`** — payment order creation/verification and seller payout (Route) API clients.
- **`shiprocket.ts`** — full courier API client: auth, create shipment, assign AWB, schedule pickup, generate label, live tracking, cancel, serviceability check, reverse pickup.
- **`cloudinary.ts`** — image upload.
- **`email.ts`** — Resend wrapper.
- **`fcm.ts`** — Firebase Cloud Messaging push.
- **`ratelimit.ts` / `rate-limit.ts`** — Upstash sliding-window limiter, no-ops without Redis env vars configured (two similarly-named files — worth checking for duplication/dead code).
- **`validations.ts`** — Zod schemas (products, coupons, returns, etc.) with tested business rules (e.g. coupon discount capped at 100%).
- **`gst.ts`** — GST calculation logic (has a dedicated test file, `gst.test.ts`).
- **`product-utils.ts`**, **`notifications.ts`**, **`dashboard-cache.ts`**, **`db-cache.ts`**, **`cache.ts`**, **`seller-onboarding.ts`**, **`seo.ts`**, **`sanitize.ts`**, **`wallet.ts`**, **`category-config.ts`**, **`constants.ts`**, **`logger.ts`**, **`utils.ts`** — supporting utilities.
- **`store/index.ts`** — Zustand client store; **`hooks/index.ts`** — shared React hooks.

## 8. Money flow (payments, payouts, returns)

1. **Checkout:** `api/payments/route.ts` validates the requested amount against the server-computed order total before creating a Razorpay order (prevents client-side under-payment).
2. **Webhook (`api/webhooks/razorpay/route.ts`):** verifies signature with `timingSafeEqual`; on `payment.captured`, moves the order to `CONFIRMED` and creates one `Payout` row per seller in the order (status `PENDING`), net of a platform fee percentage. A `@@unique([sellerId, orderId])` constraint on `Payout` stops retried webhooks from double-paying a seller (manual withdrawal requests use `orderId = NULL`, which Postgres treats as distinct, so those aren't blocked by the constraint).
3. **Payout processing:** `api/cron/process-payouts` (daily, per `vercel.json`) pushes `PENDING` payouts through Razorpay Route.
4. **Stock:** order placement decrements stock inside a transaction using a conditional `updateMany` (`WHERE stock >= qty`), which is concurrency-safe against overselling; a zero-row result maps to a 409 `OUT_OF_STOCK` response.
5. **Coupons:** percentage discounts are capped at 100%, and total discount is capped at `min(discount, orderTotal)` — a coupon can never make an order free-and-negative.
6. **Returns:** return-window deadline is computed from `order.deliveredAt ?? order.updatedAt`. Admin's manual `MARK_REFUNDED` override restores stock and only flips the parent order to `REFUNDED` once every item's return is refunded (mirrors the seller-side confirm flow) — this was previously buggy (force-set whole order, no stock restore) and has since been fixed per `HANDOFF_NOTES.md`.

## 9. Background jobs

Three Vercel Cron jobs (`vercel.json`): `subscription-reminders` (09:00 daily), `inventory-alerts` (08:00 daily), `process-payouts` (10:00 daily). All cron endpoints require a matching `Authorization: Bearer <CRON_SECRET>` and fail closed if `CRON_SECRET` isn't set.

## 10. Testing & CI

Unit tests exist for `gst.ts`, `product-utils.ts`, and `validations.ts` (Vitest). Playwright is installed but no e2e test files were found in the survey — likely scaffolded but not yet used, worth confirming. GitHub Actions CI (`.github/workflows/ci.yml`) runs on every push/PR to `main`/`master`: `prisma generate` → `tsc --noEmit` → `next lint` → `next build`, using dummy env vars so missing secrets don't break the build step (real secrets only needed at runtime).

## 11. Notable findings (from prior audit docs + spot-checks against actual code)

These were documented in `HANDOFF_NOTES.md` and `NEXCART_CODEBASE_REVIEW.md` (already present in the repo) and I independently verified the auth, DB, and middleware claims against the actual source:

- **Critical:** `.env` at the project root (gitignored, not in git history, but present on disk) contains live production credentials — Supabase DB password, a full Firebase service-account private key, Cloudinary secret, Resend API key, a live Razorpay key prefix. Treat as compromised; rotate regardless of anything else.
- **High:** `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `CRON_SECRET` are blank/placeholder in `.env` — payments, webhook verification, and all cron endpoints will fail until real values are set.
- **Medium:** the auth dev-fallback (raw-UID acceptance) is fail-closed in production *only if* `NODE_ENV=production` is actually set in the deployment environment — true automatically on Vercel, worth confirming on any self-hosted/Docker deployment.
- **Medium:** rate limiting is entirely opt-in via Upstash; with it unconfigured (current `.env`), order placement, payments, registration, auth, and uploads have no abuse protection.
- **Low:** `src/middleware.ts` does no real authorization (see §6) — a missed `getVerifiedUid` check in a new route is a real gap with no safety net.
- **Low:** both `src/app/api/webhooks/route.ts` and `src/app/api/webhooks/clerk/route.ts` exist despite the app using Firebase (not Clerk) for auth — worth confirming these are dead code or removing them.
- **Low:** two similarly-named rate-limit files (`ratelimit.ts`, `rate-limit.ts`) in `src/lib` — worth checking for duplication.
- **Cosmetic:** stray local artifacts in the repo root — `dev.err`, `dev.log`, `sync-test.txt`, `public/icon-192.png.bak` — safe to delete/gitignore.
- **Migration drift:** several models (`Payout`, `DeliveryAgent`, `GiftRegistry`, `StoreCollection`, `SellerTransaction`, `StoreView`, `FcmToken`, `SellerBankAccount`, and various fields) appear to have reached the schema via `prisma db push` rather than tracked migrations — a fresh database via `prisma migrate deploy` would not currently match `schema.prisma` without the recommended `baseline_sync` reconciliation.
- **Not yet verified:** neither `npm run build` nor `npx tsc --noEmit` has been confirmed clean recently (flagged as the first to-do in `HANDOFF_NOTES.md`).

## 12. What's solid

Per the existing review (and spot-checked): Razorpay webhook signature verification uses `timingSafeEqual` correctly; payment amount is validated server-side before order creation; stock decrement is transaction-safe against overselling; coupon discounts are properly capped; `getVerifiedUid` is consistently used across the sampled API routes; the health-check endpoint does a real DB round-trip rather than a static 200; the two-app split (main + catalog) is a clean, additive scaling pattern rather than a half-finished migration.
