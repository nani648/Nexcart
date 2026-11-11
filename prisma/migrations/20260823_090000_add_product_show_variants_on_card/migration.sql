-- Adds Product.showVariantsOnCard — a per-product toggle controlling whether
-- the storefront card's variant picker (size/color dropdown) is shown for
-- that product, set on the Add/Edit Product page. Defaults to true so every
-- existing product keeps its current behaviour (picker still shows whenever
-- a product has more than one variant) until a seller explicitly turns it
-- off.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "showVariantsOnCard" BOOLEAN NOT NULL DEFAULT true;
