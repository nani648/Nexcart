import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexCart Catalog",
  description: "Browse products, categories and stores on NexCart",
};

const MAIN_APP_URL = process.env.NEXT_PUBLIC_MAIN_APP_URL || "https://nexcart.example.com";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="text-xl font-bold text-orange-600">
              NexCart
            </Link>
            <form action="/search" className="flex-1 max-w-md">
              <input
                type="text"
                name="q"
                placeholder="Search products, brands and stores"
                className="w-full border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </form>
            <a
              href={MAIN_APP_URL}
              className="text-sm font-medium text-orange-600 hover:underline whitespace-nowrap"
            >
              Account / Cart
            </a>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        <footer className="border-t mt-12 py-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} NexCart. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
