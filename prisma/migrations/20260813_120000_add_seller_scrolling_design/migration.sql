-- Optional animated storefront banner overlay ("Scrolling Design").
-- Nullable Json, same pattern as shakeConfig/floatingBarConfig — off by
-- default (NULL) for every existing seller, zero behaviour change until a
-- seller explicitly picks an effect from the dashboard.
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "scrollingDesign" JSONB;
