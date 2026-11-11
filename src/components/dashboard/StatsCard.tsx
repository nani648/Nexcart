import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string;
  change: number;
  changeLabel?: string;
  icon: LucideIcon;
  color: "blue" | "green" | "amber" | "red" | "purple" | "cyan";
  prefix?: string;
  suffix?: string;
}

const COLOR_MAP = {
  blue:   { wrap: "bg-blue-50 dark:bg-blue-950/40",     icon: "text-blue-600 dark:text-blue-400"     },
  green:  { wrap: "bg-emerald-50 dark:bg-emerald-950/40", icon: "text-emerald-600 dark:text-emerald-400" },
  amber:  { wrap: "bg-amber-50 dark:bg-amber-950/40",   icon: "text-amber-600 dark:text-amber-400"   },
  red:    { wrap: "bg-red-50 dark:bg-red-950/40",       icon: "text-red-500 dark:text-red-400"       },
  purple: { wrap: "bg-purple-50 dark:bg-purple-950/40", icon: "text-purple-600 dark:text-purple-400" },
  cyan:   { wrap: "bg-cyan-50 dark:bg-cyan-950/40",     icon: "text-cyan-600 dark:text-cyan-400"     },
};

export function StatsCard({
  label,
  value,
  change,
  changeLabel = "vs last month",
  icon: Icon,
  color,
  prefix,
  suffix,
}: StatsCardProps) {
  const c = COLOR_MAP[color];

  const changeEl =
    change > 0 ? (
      <span className="text-emerald-600 dark:text-emerald-400">↑ {change}% {changeLabel}</span>
    ) : change < 0 ? (
      <span className="text-red-500 dark:text-red-400">↓ {Math.abs(change)}% {changeLabel}</span>
    ) : (
      <span className="text-muted-foreground">Awaiting approval</span>
    );

  return (
    <div className="group relative rounded-[10px] border border-border/50 bg-card p-[18px] transition-all duration-250 hover:-translate-y-0.5 hover:border-border/70 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-[10px]", c.wrap)}>
          <Icon className={cn("h-[17px] w-[17px]", c.icon)} />
        </div>
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-muted opacity-0 translate-x-[-4px] transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>

      {/* Label */}
      <div className="text-[11px] font-semibold uppercase tracking-[.06em] text-muted-foreground mb-1.5">
        {label}
      </div>

      {/* Value */}
      <div className="text-[24px] font-semibold leading-none tabular-nums tracking-tight text-foreground mb-1">
        {prefix && <span className="text-lg font-semibold text-muted-foreground mr-0.5">{prefix}</span>}
        {value}
        {suffix && <span className="text-lg font-semibold text-muted-foreground ml-0.5">{suffix}</span>}
      </div>

      {/* Change */}
      <div className="text-[11px] font-medium mt-3">{changeEl}</div>
    </div>
  );
}
