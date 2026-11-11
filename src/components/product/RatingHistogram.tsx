"use client";

import { cn } from "@/lib/utils";

interface Distribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

interface RatingHistogramProps {
  rating: number;
  reviewCount: number;
  distribution: Distribution;
  onFilter?: (star: number | null) => void;
  activeFilter?: number | null;
}

const BAR_COLORS: Record<number, string> = {
  5: "bg-emerald-500",
  4: "bg-emerald-400",
  3: "bg-yellow-400",
  2: "bg-orange-400",
  1: "bg-red-400",
};

function FilledStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            "text-[18px] leading-none",
            i <= Math.round(rating) ? "text-amber-400" : "text-muted-foreground/25"
          )}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function RatingHistogram({
  rating,
  reviewCount,
  distribution,
  onFilter,
  activeFilter,
}: RatingHistogramProps) {
  const total = Object.values(distribution).reduce((s, n) => s + n, 0) || 1;

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      {/* Left: big number */}
      <div className="flex flex-col items-center justify-center min-w-[120px] gap-1">
        <span className="text-5xl font-semibold text-foreground tabular-nums leading-none">
          {rating.toFixed(1)}
        </span>
        <FilledStars rating={rating} />
        <span className="text-[12px] text-muted-foreground mt-1">
          {reviewCount.toLocaleString("en-IN")} ratings
        </span>
      </div>

      {/* Right: histogram bars */}
      <div className="flex flex-col gap-1.5 flex-1 w-full">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = distribution[star] ?? 0;
          const pct = Math.round((count / total) * 100);
          const isActive = activeFilter === star;

          return (
            <button
              key={star}
              onClick={() => onFilter?.(isActive ? null : star)}
              className={cn(
                "flex items-center gap-2.5 group rounded-lg px-2 py-1 transition-colors",
                isActive ? "bg-primary/8" : "hover:bg-muted"
              )}
            >
              {/* Star label */}
              <span className="text-[12px] font-semibold text-muted-foreground w-5 shrink-0 text-right">
                {star}★
              </span>

              {/* Bar */}
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", BAR_COLORS[star])}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Count */}
              <span className="text-[12px] text-muted-foreground w-8 shrink-0 text-right tabular-nums">
                {count.toLocaleString("en-IN")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
