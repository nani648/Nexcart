import { Skeleton } from "@/components/ui/skeleton";

export default function StoreLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 h-14 w-full border-b border-border/50 bg-background/95" />
      {/* Banner */}
      <Skeleton className="h-40 w-full rounded-none sm:h-52" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Store header */}
        <div className="-mt-10 mb-8 flex items-end gap-4">
          <Skeleton className="h-20 w-20 rounded-2xl shrink-0" />
          <div className="space-y-2 pb-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        {/* Products grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 overflow-hidden">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
