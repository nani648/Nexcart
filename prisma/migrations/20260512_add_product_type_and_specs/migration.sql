-- AlterTable: Add productTypeId and specifications to Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "productTypeId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "specifications" JSONB;
