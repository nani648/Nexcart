import { AuthProvider } from "@/context/AuthContext";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Playfair_Display, Space_Grotesk, Caveat } from "next/font/google";
import {
  Poppins,
  Montserrat,
  Bebas_Neue,
  Cormorant_Garamond,
  Nunito,
  Oswald,
  Quicksand,
  DM_Serif_Display,
  Outfit,
  Pacifico,
} from "next/font/google";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { Toaster } from "sonner";
import { StoreHydration } from "@/components/shared/StoreHydration";
import { ScrollProgressBar } from "@/components/shared/ScrollProgressBar";
import { DeferredOptionalUI } from "@/components/shared/DeferredOptionalUI";
import dynamic from "next/dynamic";
import "@/styles/globals.css";

/**
 * Fonts for per-product card text styles (see lib/card-designs.ts).
 *
 * tailwind.config.ts already declared `Playfair Display` and `Space Grotesk`
 * but nothing ever loaded them, so `font-serif` and `font-display` silently
 * fell back to Georgia and Geist Sans. These declarations make those utilities
 * actually work, and add Caveat for the handwritten style.
 *
 * `display: "swap"` means text paints immediately in the fallback and swaps
 * when the font arrives — no invisible-text flash on a slow connection.
 * next/font self-hosts these, so there is no render-blocking request to Google.
 */
const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

const caveat = Caveat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-caveat",
});

/**
 * Second round of card-text fonts (see lib/card-designs.ts CARD_FONTS).
 *
 * PERF: pinned to a single weight (400) each. This used to request 2-3
 * static weight files per font (24 files total across these 10 families) —
 * every one of those is a network fetch next/font has to complete before
 * `next dev` can finish compiling the root layout, which wraps every route.
 * On a slow connection that adds up fast, and this layout gets recompiled
 * on every edit anywhere in the app. Bold text in these fonts now renders
 * via the browser's synthetic-bold fallback instead of a true bold glyph —
 * a minor visual trade for a real cut in dev compile time. If that's not
 * acceptable for a specific font, add weight "700" back for just that one
 * rather than restoring all of them.
 */
const poppins = Poppins({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-poppins" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-montserrat" });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-bebas" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-cormorant" });
const nunito = Nunito({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-nunito" });
const oswald = Oswald({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-oswald" });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-quicksand" });
const dmSerifDisplay = DM_Serif_Display({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-dmserif" });
const outfit = Outfit({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-outfit" });
const pacifico = Pacifico({ subsets: ["latin"], weight: ["400"], display: "swap", variable: "--font-pacifico" });

const BottomNav = dynamic(
  () => import("@/components/layout/BottomNav").then((mod) => ({ default: mod.BottomNav })),
  { ssr: false, loading: () => <div className="h-16 md:hidden" /> }
);

export const metadata: Metadata = {
  title: {
    default: "NexCart — Multi-Vendor Marketplace",
    template: "%s | NexCart",
  },
  description:
    "NexCart is a premium multi-vendor marketplace. Discover thousands of products from verified sellers.",
  keywords: ["marketplace", "ecommerce", "multi-vendor", "shopping", "sellers"],
  authors: [{ name: "NexCart" }],
  creator: "NexCart",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://nexcart.vercel.app",
    siteName: "NexCart",
    title: "NexCart — Multi-Vendor Marketplace",
    description:
      "NexCart is a premium multi-vendor marketplace. Discover thousands of products from verified sellers.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NexCart — Multi-Vendor Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NexCart — Multi-Vendor Marketplace",
    description:
      "NexCart is a premium multi-vendor marketplace. Discover thousands of products from verified sellers.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NexCart" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
      </head>
      <body
        suppressHydrationWarning
        className={`${GeistSans.variable} ${GeistMono.variable} ${playfair.variable} ${spaceGrotesk.variable} ${caveat.variable} ${poppins.variable} ${montserrat.variable} ${bebasNeue.variable} ${cormorant.variable} ${nunito.variable} ${oswald.variable} ${quicksand.variable} ${dmSerifDisplay.variable} ${outfit.variable} ${pacifico.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <StoreHydration />
            <ScrollProgressBar />
            <div className="pb-16 md:pb-0">
              {children}
            </div>
            <BottomNav />
            <DeferredOptionalUI />
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
