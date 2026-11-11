"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { formatPrice } from "@/lib/utils";
import {
  TrendingUp, Package, ShoppingBag, Star, Loader2, Home,
  BarChart2, Award, ArrowUpRight, Percent, DollarSign,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface DailyRevenue  { date: string; revenue: number }
interface WeeklyRevenue { weekStart: string; revenue: number }
interface TopProduct    { productId: string; name: string; image: string | null; revenue: number; orders: number }

interface AnalyticsData {
  revenue: number;
  orders: number;
  products: number;
  avgRating: number;
  avgOrderValue: number;
  conversionRate: number | null;
  dailyRevenue: DailyRevenue[];
  weeklyRevenue: WeeklyRevenue[];
  topProducts: TopProduct[];
}

type ChartView = "daily" | "weekly";

function RevenueBarChart({
  data,
  labelKey,
}: {
  data: { label: string; revenue: number }[];
  labelKey: "date" | "week";
}) {
  const maxVal = Math.max(...data.map((d) => d.revenue), 1);
  const chartH = 160;
  const total = data.length;
  const barW = total > 0 ? Math.max(4, Math.floor(560 / total) - 3) : 8;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 600 ${chartH + 28}`}
        className="w-full"
        style={{ minWidth: Math.max(400, total * (barW + 3) + 40) }}
        aria-label="Revenue chart"
      >
        {[0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1="30" y1={chartH - pct * chartH}
            x2="600" y2={chartH - pct * chartH}
            stroke="currentColor" strokeOpacity="0.07" strokeWidth="1"
          />
        ))}
        {data.map((d, i) => {
          const barH = Math.max((d.revenue / maxVal) * chartH, d.revenue > 0 ? 2 : 0);
          const x = 32 + i * (barW + 3);
          const step = Math.ceil(total / 6);
          const showLabel = i % step === 0 || i === total - 1;
          const labelText = labelKey === "date" ? d.label.slice(5) : d.label;
          return (
            <g key={i}>
              <rect
                x={x} y={chartH - barH} width={barW} height={barH} rx={2}
                className="fill-foreground/80 hover:fill-foreground transition-colors"
              >
                <title>{`${d.label}: ${formatPrice(d.revenue)}`}</title>
              </rect>
              {showLabel && (
                <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize="9" className="fill-muted-foreground">
                  {labelText}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuthContext();
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<ChartView>("daily");

  useEffect(() => {
    if (!user) return;
    fetch("/api/sellers/analytics", { headers: { Authorization: `Bearer ${user.uid}` } })
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [user]);

  const chartData = useMemo(() => {
    if (!data) return [];
    if (chartView === "daily")
      return data.dailyRevenue.map((d) => ({ label: d.date, revenue: d.revenue }));
    return data.weeklyRevenue.map((d, i) => ({ label: `Week ${i + 1}`, revenue: d.revenue }));
  }, [data, chartView]);

  const totalChartRevenue = useMemo(() => chartData.reduce((s, d) => s + d.revenue, 0), [chartData]);

  if (loading)
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const stats = [
    { label: "Total Revenue",    value: formatPrice(data?.revenue ?? 0),           icon: TrendingUp, color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-950/30" },
    { label: "Total Orders",     value: String(data?.orders ?? 0),                 icon: ShoppingBag,color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Avg Order Value",  value: formatPrice(data?.avgOrderValue ?? 0),     icon: DollarSign, color: "text-purple-600 dark:text-purple-400",bg: "bg-purple-50 dark:bg-purple-950/30" },
    { label: "Avg. Rating",      value: (data?.avgRating ?? 0).toFixed(1) + " ★", icon: Star,       color: "text-yellow-600 dark:text-yellow-400",bg: "bg-yellow-50 dark:bg-yellow-950/30" },
    { label: "Products Listed",  value: String(data?.products ?? 0),               icon: Package,    color: "text-orange-600 dark:text-orange-400",bg: "bg-orange-50 dark:bg-orange-950/30" },
    {
      label: "Conversion Rate",
      value: data?.conversionRate != null ? `${data.conversionRate.toFixed(1)}%` : "N/A",
      icon: Percent,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-50 dark:bg-teal-950/30",
      sub: data?.conversionRate != null ? "views → orders" : "no view data",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" /><span>Home</span>
            </Link>
            <span className="text-muted-foreground/50 text-[12px]">/</span>
            <span className="text-[12px] text-foreground font-medium">Analytics</span>
          </div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Store performance overview</p>
        </div>
        <Link href="/"><button className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm"><Home className="h-4 w-4" /><span className="hidden sm:inline">Home</span></button></Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground leading-tight">{s.label}</span>
              <div className={`rounded-lg p-1.5 ${s.bg} ${s.color}`}><s.icon className="h-3.5 w-3.5" /></div>
            </div>
            <div className="text-xl font-semibold tabular-nums">{s.value}</div>
            {"sub" in s && s.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="rounded-xl border border-border/50 bg-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><BarChart2 className="h-4 w-4 text-muted-foreground" />Revenue Chart</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {chartView === "daily" ? "Last 30 days" : "Last 12 weeks"} · <span className="font-medium text-foreground">{formatPrice(totalChartRevenue)}</span>
            </p>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden text-[12px]">
            {(["daily", "weekly"] as ChartView[]).map((v) => (
              <button key={v} onClick={() => setChartView(v)} className={`px-3 py-1.5 capitalize transition-colors ${chartView === v ? "bg-foreground text-background font-medium" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                {v === "daily" ? "Daily" : "Weekly"}
              </button>
            ))}
          </div>
        </div>
        {chartData.every((d) => d.revenue === 0) ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <BarChart2 className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No revenue data for this period</p>
          </div>
        ) : (
          <RevenueBarChart data={chartData} labelKey={chartView === "daily" ? "date" : "week"} />
        )}
      </div>

      {/* Top products + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-xl border border-border/50 bg-card p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><Award className="h-4 w-4 text-muted-foreground" />Top 5 Products</h2>
          {!data?.topProducts?.length ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2"><Package className="h-7 w-7 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">No order data yet</p></div>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">{i + 1}</span>
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {p.image ? <Image src={p.image} alt={p.name} fill className="object-cover" sizes="36px" /> : <Package className="h-4 w-4 absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/40" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.orders} orders</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{formatPrice(p.revenue)}</p>
                    <div className="flex items-center gap-0.5 justify-end text-[10px] text-emerald-600 dark:text-emerald-400"><ArrowUpRight className="h-2.5 w-2.5" /><span>revenue</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card p-5 flex flex-col gap-4">
          <h2 className="font-semibold flex items-center gap-2"><Percent className="h-4 w-4 text-muted-foreground" />Conversion &amp; Value</h2>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">Conversion Rate</p>
            <p className="text-3xl font-bold tabular-nums">{data?.conversionRate != null ? `${data.conversionRate.toFixed(2)}%` : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">{data?.conversionRate != null ? "Views that resulted in an order" : "Add view tracking to see conversion data"}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">Average Order Value</p>
            <p className="text-3xl font-bold tabular-nums">{formatPrice(data?.avgOrderValue ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Per order, lifetime</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 flex-1">
            <p className="text-xs text-muted-foreground mb-2">Summary</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Earned <strong className="text-foreground">{formatPrice(data?.revenue ?? 0)}</strong> across <strong className="text-foreground">{data?.orders}</strong> orders · avg rating <strong className="text-foreground">{(data?.avgRating ?? 0).toFixed(1)} ★</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
