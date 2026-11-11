-- Additive, nullable column for per-variant MRP/compare price. Safe no-op
-- for existing rows; application treats NULL as "no variant-level MRP".
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "comparePrice" DOUBLE PRECISION;
