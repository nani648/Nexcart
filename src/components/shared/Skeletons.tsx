import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-white dark:bg-card">
      {/* Image area */}
      <div className="skel aspect-square w-full" />
      {/* Info area */}
      <div className="p-3 space-y-2">
        {/* Seller name */}
        <div className="skel h-2.5 w-1/3 rounded" />
        {/* Product name */}
        <div className="skel h-3 w-full rounded" />
        <div className="skel h-3 w-3/4 rounded" />
        {/* Rating */}
        <div className="flex items-center gap-2 pt-0.5">
          <div className="skel h-4 w-10 rounded" />
          <div className="skel h-3 w-12 rounded" />
        </div>
        {/* Price */}
        <div className="flex items-baseline gap-2 pt-0.5">
          <div className="skel h-5 w-20 rounded" />
          <div className="skel h-3 w-14 rounded" />
        </div>
        {/* Button */}
        <div className="skel h-8 w-full rounded-lg mt-1" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Matches ProductListCard layout exactly */
export function ProductListSkeleton() {
  return (
    <div className="flex flex-row w-full border border-border/40 rounded-xl overflow-hidden bg-white dark:bg-card">
      {/* Left: image */}
      <div className="skel shrink-0" style={{ width: 180, height: 180 }} />
      {/* Right: content */}
      <div className="flex flex-1 flex-col p-4 gap-2.5">
        <div className="skel h-2.5 w-1/4 rounded" />
        <div className="skel h-4 w-3/4 rounded" />
        <div className="skel h-3 w-1/2 rounded" />
        <div className="flex items-baseline gap-2 pt-1">
          <div className="skel h-6 w-24 rounded" />
          <div className="skel h-3 w-16 rounded" />
        </div>
        <div className="skel h-3 w-32 rounded" />
        <div className="flex gap-2 mt-auto pt-2">
          <div className="skel h-9 w-28 rounded-lg" />
          <div className="skel h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Matches StatsCard layout (seller dashboard) */
export function DashboardStatSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 p-5 space-y-3 bg-white dark:bg-card">
      {/* Icon + label row */}
      <div className="flex items-center justify-between">
        <div className="skel h-3 w-1/2 rounded" />
        <div className="skel h-8 w-8 rounded-lg" />
      </div>
      {/* Big number */}
      <div className="skel h-8 w-2/3 rounded" />
      {/* Trend line */}
      <div className="skel h-3 w-1/3 rounded" />
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <DashboardStatSkeleton key={i} />
      ))}
    </div>
  );
}

/** Matches order list item layout */
export function OrderCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-white dark:bg-card">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-5 py-3">
        <div className="flex gap-4">
          <div className="skel h-3 w-28 rounded" />
          <div className="skel h-3 w-20 rounded" />
          <div className="skel h-3 w-16 rounded" />
        </div>
        <div className="skel h-5 w-16 rounded-full" />
      </div>
      {/* Item rows */}
      <div className="divide-y divide-border/50 px-5">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3 py-4">
            <div className="skel h-16 w-16 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col justify-center gap-2">
              <div className="skel h-3 w-3/4 rounded" />
              <div className="skel h-2.5 w-1/2 rounded" />
              <div className="skel h-4 w-1/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SellerCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <Skeleton className="h-20 w-full" />
      <div className="px-4 pb-4 pt-7">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3 mt-1" />
        <Skeleton className="h-3 w-2/3 mt-2" />
        <div className="mt-3 flex gap-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-40 mt-4" />
        <div className="space-y-2 mt-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="flex gap-3 mt-6">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
