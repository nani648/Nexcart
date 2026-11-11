-- Per-product focal point for the storefront card's cover photo, as a CSS
-- object-position value (e.g. "50% 20%"), set by the seller dragging the
-- photo in the Product Card Design preview. Null means "center center" —
-- unchanged crop for every existing product until a seller repositions one.
ALTER TABLE "Product" ADD COLUMN "cardImagePosition" TEXT;
