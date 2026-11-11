-- CreateEnum for ProductCondition
CREATE TYPE "ProductCondition" AS ENUM ('ORIGINAL', 'REFURBISHED', 'BOX_OPEN');

-- AddColumn condition to Product
ALTER TABLE "Product" ADD COLUMN "condition" "ProductCondition" NOT NULL DEFAULT 'ORIGINAL';
