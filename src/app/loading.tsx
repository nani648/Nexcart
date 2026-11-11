import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-[hsl(214_32%_97%)] dark:bg-[hsl(220_17%_5%)]">
      {/* Navbar skeleton */}
      <div className="sticky top-0 z-50 h-14 w-full border-b border-border/50 bg-background/95" />

      <div className="mx-auto max-w-7xl px-4 py-6 space-y-10 sm:px-6">
        {/* Hero skeleton */}
        <Skeleton className="w-full rounded-2xl" style={{ aspectRatio: "16/5" }} />

        {/* Deal of day skeleton */}
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-48 shrink-0 rounded-xl" />
          ))}
        </div>

        {/* Section heading */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-36 rounded" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[...Array(10)].map((_, i) => (
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
    </div>
  );
}
