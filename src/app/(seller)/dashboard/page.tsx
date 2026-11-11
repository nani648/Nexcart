"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { formatPrice } from "@/lib/utils";
import {
  DollarSign, ShoppingBag, TrendingUp, RotateCcw,
  ExternalLink, Loader2, Clock, PackageOpen, BarChart3, Store, Home,
} from "lucide-react";
import Link from "next/link";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";

// recharts is one of the heaviest dependencies in the app and the chart sits
// below the stats cards, so it is loaded on demand instead of being bundled
// into the dashboard's initial JavaScript payload.
const RevenueChart = dynamic(
  () => import("@/components/dashboard/RevenueChart").then((m) => m.RevenueChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] w-full animate-pulse rounded-xl border border-border/50 bg-muted/40" />
    ),
  }
);

interface SellerProfile {
  status: string;
  storeName: string;
}

interface DashboardData {
  products: number;
  orders: number;
  revenue: number;
  avgOrderValue: number;
  returnRate: number;
  recentOrders: Array<{
    id: string;
    price: number;
    quantity: number;
    status: string;
    product: { name: string; images: string[] };
    order: { user: { name: string | null; email: string } };
  }>;
  topProducts: Array<{
    name: string;
    units: number;
    revenue: number;
  }>;
}

const UID_KEY   = "nxc-uid";
const DASH_KEY  = "nxc-dash-v1";
const FRESH_MS  = 5 * 60 * 1000;
function getUid()  { try { return localStorage.getItem(UID_KEY);  } catch { return null; } }
function getDashCache() {
  try { const r = localStorage.getItem(DASH_KEY); if (!r) return null; const d = JSON.parse(r); return d?.ts && Date.now() - d.ts < FRESH_MS ? d : null; } catch { return null; }
}
function saveDash(payload: object) { try { localStorage.setItem(DASH_KEY, JSON.stringify({ data: payload, ts: Date.now() })); } catch {} }

const STATUS_COLORS: Record<string, string> = {
  PENDING:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PROCESSING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SHIPPED:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  DELIVERED:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function EmptyOrdersState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-[10px] bg-muted mb-4">
        <PackageOpen className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">No orders yet</p>
      <p className="text-[12px] text-muted-foreground max-w-[200px]">
        Orders will appear here once customers start purchasing your products.
      </p>
    </div>
  );
}

function EmptyProductsState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-[10px] bg-muted mb-4">
        <BarChart3 className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">No products yet</p>
      <p className="text-[12px] text-muted-foreground max-w-[200px] mb-3">
        Add your first product to start selling on NexCart.
      </p>
      <Link
        href="/dashboard/products/new"
        className="rounded-lg bg-foreground px-4 py-2 text-[12px] font-semibold text-background hover:brightness-110 transition-all"
      >
        Add Product
      </Link>
    </div>
  );
}

