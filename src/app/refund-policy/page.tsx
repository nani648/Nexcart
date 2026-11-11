export const revalidate = 86400;

import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = { title: "Refund & Shipping Policy" };

export default function RefundPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="mb-2 text-3xl font-semibold">Refund &amp; Shipping Policy</h1>
        <p className="mb-10 text-sm text-muted-foreground">Last updated: June 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

const SECTIONS = [
  {
    title: "Shipping & Delivery",
    content:
      "Orders are dispatched by the seller within 1-3 business days of confirmation. Delivery timelines vary by location and courier partner, and an estimated delivery date is shown at checkout and on your order tracking page. Shipping charges, if applicable, are shown at checkout before payment. NexCart is not responsible for delays caused by courier partners, weather, or events outside our reasonable control.",
  },
  {
    title: "Return Eligibility",
    content:
      "Most items can be returned within 7 days of delivery if they are unused, in their original packaging, and in the condition you received them. Certain categories (e.g. perishables, personal care items, innerwear, and items marked 'non-returnable' on the product page) are not eligible for return. To start a return, go to My Orders, select the item, and choose 'Return Item' within the eligibility window.",
  },
  {
    title: "Replacement vs. Refund",
    content:
      "For damaged, defective, or incorrect items, you can request either a replacement (subject to availability) or a refund. For change-of-mind returns, a refund is issued once the item is received and inspected by the seller.",
  },
  {
    title: "Refund Processing",
    content:
      "Once your return is approved by the seller and the item is received, refunds for online payments (UPI/cards/net banking) are initiated to your original payment method via Razorpay and typically reflect within 5-7 business days, depending on your bank.\n\nFor Cash on Delivery (COD) orders, refunds are processed manually to your bank account or UPI ID after our team verifies the return — please allow up to 7 business days after the refund reference is shared with you.",
  },
  {
    title: "Return Shipping Costs",
    content:
      "If the return is due to a seller error (wrong item, damaged, or defective product), return shipping is free. For change-of-mind returns, a return shipping fee may be deducted from your refund — this is shown to you before you confirm the return request.",
  },
  {
    title: "Cancellations",
    content:
      "Orders can be cancelled free of charge as long as they are still in 'Pending' or 'Confirmed' status and have not yet been shipped. Once an order has shipped, it cannot be cancelled — but you may request a return after delivery as per the policy above.",
  },
  {
    title: "Need Help?",
    content:
      "If your refund hasn't arrived within the timelines above, or you have questions about a specific order, please contact our support team via the WhatsApp link in the footer or through the Help Center, with your order number handy.",
  },
];
