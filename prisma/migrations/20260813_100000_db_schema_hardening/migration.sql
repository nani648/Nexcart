-- Database & Schema hardening (audit section 3)
--
-- Fixes cascade-delete rules that were silently destroying financial/audit
-- data, adds missing indexes for hot query paths, and enforces phone
-- uniqueness safely (nullable-safe: Postgres treats multiple NULLs as
-- distinct, so customers who never added a phone number are unaffected).
--
-- All statements are IF EXISTS / IF NOT EXISTS so this migration is safe to
-- re-run and safe against minor naming drift from how these tables were
-- originally created (some predate this project's migration history and
-- were provisioned via `prisma db push`, but db push uses the exact same
-- default constraint-naming convention as `migrate`, so the names below are
-- expected to match).

-- ── 1. Stop hard-deleting an Order/Product from wiping its audit trail ─────
-- Previously CASCADE: deleting an Order silently deleted every Return
-- referencing it (refund amounts, gateway refund IDs) and every OrderItem
-- (the actual purchased line items). Deleting a Product silently deleted
-- every Return and Review referencing it. None of that data should ever
-- disappear as a side effect of deleting something else — RESTRICT forces
-- the application to explicitly decide what to do (soft-delete via
-- isActive=false, which is what the app already does elsewhere) instead of
-- losing records nobody meant to lose.
ALTER TABLE "Return" DROP CONSTRAINT IF EXISTS "Return_orderId_fkey";
ALTER TABLE "Return" ADD CONSTRAINT "Return_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Return" DROP CONSTRAINT IF EXISTS "Return_productId_fkey";
ALTER TABLE "Return" ADD CONSTRAINT "Return_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_orderId_fkey";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_productId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── 2. Let routine catalog cleanup actually work ───────────────────────────
-- CartItem/WishlistItem rows are disposable join rows, not audit data — a
-- product sitting in a stranger's cart or wishlist should never be able to
-- block a seller from removing it. CASCADE here just removes the now-stale
-- cart/wishlist entry along with the product, which is the correct user
-- experience (a deleted product shouldn't linger in anyone's cart).
ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_productId_fkey";
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WishlistItem" DROP CONSTRAINT IF EXISTS "WishlistItem_productId_fkey";
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 3. Missing indexes on hot query paths ──────────────────────────────────
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE INDEX IF NOT EXISTS "Order_deliveryAgentId_deliveryStatus_idx" ON "Order"("deliveryAgentId", "deliveryStatus");
CREATE INDEX IF NOT EXISTS "Order_deliveryStatus_idx" ON "Order"("deliveryStatus");
CREATE INDEX IF NOT EXISTS "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");
CREATE INDEX IF NOT EXISTS "Coupon_isActive_expiresAt_idx" ON "Coupon"("isActive", "expiresAt");

-- ── 4. Unique phone numbers (nullable-safe) ────────────────────────────────
-- Two accounts sharing a phone number breaks any phone/OTP-based identity
-- check. Postgres unique indexes treat NULL as distinct from every other
-- NULL, so customers with no phone on file are completely unaffected.
--
-- Safety step first: if any duplicate non-null phone numbers already exist
-- in the live data (two accounts that happen to share a number, e.g. from
-- before this constraint existed), keep the phone on the OLDEST account
-- (first registered) and clear it on the newer duplicate(s) rather than
-- letting the migration fail outright. Clearing a phone number is
-- reversible (the user can just re-enter it) — silently failing to deploy
-- a security-relevant migration is worse.
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (PARTITION BY "phone" ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "User"
  WHERE "phone" IS NOT NULL
)
UPDATE "User" u
SET "phone" = NULL
FROM ranked
WHERE u."id" = ranked."id" AND ranked.rn > 1;

DROP INDEX IF EXISTS "User_phone_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
