export const revalidate = 86400;

import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="mb-2 text-3xl font-semibold">Terms of Service</h1>
        <p className="mb-10 text-sm text-muted-foreground">Last updated: January 2025</p>
        <div className="space-y-8">
          {TERMS.map((term) => (
            <div key={term.title}>
              <h2 className="text-lg font-semibold mb-2">{term.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{term.content}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

const TERMS = [
  { title: "Acceptance of Terms", content: "By accessing and using NexCart, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform." },
  { title: "User Accounts", content: "You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorised use of your account. You must be at least 18 years old to create an account." },
  { title: "Seller Obligations", content: "Sellers agree to provide accurate product information, maintain adequate stock, fulfil orders promptly, and comply with all applicable laws. Sellers are solely responsible for the products they list." },
  { title: "Prohibited Content", content: "Users may not list counterfeit, illegal, or prohibited items. We reserve the right to remove any listing that violates our policies without notice." },
  { title: "Payment & Fees", content: "All transactions are processed through Razorpay. NexCart deducts a category-based commission from each seller's order proceeds; deducted commissions are non-refundable. In case of disputes, our team will mediate and make the final decision." },
  { title: "Limitation of Liability", content: "NexCart is a platform connecting buyers and sellers. We are not responsible for the quality, safety, or legality of items listed. Our liability is limited to the maximum extent permitted by applicable law." },
  { title: "Governing Law", content: "These terms are governed by the laws of India. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu." },
];
