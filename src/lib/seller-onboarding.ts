import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { sendPushToUsers } from "@/lib/fcm";

/**
 * Call this AFTER a seller's wallet has been credited (a SellerTransaction with
 * type "ORDER_CREDIT" has just been created/committed) for an order.
 *
 * If this was the seller's FIRST-EVER order credit and they haven't added their
 * bank account yet, send a one-time nudge notification (in-app + push) pointing
 * them to /dashboard/payouts, where the bank account form lives. Payout requests
 * already hard-block without a bank account (see /api/seller/payouts) — this is
 * just an early, friendly heads-up so sellers aren't surprised later.
 *
 * Fire-and-forget: never throws, safe to call without awaiting.
 */
export async function maybePromptBankDetails(sellerId: string): Promise<void> {
  try {
    const [creditCount, seller] = await Promise.all([
      db.sellerTransaction.count({ where: { sellerId, type: "ORDER_CREDIT" } }),
      db.seller.findUnique({
        where: { id: sellerId },
        select: { userId: true, gstin: true, bankAccount: { select: { id: true } } },
      }),
    ]);

    // Only fire on the very first credit
    if (creditCount !== 1 || !seller) return;

    // Bank account nudge
    if (!seller.bankAccount) {
      const title = "You made your first sale!";
      const body = "Add your bank account details so we can pay you out for this order.";

      await createNotification({
        userId: seller.userId,
        type: "BANK_DETAILS_REQUIRED",
        title,
        body,
        link: "/dashboard/payouts",
      });

      await sendPushToUsers([seller.userId], {
        title,
        body,
        url: "/dashboard/payouts",
      });
    }

    // GSTIN nudge
    if (!seller.gstin) {
      const title = "Add your GSTIN to get paid";
      const body = "Add your GSTIN in store settings — it's required before you can request a payout.";

      await createNotification({
        userId: seller.userId,
        type: "GSTIN_REQUIRED",
        title,
        body,
        link: "/dashboard/settings",
      });

      await sendPushToUsers([seller.userId], {
        title,
        body,
        url: "/dashboard/settings",
      });
    }
  } catch (error) {
    console.error("[seller-onboarding] maybePromptBankDetails error:", error);
  }
}
