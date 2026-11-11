-- Per-product colour/gradient for a thin padded border frame around that
-- product's card, set on the Edit design page. Null means "no border" —
-- unchanged look for every existing product until a seller sets one.
ALTER TABLE "Product" ADD COLUMN "cardBorderColor" TEXT;
