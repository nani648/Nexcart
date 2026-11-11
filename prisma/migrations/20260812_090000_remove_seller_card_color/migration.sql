-- Removes the "Product Card Back Colour" feature (Seller.cardColor).
--
-- Product cards no longer support an independent background colour override
-- — the info block always sits on the plain page background now. This
-- column was live/applied (added in 20260806_120000_add_seller_card_color),
-- so it is dropped here rather than the migration being edited after the
-- fact. IF EXISTS is defensive in case it was already removed some other way.
ALTER TABLE "Seller" DROP COLUMN IF EXISTS "cardColor";
