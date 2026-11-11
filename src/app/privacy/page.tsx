export const revalidate = 86400;

import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="mb-2 text-3xl font-semibold">Privacy Policy</h1>
        <p className="mb-10 text-sm text-muted-foreground">Last updated: January 2025</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{section.content}</p>
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
    title: "Information We Collect",
    content: "We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support. This includes your name, email address, phone number, shipping address, and payment information.",
  },
  {
    title: "How We Use Your Information",
    content: "We use the information we collect to process transactions, send order confirmations and updates, provide customer support, improve our services, and comply with legal obligations. We do not sell your personal information to third parties.",
  },
  {
    title: "Information Sharing",
    content: "We share your information with sellers only to the extent necessary to fulfil your orders. Payment information is processed securely through Razorpay and is never stored on our servers. We may share information with service providers who assist us in operating our platform.",
  },
  {
    title: "Data Security",
    content: "We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. All data is transmitted using SSL encryption.",
  },
  {
    title: "Your Rights",
    content: "You have the right to access, update, or delete your personal information. You can do this through your account settings or by contacting our support team. You may also opt out of promotional communications at any time.",
  },
  {
    title: "Cookies",
    content: "We use cookies and similar tracking technologies to enhance your experience on our platform. You can control cookies through your browser settings, though some features may not function properly if cookies are disabled.",
  },
  {
    title: "Contact Us",
    content: "If you have any questions about this Privacy Policy or our data practices, please contact us at privacy@nexcart.in. We will respond to your enquiry within 30 days.",
  },
];
