# NexCart — Handoff Notes (for continuing work in VS Code / Claude Code)
.\cloudflared.exe tunnel --url http://localhost:3000 --protocol http2
This document summarizes everything changed in this project across the recent
audit + fix sessions, so a fresh assistant (or you) can pick up where things
left off without re-discovering context.

Stack: Next.js 14 (App Router), Prisma + PostgreSQL (Supabase), Firebase Auth,
Razorpay (payments + Route payouts), Cloudinary (images), Shiprocket (courier),
Resend (email), Upstash Redis (rate limiting, optional).

---

## 1. Auth & Security Hardening

- Replaced an insecure `getFirebaseUidFromRequest` pattern everywhere with
  `getVerifiedUid(req)` from `src/lib/auth.ts` — verifies the Firebase ID
  token via Admin SDK (`adminAuth.verifyIdToken(token, true)`), with a
  dev-only unverified fallback if `NODE_ENV !== "production"`. Production is
  fail-closed (returns `null` → 401) if the Admin SDK isn't configured.
- `src/lib/firebase-admin.ts` now builds the service account credential from
  **either**:
  - `FIREBASE_SERVICE_ACCOUNT_JSON` (full JSON blob, preferred), **or**
  - `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
    (individual fields, `\n` in the private key is unescaped automatically).
  - Removed a dead/duplicate `verifyFirebaseToken` export from this file
    (the real one lives in `src/lib/auth.ts`).
- `src/app/api/seller/bank-account/route.ts` (GET/POST/DELETE) and
  `src/app/api/seller/payouts/route.ts` (GET) — switched from manual
  `Authorization` header parsing + the old `verifyFirebaseToken` to
  `getVerifiedUid(req)`, for consistency with the rest of the API.
- `seller/bank-account` POST now validates: account holder name non-empty
  and ≤100 chars, **account number must be 9–18 digits**, IFSC format
  regex, and `accountType` restricted to `"savings" | "current"`. Also
  wraps `req.json()` in try/catch.
- Cron endpoints (`/api/cron/*`) — secret check is fail-closed
  (`CRON_SECRET` required; requests without a matching
  `Authorization: Bearer <CRON_SECRET>` are rejected).
- `fcm-token` route — ownership check added so users can't register/remove
  tokens for other accounts.

---

## 2. Payments, Payouts & Webhooks

- `src/app/api/payments/route.ts` — payment amount is validated against the
  actual order total server-side (prevents client from under-paying).
- `src/app/api/webhooks/razorpay/route.ts`:
  - Signature verification uses `timingSafeEqual`.
  - On `payment.captured`: order → `CONFIRMED`, and a `Payout` row
    (`status: PENDING`) is created per seller in the order, net of
    `PLATFORM_FEE_PERCENT`.
  - **NEW**: `Payout` model now has `@@unique([sellerId, orderId])` (see
    migration `20260610_130000_payout_seller_order_unique`) so retried
    webhooks can't create duplicate payouts. `orderId IS NULL` rows (manual
    withdrawal requests) are unaffected — Postgres treats multiple NULLs as
    distinct under a unique index.
- `src/app/api/cron/process-payouts/route.ts` — processes PENDING payouts via
  Razorpay Route, fixed/verified during the audit.
- Seller wallet flows (`SellerTransaction` ledger: `DELIVERY_DEBIT`,
  `RETURN_DEBIT`, etc.) reviewed and consistent.

---

## 3. Orders, Returns, Coupons

- `prisma/schema.prisma` — `Order.deliveredAt DateTime?` added
  (migration `20260610_120000_add_order_delivered_at`). Set automatically
  in `src/app/api/orders/[id]/route.ts` PATCH when status transitions to
  `DELIVERED`.
- `src/app/api/returns/route.ts` — return-window deadline now computed from
  `order.deliveredAt ?? order.updatedAt` (was previously always
  `updatedAt`, which was wrong for delayed deliveries):
  ```ts
  const deliveryTimestamp = order.deliveredAt ?? order.updatedAt;
  const returnDeadline = new Date(deliveryTimestamp.getTime() + 7*24*60*60*1000);
  ```
- `src/app/api/orders/route.ts` (POST, place order) — stock decrement is now
  **concurrency-safe**: uses `tx.product.updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })` and throws
  `OUT_OF_STOCK:<name>` → mapped to a `409` response with a friendly message
  if `result.count === 0`. Coupon `usedCount` increment logic unchanged
  (already correct).
- `src/app/api/admin/returns/route.ts` PATCH `MARK_REFUNDED` (admin manual
  override) — **fixed**: now restores product/variant stock for the
  returned `orderItem`, and only sets the parent `Order.status = "REFUNDED"`
  when *every* item in the order has a `REFUNDED` return (mirrors the logic
  in `src/app/api/sellers/returns/[id]/confirm/route.ts`). Previously it
  force-set the whole order to REFUNDED and never restored stock.
- `src/lib/validations.ts` `couponSchema` — percentage coupons now capped at
  `discount <= 100` via `.refine()`.
- `src/app/api/coupons/[id]/route.ts` PATCH — `discountType` enum fixed from
  `"percentage" | "flat"` to `"percentage" | "fixed"` (matches create
  schema/DB convention), and added a check that caps percentage discount at
  100% considering both the new and existing `discountType`/`discount`.
- `src/app/api/coupons/route.ts` GET (checkout validation) — discount is now
  `Math.min(rawDiscount, orderTotal)` so a coupon can never discount more
  than the order is worth.

---

## 4. Health Check, Legal Pages, Footer

- `src/app/api/health/route.ts` — now does a real `SELECT 1` against the DB
  via `db.$queryRaw` and returns `{ status, dbLatencyMs, timestamp }`
  (200) or `{ status: "error" }` (503) if the DB is unreachable.
- `src/app/refund-policy/page.tsx` — new page (Shipping & Delivery, Return
  Eligibility, Replacement vs Refund, Refund Processing, Return Shipping
  Costs, Cancellations, Need Help?), styled like `/terms` and `/privacy`.
- `src/components/layout/Footer.tsx` — added "Refund & Shipping" link to the
  Legal column, pointing at `/refund-policy`.

---

## 5. External Integrations — Status (all already implemented)

These were verified as **already fully built and wired** — no new code
needed, only real credentials in `.env` / hosting provider env settings:

| Service | Where it lives |
|---|---|
| **Cloudinary** (image uploads) | `src/lib/cloudinary.ts`, `src/app/api/upload/route.ts` |
| **Supabase** (Postgres via Prisma) | `DATABASE_URL` / `DIRECT_URL` in `.env.example`, `prisma/schema.prisma` |
| **Firebase** (auth) | `src/lib/auth.ts`, `src/lib/firebase-admin.ts` |
| **Shiprocket** (courier) | `src/lib/shiprocket.ts` (full API client: auth, create shipment, assign AWB, schedule pickup, generate label, track, cancel, serviceability, reverse pickup), `src/app/api/sellers/orders/[id]/ship/route.ts` (one-click ship), `src/app/api/orders/[id]/tracking/route.ts` (live tracking) |
| **Razorpay** (payments + Route payouts) | `src/app/api/payments/route.ts`, `src/app/api/webhooks/razorpay/route.ts`, `src/app/api/cron/process-payouts/route.ts` |

`EXTERNAL_SERVICES_SETUP.md` (project root) was rewritten to reflect this —
it now only covers the genuinely-missing pieces: **Upstash Redis** (rate
limiting, no code changes needed) and **Sentry** (error monitoring, needs
the setup wizard). Cloudinary/Shiprocket sections were corrected to "already
done — just add credentials."

---

## 6. New / Changed Files (quick reference)

**New files:**
- `prisma/migrations/migration_lock.toml`
- `prisma/migrations/20260610_120000_add_order_delivered_at/migration.sql`
- `prisma/migrations/20260610_130000_payout_seller_order_unique/migration.sql`
- `src/app/refund-policy/page.tsx`
- `EXTERNAL_SERVICES_SETUP.md`
- `HANDOFF_NOTES.md` (this file)

**Modified files:**
- `prisma/schema.prisma` (`Order.deliveredAt`, `Payout @@unique([sellerId, orderId])`)
- `src/app/api/orders/[id]/route.ts`
- `src/app/api/returns/route.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/admin/returns/route.ts`
- `src/app/api/coupons/route.ts`
- `src/app/api/coupons/[id]/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/seller/bank-account/route.ts`
- `src/app/api/seller/payouts/route.ts`
- `src/lib/firebase-admin.ts`
- `src/lib/validations.ts`
- `src/components/layout/Footer.tsx`
- `.env.example`

---

## 7. REMAINING / TODO — pick up here

1. **Run a real build check** — `npm run build` or `npx tsc --noEmit`. The
   sandbox used for this audit had stale file mounts, so it could not give a
   reliable build result. This should be the first thing done.

2. **Apply the new Prisma migrations to the database:**
   ```
   npx prisma migrate deploy
   ```
   ⚠️ The `Payout_sellerId_orderId_key` unique index
   (`20260610_130000_payout_seller_order_unique`) will **fail to apply** if
   duplicate `(sellerId, orderId)` rows already exist with a non-null
   `orderId`. Check first:
   ```sql
   SELECT "sellerId", "orderId", COUNT(*) FROM "Payout"
   WHERE "orderId" IS NOT NULL
   GROUP BY "sellerId", "orderId" HAVING COUNT(*) > 1;
   ```
   If any rows come back, dedupe/merge them before running `migrate deploy`.

3. **Migration history is incomplete vs. `schema.prisma`.** Many models/
   fields appear to have been added via `prisma db push` rather than
   `prisma migrate dev`, including: `Payout`, `DeliveryAgent`,
   `GiftRegistry`, `GiftRegistryItem`, `StoreCollection`,
   `SellerTransaction`, `StoreView`, `FcmToken`, `SellerBankAccount`, and
   numerous fields on `Seller`/`Order`/`Return`. Run:
   ```
   npx prisma migrate dev --create-only --name baseline_sync
   ```
   and review the generated diff carefully before applying — this ensures a
   fresh database (`prisma migrate deploy`) actually matches the live
   schema.

4. **Set real environment variables** in `.env` / hosting provider per
   `.env.example`, especially:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` (or the 3 individual `FIREBASE_*` vars)
     — **critical**: without this, all authenticated routes fail in
     production.
   - `CLOUDINARY_*`, `SHIPROCKET_EMAIL`/`SHIPROCKET_PASSWORD`,
     `RAZORPAY_*` (incl. `RAZORPAY_PAYOUT_KEY_ID/SECRET`,
     `RAZORPAY_ROUTE_ACCOUNT_NUMBER`), `DATABASE_URL`/`DIRECT_URL`.

5. **Optional / lower priority** (from `EXTERNAL_SERVICES_SETUP.md`):
   - Upstash Redis (rate limiting — currently no-ops without it).
   - Sentry (error monitoring).
   - Confirm the Shiprocket "Primary" pickup location name matches your
     actual Shiprocket dashboard config (used as default in
     `src/app/api/sellers/orders/[id]/ship/route.ts`).

6. **Cosmetic, not urgent:** hardcoded `noreply@nexcart.in` in
   `src/lib/shiprocket.ts` billing/shipping email fields — could be made
   configurable via `NEXT_PUBLIC_APP_URL`-derived domain if desired.
