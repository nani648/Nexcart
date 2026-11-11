-- CreateTable: ProductQA
CREATE TABLE "ProductQA" (
    "id"          TEXT NOT NULL,
    "productId"   TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "question"    TEXT NOT NULL,
    "answer"      TEXT,
    "answeredBy"  TEXT,
    "answeredAt"  TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductQA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductQA_productId_idx" ON "ProductQA"("productId");
CREATE INDEX "ProductQA_userId_idx" ON "ProductQA"("userId");

-- AddForeignKey
ALTER TABLE "ProductQA" ADD CONSTRAINT "ProductQA_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductQA" ADD CONSTRAINT "ProductQA_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductQA" ADD CONSTRAINT "ProductQA_answeredBy_fkey"
    FOREIGN KEY ("answeredBy") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
