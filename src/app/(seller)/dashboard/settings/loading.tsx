export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-24 rounded-lg bg-muted" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-muted" />
          <div className="space-y-3">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 rounded bg-muted" />
                  <div className="h-3 w-48 rounded bg-muted/60" />
                </div>
                <div className="h-9 w-24 rounded-xl bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
