-- Add BANK_DETAILS_REQUIRED to NotificationType enum.
-- Used to nudge sellers to add bank account details after their first sale,
-- so future payouts (which already require SellerBankAccount) aren't blocked.
ALTER TYPE "NotificationType" ADD VALUE 'BANK_DETAILS_REQUIRED';
