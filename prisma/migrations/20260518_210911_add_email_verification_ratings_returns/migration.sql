-- CreateEnum for ReturnStatus and ReturnReason
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'REFUNDED');
CREATE TYPE "ReturnReason" AS ENUM ('DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'DAMAGED', 'CHANGE_OF_MIND', 'OTHER');

-- Add email verification fields to User
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailVerificationToken" TEXT UNIQUE;
ALTER TABLE "User" ADD COLUMN "emailVerificationTokenExpiresAt" TIMESTAMP(3);

-- Create index on emailVerified
CREATE INDEX "User_emailVerified_idx" ON "User"("emailVerified");

-- Update Seller model - add fields for ratings and verification
ALTER TABLE "Seller" ADD COLUMN "totalRatings" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Seller" ADD COLUMN "totalReviews" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Seller" ADD COLUMN "totalOrders" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Seller" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- Create indexes for seller
CREATE INDEX "Seller_isVerified_idx" ON "Seller"("isVerified");
CREATE INDEX "Seller_totalOrders_idx" ON "Seller"("totalOrders");

-- Create SellerRating table
CREATE TABLE "SellerRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "SellerRating_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller" ("id") ON DELETE CASCADE,
    CONSTRAINT "SellerRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "SellerRating_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE,
    CONSTRAINT "SellerRating_sellerId_orderId_userId_key" UNIQUE("sellerId", "orderId", "userId")
);

-- Create indexes for SellerRating
CREATE INDEX "SellerRating_sellerId_idx" ON "SellerRating"("sellerId");
CREATE INDEX "SellerRating_userId_idx" ON "SellerRating"("userId");
CREATE INDEX "SellerRating_orderId_idx" ON "SellerRating"("orderId");

-- Create Return table
CREATE TABLE "Return" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnId" TEXT NOT NULL UNIQUE,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "reason" "ReturnReason" NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "sellerNote" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "Return_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE,
    CONSTRAINT "Return_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE,
    CONSTRAINT "Return_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller" ("id") ON DELETE CASCADE,
    CONSTRAINT "Return_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- Create indexes for Return
CREATE INDEX "Return_orderId_idx" ON "Return"("orderId");
CREATE INDEX "Return_sellerId_idx" ON "Return"("sellerId");
CREATE INDEX "Return_buyerId_idx" ON "Return"("buyerId");
CREATE INDEX "Return_status_idx" ON "Return"("status");
CREATE INDEX "Return_returnId_idx" ON "Return"("returnId");
