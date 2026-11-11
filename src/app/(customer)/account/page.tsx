"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatDate } from "@/lib/utils";
import {
  Package, Star, MapPin, ShoppingBag, Gift,
  ChevronRight, LogOut, Store,
} from "lucide-react";
import Link from "next/link";

interface UserData {
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  _count: { orders: number; reviews: number; addresses: number };
}

// localStorage keys — persists across sessions so repeat visits are instant
const DATA_KEY = "nxc-account-v2";
const UID_KEY  = "nxc-uid";
const FRESH_MS = 5 * 60 * 1000; // treat cache as "fresh" for 5 minutes

function getCachedEntry(): { data: UserData; ts: number } | null {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d?.data?._count ? d : null;
  } catch { return null; }
}
function getCachedUid(): string | null {
  try { return localStorage.getItem(UID_KEY); } catch { return null; }
}
function saveCache(data: UserData) {
  try { localStorage.setItem(DATA_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}
function clearCache() {
  try { localStorage.removeItem(DATA_KEY); localStorage.removeItem(UID_KEY); } catch {}
}

function AccountSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-12 w-12 rounded-full bg-black relative overflow-hidden shimmer-el" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 rounded bg-black relative overflow-hidden shimmer-el" />
          <div className="h-3 w-44 rounded bg-black relative overflow-hidden shimmer-el" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-24 rounded-[10px] bg-black relative overflow-hidden shimmer-el" />
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-14 rounded-[10px] bg-black relative overflow-hidden shimmer-el" />
        ))}
      </div>
      <style>{`
        @keyframes shimmer-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .shimmer-el::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 35%,
            rgba(255,255,255,0.55) 50%,
            rgba(255,255,255,0.85) 52%,
            rgba(255,255,255,0.55) 54%,
            transparent 65%
          );
          animation: shimmer-sweep 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function AccountPage() {
  const { user, loading, logout } = useAuthContext();
  const router = useRouter();

  // Read localStorage synchronously at init — zero-delay on repeat visits
  const cachedEntry = useRef(typeof window !== "undefined" ? getCachedEntry() : null);
  const [userData, setUserData] = useState<UserData | null>(cachedEntry.current?.data ?? null);
  const [showSkeleton, setShowSkeleton] = useState(!cachedEntry.current?.data);
  const fetchedRef = useRef(false);

  function doFetch(uid: string) {
    fetch("/api/account/summary", { headers: { Authorization: `Bearer ${uid}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?._count) { setUserData(data); saveCache(data); }
        setShowSkeleton(false);
      })
      .catch(() => setShowSkeleton(false));
  }

  // Effect 1: fire immediately using cached uid — no Firebase wait
  useEffect(() => {
    if (fetchedRef.current) return;
    const uid = getCachedUid();
    if (!uid) return;

    // If cache is fresh (< 5 min), show it and skip background fetch
    const entry = cachedEntry.current;
    if (entry && Date.now() - entry.ts < FRESH_MS) {
      fetchedRef.current = true;
      setShowSkeleton(false);
      return;
    }

    // Stale or missing — fetch in background (data already shown from cache)
    fetchedRef.current = true;
    doFetch(uid);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2: auth guard + fallback if Effect 1 couldn't run (no cached uid)
  useEffect(() => {
    if (loading) return;
    if (!user) {
      clearCache();
      router.replace("/sign-in");
      return;
    }
    try { localStorage.setItem(UID_KEY, user.uid); } catch {}

    if (!fetchedRef.current) {
      fetchedRef.current = true;
      doFetch(user.uid);
    }
  }, [user, loading, router]); // eslint-disable-line react-hooks/exhaustive-deps

  if (showSkeleton && !userData) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 pb-24 md:pb-10">
          <AccountSkeleton />
        </main>
      </>
    );
  }

  if (!userData) return null;

  const initials = (userData.name || userData.email || "U").slice(0, 2).toUpperCase();

  const STATS = [
    { label: "Orders",    value: userData._count.orders,    icon: ShoppingBag, href: "/orders" },
    { label: "Reviews",   value: userData._count.reviews,   icon: Star,        href: "#" },
    { label: "Addresses", value: userData._count.addresses, icon: MapPin,      href: "#" },
  ];

  const LINKS = [
    { label: "My Orders",      desc: "Track and manage orders",          href: "/orders",    icon: Package },
    { label: "Wishlist",       desc: "Products you've saved",            href: "/wishlist",  icon: Star },
    { label: "Gift Registry",  desc: "Create & share gift wishlists",    href: "/registry",  icon: Gift },
    ...(userData.role === "CUSTOMER"
      ? [{ label: "Become a Seller", desc: "Start selling on NexCart", href: "/become-seller", icon: Store }]
      : [{ label: "Seller Dashboard", desc: "Manage your store",        href: "/dashboard",     icon: Store }]),
  ];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 pb-24 md:pb-10">

        {/* Profile header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-[16px] font-semibold text-primary">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-foreground">{userData.name || "NexCart User"}</p>
              <p className="text-[13px] text-muted-foreground">{userData.email}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Member since {formatDate(new Date(userData.createdAt))}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[11px] font-medium text-muted-foreground capitalize">
            {userData.role.toLowerCase()}
          </span>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {STATS.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="flex flex-col items-center gap-2 rounded-[10px] border border-border/60 bg-white dark:bg-card p-4 text-center transition-all hover:border-primary/30 hover:shadow-[var(--shadow-card)]"
            >
              <stat.icon className="h-[18px] w-[18px] text-muted-foreground/60" />
              <div className="text-[22px] font-semibold text-foreground tabular-nums">{stat.value}</div>
              <div className="text-[11px] text-muted-foreground">{stat.label}</div>
            </Link>
          ))}
        </div>

        {/* Quick links */}
        <div className="mb-6 space-y-2">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
            Quick Access
          </p>
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-[10px] border border-border/60 bg-white dark:bg-card px-4 py-3.5 transition-all hover:border-border hover:shadow-[var(--shadow-xs)]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary/8 text-primary">
                <item.icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-foreground">{item.label}</div>
                <div className="text-[11px] text-muted-foreground">{item.desc}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </Link>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-border/60 py-3 text-[13px] font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>

      </main>
      <Footer />
    </>
  );
}
