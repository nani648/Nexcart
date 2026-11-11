export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="h-7 w-36 rounded-lg bg-muted" />
          <div className="mt-1.5 h-4 w-52 rounded-lg bg-muted/60" />
        </div>
        <div className="h-9 w-20 rounded-xl bg-muted" />
      </div>
      {/* Stat cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-[14px] border border-border/40 bg-card p-[18px] space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-[10px] bg-muted" />
              <div className="h-4 w-12 rounded bg-muted/60" />
            </div>
            <div className="h-3 w-24 rounded bg-muted/60" />
            <div className="h-7 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
      {/* Chart */}
      <div className="h-52 rounded-[10px] border border-border/50 bg-card" />
      {/* Bottom grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[10px] border border-border/50 bg-card overflow-hidden">
          <div className="border-b border-border/40 px-5 py-4 flex justify-between">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-4 w-12 rounded bg-muted/60" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-border/30 last:border-0">
              <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 rounded bg-muted" />
                <div className="h-2.5 w-20 rounded bg-muted/60" />
              </div>
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
          ))}
        </div>
        <div className="rounded-[10px] border border-border/50 bg-card overflow-hidden">
          <div className="border-b border-border/40 px-5 py-4 flex justify-between">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-4 w-12 rounded bg-muted/60" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-border/30 last:border-0">
              <div className="h-6 w-6 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 rounded bg-muted" />
                <div className="h-2 flex-1 rounded-full bg-muted/40 mt-2" />
              </div>
              <div className="h-4 w-14 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
