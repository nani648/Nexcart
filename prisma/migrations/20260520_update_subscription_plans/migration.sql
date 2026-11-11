-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionPlan_new" AS ENUM ('TRIAL', 'MONTHLY', 'HALF_YEARLY', 'YEARLY');
ALTER TABLE "Subscription" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "plan" TYPE "SubscriptionPlan_new" USING ("plan"::text::"SubscriptionPlan_new");
ALTER TYPE "SubscriptionPlan" RENAME TO "SubscriptionPlan_old";
ALTER TYPE "SubscriptionPlan_new" RENAME TO "SubscriptionPlan";
DROP TYPE "SubscriptionPlan_old";
ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'TRIAL';
COMMIT;

-- AddColumn
ALTER TABLE "Subscription" ADD COLUMN "trialEndDate" TIMESTAMP(3);

-- AlterColumn - Rename old reminder fields
ALTER TABLE "Subscription" RENAME COLUMN "reminderSent3d" TO "reminderSent6d";
ALTER TABLE "Subscription" RENAME COLUMN "reminderSent1d" TO "reminderSent7d";
