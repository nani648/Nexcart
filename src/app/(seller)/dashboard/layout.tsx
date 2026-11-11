"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { DashboardSidebar } from "@/components/seller/DashboardSidebar";
import { BankDetailsBanner } from "@/components/seller/BankDetailsBanner";
import { Loader2 } from "lucide-react";
import { cacheGet, cacheSet } from "@/lib/dashboard-cache";

interface SellerData {
  seller: {
    id: string;
    sellerId: string;
    storeName: string;
    status: string;
    storeHandle?: string | null;
    gstin?: string | null;
    bankAccount?: { id: string } | null;
    _count?: { transactions?: number };
  } | null;
}

function SidebarSkeleton() {
  return (
    <div className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-background min-h-screen animate-pulse">
      <div className="h-16 border-b border-border px-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-muted" />
        <div className="h-4 w-28 rounded bg-muted" />
      </div>
      <div className="flex-1 p-3 space-y-1">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-muted/60" />
        ))}
      </div>
    </div>
  );
}

const SELLER_CACHE_KEY = "dashboard:seller";
const UID_KEY = "nxc-uid";

function getCachedUid() {
  try { return localStorage.getItem(UID_KEY); } catch { return null; }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const fetchedRef = useRef(false);

  // Read localStorage synchronously at init — 0ms on repeat visits
  const [sellerData, setSellerData] = useState<SellerData | null>(
    () => { try { return cacheGet<SellerData>(SELLER_CACHE_KEY); } catch { return null; } }
  );
  const [fetching, setFetching] = useState(
    () => { try { return !cacheGet<SellerData>(SELLER_CACHE_KEY); } catch { return true; } }
  );

  // Auth guard — only redirect if Firebase confirms no user AND no cached data
  useEffect(() => {
    if (!loading && !user && !sellerData) router.replace("/sign-in");
  }, [user, loading, sellerData, router]);

  // Fire API immediately using cached uid — no Firebase wait
  useEffect(() => {
    const uid = user?.uid ?? getCachedUid();
    if (!uid || fetchedRef.current) return;
    fetchedRef.current = true;
    if (user?.uid) { try { localStorage.setItem(UID_KEY, user.uid); } catch {} }

    const cached = cacheGet<SellerData>(SELLER_CACHE_KEY);

    const doFetch = () =>
      fetch("/api/user", { headers: { Authorization: `Bearer ${uid}` } })
        .then(r => r.json())
        .then(data => {
          const sd: SellerData = { seller: data.seller ?? null };
          cacheSet(SELLER_CACHE_KEY, sd, 5 * 60_000);
          setSellerData(sd);
        })
        .catch(() => { if (!cached) setSellerData({ seller: null }); })
        .finally(() => setFetching(false));

    if (cached) {
      setFetching(false);
      doFetch(); // background refresh — never blocks UI
    } else {
      doFetch();
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // If we have cached seller data → show full layout IMMEDIATELY, no spinner at all
  if (sellerData?.seller) {
    const { seller } = sellerData;

    if (seller.status === "SUSPENDED") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-sm text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20">
              <span className="text-[22px] font-bold text-red-500">!</span>
            </div>
            <h1 className="text-[20px] font-semibold">Account Suspended</h1>
            <p className="text-[14px] text-muted-foreground leading-relaxed">Your seller account has been suspended. Contact <strong className="text-foreground">support@nexcart.in</strong> for assistance.</p>
          </div>
        </div>
      );
    }

    if (seller.status === "REJECTED") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-sm text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-muted/40">
              <span className="text-[22px] font-bold text-muted-foreground">×</span>
            </div>
            <h1 className="text-[20px] font-semibold">Application Rejected</h1>
            <p className="text-[14px] text-muted-foreground leading-relaxed">Your seller application was rejected. You may re-apply with updated information.</p>
            <a href="/become-seller" className="inline-flex items-center justify-center rounded-[10px] bg-foreground text-background px-5 py-2.5 text-[13px] font-semibold hover:opacity-90 transition-opacity">
              Re-apply as Seller
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar seller={seller} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 pt-[4.5rem] pb-[5rem] sm:pt-6 sm:pb-6 md:pt-8 md:pb-8 sm:px-6">
            <BankDetailsBanner
              hasBankAccount={!!seller.bankAccount}
              hasGstin={!!seller.gstin}
              hasSales={(seller._count?.transactions ?? 0) > 0}
            />
            {children}
          </div>
        </main>
      </div>
    );
  }

  // No cached data yet — show skeleton while fetching
  if (fetching || loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <SidebarSkeleton />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 pt-[4.5rem] pb-[5rem] sm:pt-6 sm:pb-6 md:pt-8 md:pb-8 sm:px-6">
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Fetched but no seller — redirect to registration
  if (!sellerData?.seller) {
    router.replace("/become-seller");
    return null;
  }

  return null;
}
