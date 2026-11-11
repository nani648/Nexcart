export const revalidate = 86400;

import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Zap, Users, Package } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "About NexCart" };

const VALUES = [
  { icon: Shield, title: "Trust & Safety", desc: "Every seller is verified. Every transaction secured. We maintain strict quality standards so you shop with confidence." },
  { icon: Zap, title: "Fast & Reliable", desc: "Optimised for speed. From search to checkout, we make buying effortless — on any device." },
  { icon: Users, title: "Community First", desc: "We're building a community of passionate sellers and well-informed buyers across India." },
  { icon: Package, title: "Quality Products", desc: "Curated categories, verified listings, and honest reviews ensure you always know what you're buying." },
];

const STATS = [
  { value: "500+", label: "Verified Sellers" },
  { value: "10K+", label: "Products Listed" },
  { value: "50K+", label: "Happy Customers" },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">

        {/* Hero */}
        <div className="mb-16 max-w-xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Our Story</p>
          <h1 className="mb-4 text-[34px] font-semibold tracking-tight text-foreground leading-tight">
            India&apos;s marketplace built for everyone
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed">
            NexCart connects thousands of verified sellers with millions of customers across India —
            making commerce simple, trusted, and accessible.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-16 grid grid-cols-3 gap-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-[10px] border border-border/60 bg-white dark:bg-card p-6">
              <div className="text-[28px] font-semibold tracking-tight text-foreground tabular-nums">{stat.value}</div>
              <div className="mt-1 text-[13px] text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="mb-12 rounded-[10px] border border-border/60 bg-[hsl(214_32%_98%)] dark:bg-[hsl(220_17%_10%)] p-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">Mission</p>
          <h2 className="mb-3 text-[20px] font-semibold tracking-tight text-foreground">Why we built NexCart</h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            We believe every entrepreneur deserves a platform as ambitious as they are. NexCart gives sellers powerful tools
            to build their online store, reach customers nationwide, and grow their business — while giving buyers access to
            unique products they can trust.
          </p>
        </div>

        {/* Values */}
        <div className="mb-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {VALUES.map((item) => (
            <div key={item.title} className="flex gap-4 rounded-[10px] border border-border/60 bg-white dark:bg-card p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-primary/8 text-primary">
                <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4 rounded-[10px] border border-border/60 bg-white dark:bg-card p-10 text-center">
          <h2 className="text-[22px] font-semibold tracking-tight">Ready to get started?</h2>
          <p className="text-[14px] text-muted-foreground max-w-sm">
            Join thousands of sellers and millions of buyers already on NexCart.
          </p>
          <div className="flex gap-3">
            <Link
              href="/search"
              className="rounded-[10px] bg-primary px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Start Shopping
            </Link>
            <Link
              href="/become-seller"
              className="rounded-[10px] border border-border/60 px-5 py-2.5 text-[13px] font-semibold text-foreground hover:bg-muted/50 transition-colors"
            >
              Become a Seller
            </Link>
          </div>
        </div>

      </main>
      <Footer />
    </>
  );
}
