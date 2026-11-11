-- Add new BillingCycle enum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'HALF_YEARLY', 'YEARLY');

-- Add TRIAL and STANDARD to SubscriptionPlan enum
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'TRIAL';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'STANDARD';

-- Add new columns to Subscription table
ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "billingCycle"   "BillingCycle",
  ADD COLUMN IF NOT EXISTS "reminderSent3d" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reminderSent1d" BOOLEAN NOT NULL DEFAULT false;

-- Migrate old FREE -> TRIAL, PRO -> STANDARD
UPDATE "Subscription" SET "plan" = 'TRIAL'    WHERE "plan" = 'FREE';
UPDATE "Subscription" SET "plan" = 'STANDARD' WHERE "plan" = 'PRO';