function PendingApprovalState({ storeName }: { storeName: string }) {
  return (
    <div className="space-y-5">
      {/* Alert banner */}
      <div className="flex items-start gap-4 rounded-[10px] border border-amber-200/60 bg-amber-50/50 p-5 dark:border-amber-800/30 dark:bg-amber-950/15">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 dark:border-amber-800/40 dark:bg-amber-900/40">
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-amber-800 dark:text-amber-300 mb-1">
            Account Under Review
          </h2>
          <p className="text-[13px] leading-relaxed text-amber-700/80 dark:text-amber-400/80">
            Your store <span className="font-semibold">{storeName}</span> is pending admin approval.
            Our team will review your details within 24 hours. You will be notified once approved.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="rounded-[10px] border border-border/50 bg-card p-6">
        <h3 className="text-[13px] font-medium text-muted-foreground mb-5">What happens next?</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-0">
          {[
            { step: "1", title: "Admin Review",            desc: "Our team reviews your store details and verifies your information." },
            { step: "2", title: "Approval Notification",   desc: "You will receive an email notification once your store is approved." },
            { step: "3", title: "Start Selling",           desc: "After approval, you can add products and start receiving orders." },
          ].map((item, i, arr) => (
            <div key={item.step} className="flex sm:flex-col sm:items-center sm:text-center relative">
              {/* Connector line between steps */}
              {i < arr.length - 1 && (
                <div className="absolute hidden sm:block top-4 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-px bg-border/60" />
              )}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[12px] font-bold text-background mb-0 sm:mb-2.5 mr-3 sm:mr-0 z-10">
                {item.step}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground mb-0.5">{item.title}</p>
                <p className="text-[12px] leading-relaxed text-muted-foreground max-w-[160px]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Locked stat cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Revenue",    icon: DollarSign, color: "blue"  as const },
          { label: "Total Orders",     icon: ShoppingBag, color: "green" as const },
          { label: "Avg Order Value",  icon: TrendingUp, color: "amber" as const },
          { label: "Return Rate",      icon: RotateCcw,  color: "red"   as const },
        ].map(({ label, icon: Icon, color }) => {
          const colorMap: Record<string, string> = {
            blue:  "bg-blue-50 text-blue-500 dark:bg-blue-950/40",
            green: "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40",
            amber: "bg-amber-50 text-amber-500 dark:bg-amber-950/40",
            red:   "bg-red-50 text-red-500 dark:bg-red-950/40",
          };
          return (
            <div
              key={label}
              className="rounded-[14px] border border-border/40 bg-card p-[18px] opacity-55 select-none"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${colorMap[color]}`}>
                  <Icon className="h-[17px] w-[17px]" />
                </div>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[.06em] text-muted-foreground mb-1.5">
                {label}
              </div>
              <div className="text-[24px] font-bold text-muted-foreground/40">—</div>
              <div className="mt-3 text-[11px] text-muted-foreground/40 italic">Awaiting approval</div>
            </div>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="rounded-[10px] border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <h3 className="text-[14px] font-semibold text-foreground">Recent Activity</h3>
          <Link
            href="/dashboard/orders"
            className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-700 transition-colors dark:text-blue-400"
          >
            View all <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-muted/30">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-emerald-50 dark:bg-emerald-950/40">
            <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground">Store registration submitted</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthContext();

  // Seed instantly from localStorage cache — 0 ms on repeat visits
  const [data,    setData]    = useState<DashboardData | null>(() => { try { const c = getDashCache(); return c?.data?.dashboard ?? null; } catch { return null; } });
  const [profile, setProfile] = useState<SellerProfile | null>(() => { try { const c = getDashCache(); return c?.data?.seller    ?? null; } catch { return null; } });
  const [loading, setLoading] = useState(() => { try { return !getDashCache()?.data; } catch { return true; } });

  useEffect(() => {
    const uid = user?.uid ?? getUid();
    if (!uid) return;
    if (user?.uid) { try { localStorage.setItem(UID_KEY, user.uid); } catch {} }
    // Skip if cache is still fresh and we already have data
    if (getDashCache() && data) { setLoading(false); return; }
    fetch("/api/sellers/profile", { headers: { Authorization: `Bearer ${uid}` } })
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.seller ?? null);
        setData(d.dashboard ?? null);
        if (d.seller || d.dashboard) saveDash({ seller: d.seller, dashboard: d.dashboard });
      })
      .catch(() => { setData(null); setProfile(null); })
      .finally(() => setLoading(false));
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const isPending = !profile || profile.status === "PENDING";
  if (isPending) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Your store overview</p>
        </div>
        <PendingApprovalState storeName={profile?.storeName ?? "Your Store"} />
      </div>
    );
  }

  const orders = data?.recentOrders ?? [];
  const topProducts = data?.topProducts ?? [];
  const maxRevenue = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.revenue)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Welcome back! Here&apos;s your store overview.</p>
        </div>
        <Link href="/">
          <button className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
        </Link>
      </div>

      {data && (
        <AlertBanner
          alerts={[
            ...(orders.filter((o) => o.status === "PENDING").length > 0
              ? [{
                  type: "warning" as const,
                  message: `${orders.filter((o) => o.status === "PENDING").length} order${orders.filter((o) => o.status === "PENDING").length !== 1 ? "s" : ""} awaiting shipment`,
                  action: { label: "View Orders", href: "/dashboard/orders" },
                }]
              : []),
          ]}
        />
      )}

      {/* Stats */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Revenue"   value={data?.revenue       ? Math.round(data.revenue / 100).toLocaleString("en-IN") : "0"} change={0} icon={DollarSign} color="blue"  prefix="₹" />
        <StatsCard label="Total Orders"    value={(data?.orders ?? 0).toString()}                                                     change={0} icon={ShoppingBag} color="green" />
        <StatsCard label="Avg Order Value" value={data?.avgOrderValue  ? Math.round(data.avgOrderValue / 100).toLocaleString("en-IN") : "0"} change={0} icon={TrendingUp} color="amber" prefix="₹" />
        <StatsCard label="Return Rate"     value={(data?.returnRate ?? 0).toFixed(1)}                                                 change={0} icon={RotateCcw}   color="red"   suffix="%" />
      </div>

      {/* Revenue chart */}
      <div className="rounded-[10px] border border-border/50 bg-card p-5">
        {data && data.revenue > 0 ? (
          <RevenueChart />
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground">Revenue Overview</p>
            <p className="text-[12px] text-muted-foreground mt-1 max-w-xs">
              Revenue data will appear here once you start receiving orders.
            </p>
          </div>
        )}
      </div>

      {/* Bottom grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="rounded-[10px] border border-border/50 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
            <h2 className="text-[14px] font-semibold">Recent Orders</h2>
            <Link href="/dashboard/orders" className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          {orders.length === 0 ? (
            <EmptyOrdersState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Order</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Customer</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((item) => {
                    const row = {
                      id: item.id.slice(-6).toUpperCase(),
                      product: item.product.name,
                      customer: item.order.user.name || item.order.user.email,
                      amount: item.price * item.quantity,
                      status: item.status || "PROCESSING",
                    };
                    return (
                      <tr key={item.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div>
                            <p className="font-mono text-[11px] font-medium text-muted-foreground">#{row.id}</p>
                            <p className="text-xs font-medium text-foreground line-clamp-1 max-w-[120px]">{row.product}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground">{row.customer}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold tabular-nums">{formatPrice(row.amount)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[row.status] ?? STATUS_COLORS.PENDING}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href="/dashboard/orders" className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="rounded-[10px] border border-border/50 bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
            <h2 className="text-[14px] font-semibold">Top Products</h2>
            <Link href="/dashboard/products" className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <EmptyProductsState />
          ) : (
            <div className="divide-y divide-border/40">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                    : i === 1 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    : i === 2 ? "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground line-clamp-1">{p.name}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(p.revenue / maxRevenue) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold tabular-nums text-foreground">₹{(p.revenue / 100).toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-muted-foreground">{p.units} units</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Milestone Achievements */}
      {(() => {
        const totalOrders = data?.orders  ?? 0;
        const totalProds  = data?.products ?? 0;
        const MILESTONES = [
          { key:"FIRST_SALE",    emoji:"🎯", label:"First Sale",    desc:"Get your very first order",        done: totalOrders >= 1,   progress: Math.min(totalOrders, 1),   total: 1   },
          { key:"ORDERS_100",    emoji:"📦", label:"100 Orders",    desc:"Reach 100 completed orders",       done: totalOrders >= 100, progress: Math.min(totalOrders, 100), total: 100 },
          { key:"ORDERS_500",    emoji:"💎", label:"500 Orders",    desc:"Reach 500 completed orders",       done: totalOrders >= 500, progress: Math.min(totalOrders, 500), total: 500 },
          { key:"BIG_CATALOGUE", emoji:"🏪", label:"20+ Products",  desc:"List at least 20 active products", done: totalProds >= 20,   progress: Math.min(totalProds, 20),   total: 20  },
        ];
        const COLORS: Record<string, string> = { FIRST_SALE:"#16a34a", ORDERS_100:"#2563eb", ORDERS_500:"#7c3aed", BIG_CATALOGUE:"#0891b2" };
        return (
          <div className="rounded-[10px] border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
              <h2 className="text-[14px] font-semibold">🏆 Achievements</h2>
              <span className="text-[11px] text-muted-foreground">{MILESTONES.filter(m => m.done).length}/{MILESTONES.length} unlocked</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border/40 sm:grid-cols-4">
              {MILESTONES.map(m => (
                <div key={m.key} className={`flex flex-col gap-2 p-4 bg-card ${m.done ? "" : "opacity-55"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{m.emoji}</span>
                    {m.done && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: COLORS[m.key] }}>UNLOCKED</span>}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</p>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">{m.progress}/{m.total}</span>
                      <span className="text-[10px] font-semibold" style={{ color: COLORS[m.key] }}>{Math.round((m.progress/m.total)*100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width:`${Math.round((m.progress/m.total)*100)}%`, background:COLORS[m.key] }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
