-- Adds Product.cardImageAutoSlide — a per-product toggle controlling
-- whether the storefront card auto-slides through ALL of that product's
-- photos on a timer (like the store's Highlights banner, but slower), set
-- on the Edit design page. Defaults to false so every existing product
-- keeps its current look (primary photo, swaps to the 2nd photo on hover
-- only) until a seller explicitly turns it on for that product.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "cardImageAutoSlide" BOOLEAN NOT NULL DEFAULT false;
