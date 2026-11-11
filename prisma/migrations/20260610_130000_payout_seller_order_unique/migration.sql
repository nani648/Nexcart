-- Prevent duplicate auto-generated payouts for the same seller+order
-- (e.g. from retried Razorpay webhooks). NULL orderId values (manual
-- payout requests) are treated as distinct by Postgres, so this does
-- not affect manual withdrawal requests.
--
-- NOTE: if this fails with a uniqueness violation, it means duplicate
-- (sellerId, orderId) Payout rows already exist in the database. Find
-- and merge/delete the duplicates first, e.g.:
--   SELECT "sellerId", "orderId", COUNT(*) FROM "Payout"
--   WHERE "orderId" IS NOT NULL
--   GROUP BY "sellerId", "orderId" HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX "Payout_sellerId_orderId_key" ON "Payout"("sellerId", "orderId");
