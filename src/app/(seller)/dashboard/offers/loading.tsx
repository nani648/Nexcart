export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 rounded-lg bg-muted" />
        <div className="h-9 w-28 rounded-xl bg-muted" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-3 w-56 rounded bg-muted/60" />
              </div>
            </div>
            <div className="h-6 w-14 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
