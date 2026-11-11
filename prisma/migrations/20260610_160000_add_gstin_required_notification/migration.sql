-- Add GSTIN_REQUIRED to NotificationType enum.
-- Used to nudge sellers to add their GSTIN after their first sale, so they
-- aren't surprised when payouts (which require both bank account and GSTIN)
-- are blocked without it.
ALTER TYPE "NotificationType" ADD VALUE 'GSTIN_REQUIRED';
