-- Vanity store handles: nexcart.com/<storeHandle>
--
-- `storeHandle` is nullable so existing sellers are not broken by this
-- migration; they are prompted to choose a handle from the seller dashboard.
-- Values are always written lowercase by the application layer, because a
-- Postgres UNIQUE constraint is case-sensitive and would otherwise allow both
-- "Pickles_02" and "pickles_02" to exist as separate stores.
ALTER TABLE "Seller" ADD COLUMN "storeHandle" TEXT;

CREATE UNIQUE INDEX "Seller_storeHandle_key" ON "Seller"("storeHandle");

-- Retired handles, kept so previously shared links and printed QR codes keep
-- resolving via a permanent redirect. Also acts as a reservation table: a
-- handle that still redirects somewhere cannot be claimed by another seller.
CREATE TABLE "StoreHandleHistory" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreHandleHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreHandleHistory_handle_key" ON "StoreHandleHistory"("handle");
CREATE INDEX "StoreHandleHistory_sellerId_idx" ON "StoreHandleHistory"("sellerId");

ALTER TABLE "StoreHandleHistory"
    ADD CONSTRAINT "StoreHandleHistory_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "Seller"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
