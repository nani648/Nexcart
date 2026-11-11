# NexCart Codebase Review

## 1. What this project is

NexCart is a multi-vendor e-commerce marketplace built on **Next.js 14 (App Router)** with **TypeScript**, **Prisma + PostgreSQL (Supabase)**, **Firebase Auth**, **Razorpay** (payments + seller payouts via Route), **Cloudinary** (images), **Shiprocket** (courier/shipping), **Resend** (email), and optional **Upstash Redis** (rate limiting). It supports four roles: `CUSTOMER`, `SELLER`, `ADMIN`, `DELIVERY_AGENT`.

The repo includes `HANDOFF_NOTES.md`, which documents a prior audit/fix pass — many of the issues a fresh review would normally flag (payment amount validation, webhook signature checks, stock-decrement race conditions, coupon caps, return-window calculation, payout duplication) have **already been fixed**. This review focuses on the current state and anything still outstanding.

## 2. Architecture overview

### App routes (`src/app`)
Organized by route groups:
- `(customer)`: account, cart, checkout, orders, notifications, registry, wishlist
- `(seller)/dashboard`: products, orders, analytics, payouts, subscription, flash-sale, offers, returns, settings, delivery agents, gallery, collections, highlights, QR code
- `(admin)/admin`: sellers, products, orders, payments, payouts, returns, delivery agents
- `(delivery)/delivery/dashboard`: delivery agent view
- Public storefront pages: `/`, `/product/[productId]`, `/store/[sellerId]`, `/categories/[category]`, `/search`, `/deals`, `/trending`, `/flash-sale`, `/new`, `/registry/[slug]`, `/gallery/[sellerId]`, plus legal pages (`/terms`, `/privacy`, `/refund-policy`, `/about`, `/become-seller`)

### API (`src/app/api`) — ~60 route files
Covers products/variants, categories, cart, wishlist, addresses, orders (+ tracking, invoice), returns, reviews/Q&A, coupons, search (+autocomplete), seller management (products, orders, offers, collections, gallery, highlights, delivery agents, bank account, payouts, wallet, ratings), admin (sellers, returns, payouts, analytics), delivery agent endpoints, payments (Razorpay create/verify + subscription), webhooks (Razorpay, Clerk — see finding below), notifications, FCM tokens, image upload, OG image generation, PWA manifest/icons, health check, and cron jobs (inventory alerts, payout processing, subscription reminders).

### Core lib (`src/lib`)
- `auth.ts` — Firebase ID token verification (`getVerifiedUid`/`getAuthUser`), with a documented dev-only fallback that's fail-closed in production.
- `db.ts` — Prisma singleton with a fallback proxy so the app doesn't crash if Prisma client isn't generated.
- `ratelimit.ts` — Upstash-based sliding-window rate limiter, no-ops if Redis isn't configured.
- `validations.ts` — Zod schemas (products, coupons, returns, etc.).
- `razorpay.ts` / `razorpay-route.ts` / `shiprocket.ts` / `cloudinary.ts` / `firebase.ts` / `firebase-admin.ts` / `email.ts` / `fcm.ts` — third-party integrations.
- `notifications.ts`, `dashboard-cache.ts`, `db-cache.ts`, `seller-onboarding.ts`, `gst.ts`, `seo.ts`, `sanitize.ts`.

### Data model (`prisma/schema.prisma`)
~25 models covering users/sellers/delivery agents, products/variants/categories, orders/order items/payments/payouts/seller transactions, reviews/votes/Q&A, returns, coupons/seller offers, carts/wishlists/addresses, notifications, gift registries, store collections/follows/views, and FCM tokens. Indexing looks thoughtful (composite indexes for common query patterns). GST fields (gstin, hsnCode, gstRate, state) were added recently for invoicing.

### Recent migrations
14 migrations from May–June 2026 covering product type/specs, subscription plans, product condition, email verification/ratings/returns, notifications, product Q&A, review votes/seller replies, order `deliveredAt`, payout uniqueness, seller GSTIN, GST invoice fields, and variant compare price. `HANDOFF_NOTES.md` flags that schema has drifted from migration history in places (likely from `prisma db push`) and recommends a `migrate dev --create-only --name baseline_sync` reconciliation before deploying to a fresh DB.

## 3. Findings

