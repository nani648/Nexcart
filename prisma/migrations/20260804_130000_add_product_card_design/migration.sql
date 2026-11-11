-- Per-product storefront card style (see src/lib/card-designs.ts).
--
-- Deliberately TEXT rather than a Postgres enum: designs are expected to be
-- added and retired over time, and a plain column means that is a code change
-- with no migration. Unknown values degrade to the default design at render
-- time, so a retired key can never break a live storefront.
--
-- NULL means the product predates this feature; it renders with the default
-- design until the seller picks one.
ALTER TABLE "Product" ADD COLUMN "cardDesign" TEXT;
