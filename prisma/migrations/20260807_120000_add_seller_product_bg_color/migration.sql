-- Independent background colour/gradient for the storefront page area
-- behind the product grid (src/lib/store-color.ts format: "#rrggbb" or
-- "#rrggbb,#rrggbb").
--
-- NULL means "auto" — a low-opacity tint of the banner colour, computed at
-- render time (the default behaviour for every existing seller). Sellers
-- opt into an independent background colour from Dashboard -> Settings, at
-- which point this column is set to their chosen value and it renders at
-- full strength instead of the auto tint.
ALTER TABLE "Seller" ADD COLUMN "productBgColor" TEXT;