### 🔴 Critical — live secrets are committed to a tracked file in this folder
The `.env` file in the project root (which **is** `.gitignore`d, so it likely isn't in git history) contains **live, working production credentials**:
- Supabase Postgres connection strings with a real password (`Kittu@20052000`)
- A complete Firebase Admin **service account private key** (full PEM)
- Cloudinary API key + secret
- A Resend API key (`re_E34QBvjL_...`)
- A live Razorpay key ID prefix (`rzp_live_...`, secret currently blank)

Because this file was read into this session, **treat all of these as exposed** and rotate them: regenerate the Firebase service account key, rotate the Supabase DB password, regenerate the Cloudinary API secret, and roll the Resend API key. Going forward, keep real credentials only in `.env.local` (already gitignored) or your hosting provider's secret store, and keep `.env` as a template with placeholders only — even though it's gitignored, anyone with filesystem/zip access to the project gets full production access.

### 🟠 High — incomplete payment configuration
`RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are blank in `.env`. `src/app/api/payments/route.ts` will throw at runtime when calling `razorpay.orders.create()` (the SDK is constructed with `key_secret: undefined`), and the webhook handler explicitly returns 500 if `RAZORPAY_WEBHOOK_SECRET` is unset (by design — fail closed). `CRON_SECRET` is also still the placeholder `your_random_secret_heres`, so all `/api/cron/*` endpoints will reject every request until it's set to a real random value.

### 🟡 Medium — auth fallback path
`src/lib/auth.ts`'s `verifyFirebaseToken` has a documented non-production fallback that (a) decodes an unverified JWT payload, or (b) accepts a raw Firebase UID string if it matches a `User.firebaseUid` in the DB. This is intentionally gated behind `NODE_ENV !== "production"` and is well-commented, but it's worth double-checking that `NODE_ENV=production` is actually set in your deployment environment (Vercel sets this automatically, but self-hosted/docker setups sometimes don't) — otherwise any client could authenticate as any user by sending their raw `firebaseUid`.

### 🟡 Medium — rate limiting is opt-in and silent
`rateLimit()` no-ops whenever Upstash env vars are missing (current `.env` has them blank), so order placement, payment creation, seller registration, auth, product creation, and uploads currently have **no abuse protection** in this environment. This is documented in `EXTERNAL_SERVICES_SETUP.md` as a known gap, just flagging it as still open.

### 🟢 Low — middleware does no real authorization
`src/middleware.ts` only distinguishes "public" vs "non-public" paths and otherwise passes everything through — all real auth/role checks happen per-route (each API route calls `getVerifiedUid`/`requireAdmin`/checks `user.seller`, etc., which from the samples reviewed — orders, payments, admin/sellers, sellers/products, webhooks — looks consistently applied). This is a reasonable pattern for App Router but means a missed check in any new route is a real vulnerability with no safety net. Worth a periodic grep for new `api/**/route.ts` files that don't call `getVerifiedUid`/`requireAdmin`.

### 🟢 Low — webhook route naming
There's both `src/app/api/webhooks/route.ts` and `src/app/api/webhooks/razorpay/route.ts`, plus `src/app/api/webhooks/clerk/route.ts` even though the auth provider used elsewhere is **Firebase**, not Clerk. Worth confirming `webhooks/clerk` and the bare `webhooks/route.ts` are either actively used or dead code that can be removed to reduce confusion/attack surface.

### Stray files
`dev.err`, `dev.log`, `sync-test.txt`, `public/icon-192.png.bak`, and `tsconfig.tsbuildinfo` look like leftover local artifacts that could be deleted/gitignored.

## 4. What's already solid (per HANDOFF_NOTES.md, spot-checked)
- Razorpay webhook signature verification uses `timingSafeEqual` (checked — correct).
- Payment amount is validated server-side against the order total before creating a Razorpay order (checked — correct).
- Order creation uses a transaction with conditional `updateMany` for stock decrement, preventing overselling (checked — correct).
- Coupon discounts are capped (percentage ≤ 100%, and discount ≤ order total).
- Admin seller-approval flow creates a trial subscription and sends notifications/emails appropriately.
- `getVerifiedUid` is consistently used across the sampled API routes (orders, payments, admin, seller products) for authn/authz.

## 5. Suggested next steps
1. Rotate the credentials listed in §3 (highest priority — do this regardless of anything else).
2. Fill in `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and a real `CRON_SECRET`.
3. Set up Upstash Redis to enable rate limiting (5 minutes per `EXTERNAL_SERVICES_SETUP.md`).
4. Run `npx tsc --noEmit` and `npm run build` to confirm a clean build (HANDOFF_NOTES says this hasn't been verified recently).
5. Reconcile Prisma migration history vs. `schema.prisma` per HANDOFF_NOTES §7.3 before deploying to a fresh database.
6. Confirm `NODE_ENV=production` in your hosting environment to disable the auth dev-fallback.
