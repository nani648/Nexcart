export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-28 rounded-lg bg-muted" />
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card p-5 space-y-3">
            <div className="h-9 w-9 rounded-[10px] bg-muted" />
            <div className="h-3 w-20 rounded bg-muted/60" />
            <div className="h-6 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-xl border border-border/40 bg-card" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 rounded-xl border border-border/40 bg-card" />
        <div className="h-48 rounded-xl border border-border/40 bg-card" />
      </div>
    </div>
  );
}
