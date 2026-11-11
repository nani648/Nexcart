-- Add GSTIN (GST registration number) to Seller.
-- Nullable so existing sellers/rows are unaffected. The application layer
-- enforces this as required for new seller registrations and prompts
-- existing sellers (who registered before this change) to add it via
-- the seller settings page.
ALTER TABLE "Seller" ADD COLUMN "gstin" TEXT;
