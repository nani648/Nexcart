-- Manual override for what shows in the storefront card's info panel
-- (replaces the auto name+description block on that product's card only,
-- when filled in). Null means "auto" — unchanged behaviour for every
-- existing product.
ALTER TABLE "Product" ADD COLUMN "cardDisplayText" TEXT;
