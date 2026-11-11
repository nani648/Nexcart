export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-24 rounded-lg bg-muted" />
          <div className="mt-1.5 h-4 w-40 rounded-lg bg-muted/60" />
        </div>
        <div className="h-9 w-24 rounded-xl bg-muted" />
      </div>
      {/* Tab bar */}
      <div className="flex gap-2">
        {[60, 80, 70, 50].map((w, i) => (
          <div key={i} className="h-8 rounded-full bg-muted" style={{ width: w }} />
        ))}
      </div>
      {/* Order rows */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/30 last:border-0">
            <div className="h-12 w-12 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-muted" />
              <div className="h-3 w-32 rounded bg-muted/60" />
            </div>
            <div className="h-6 w-20 rounded-full bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
