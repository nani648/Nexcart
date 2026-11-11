-- Independent background colour/gradient for a seller's product cards
-- (src/lib/store-color.ts format: "#rrggbb" or "#rrggbb,#rrggbb").
--
-- NULL means "match the banner colour" (Seller.storeColor) — the default
-- behaviour for every existing seller. Sellers opt into an independent
-- product-card colour from Dashboard -> Settings, at which point this
-- column is set to their chosen value.
ALTER TABLE "Seller" ADD COLUMN "cardColor" TEXT;
