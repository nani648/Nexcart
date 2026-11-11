"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type Period = "7d" | "30d" | "90d";

interface DataPoint {
  date: string;
  revenue: number;
}

interface RevenueChartProps {
  data?: DataPoint[];
  period?: Period;
}


function formatINR(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
  return `₹${v}`;
}

interface TooltipPayload {
  value: number;
  [key: string]: unknown;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        ₹{payload[0].value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

export function RevenueChart({ data, period: initialPeriod = "30d" }: RevenueChartProps) {
  const [period, setPeriod] = useState<Period>(initialPeriod);

  const chartData = useMemo(() => {
    if (data && data.length > 0) return data;
    return [];
  }, [data]);

  const total = chartData.reduce((s, d) => s + d.revenue, 0);
  const avgDaily = chartData.length > 0 ? Math.round(total / chartData.length) : 0;
  const bestDay = chartData.length > 0 ? Math.max(...chartData.map((d) => d.revenue)) : 0;

  const tickCount = period === "7d" ? 7 : period === "30d" ? 6 : 6;
  const step = chartData.length > 1 ? Math.floor(chartData.length / (tickCount - 1)) : 1;
  const tickIndices = new Set(
    Array.from({ length: tickCount }, (_, i) =>
      Math.min(i * step, Math.max(0, chartData.length - 1))
    )
  );

  return (
    <div className="space-y-4">
      {/* Period toggles */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Revenue Overview</h2>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(["7d", "30d", "90d"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                period === p
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {chartData.length === 0 && (
        <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
          <p className="text-sm font-medium text-muted-foreground">No revenue data yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Data will appear once you receive orders</p>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} strokeOpacity={0.6} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval={step - 1}
              tickFormatter={(_, i) => (tickIndices.has(i) ? chartData[i]?.date ?? "" : "")}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatINR}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#2563eb", strokeWidth: 1, strokeDasharray: "4 4" }} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }}
              fill="url(#revenueGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}

      {/* Bottom metrics */}
      <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border/60 bg-muted/20">
        {[
          { label: "Total Revenue", value: `₹${total.toLocaleString("en-IN")}` },
          { label: "Avg Daily", value: `₹${avgDaily.toLocaleString("en-IN")}` },
          { label: "Best Day", value: `₹${bestDay.toLocaleString("en-IN")}` },
        ].map((m) => (
          <div key={m.label} className="flex flex-col items-center py-3 px-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{m.label}</span>
            <span className="mt-1 text-sm font-bold tabular-nums text-foreground">{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
