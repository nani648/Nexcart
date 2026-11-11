-- Additive, nullable columns for GST invoice generation. Safe no-op for
-- existing rows; application treats NULL as "GST info not provided".
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "gstRate" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "hsnCode" TEXT;
