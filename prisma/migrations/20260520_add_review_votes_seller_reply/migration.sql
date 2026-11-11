-- AlterTable: add new fields to Review
ALTER TABLE "Review" ADD COLUMN "helpfulCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Review" ADD COLUMN "sellerReply" TEXT;
ALTER TABLE "Review" ADD COLUMN "sellerRepliedAt" TIMESTAMP(3);

-- CreateTable: ReviewVote
CREATE TABLE "ReviewVote" (
    "id"        TEXT NOT NULL,
    "reviewId"  TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewVote_reviewId_userId_key" ON "ReviewVote"("reviewId", "userId");
CREATE INDEX "ReviewVote_reviewId_idx" ON "ReviewVote"("reviewId");

-- AddForeignKey
ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
