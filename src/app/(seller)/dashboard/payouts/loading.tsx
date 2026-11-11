export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-28 rounded-lg bg-muted" />
      <div className="rounded-xl border border-border/40 p-6 space-y-4">
        <div className="h-5 w-40 rounded bg-muted" />
        {[...Array(4)].map((_, i) => <div key={i} className="h-11 rounded-lg bg-muted" />)}
        <div className="h-10 w-32 rounded-xl bg-muted" />
      </div>
      <div className="rounded-xl border border-border/40 overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/30 last:border-0">
            <div className="flex-1 space-y-1.5"><div className="h-4 w-40 rounded bg-muted" /><div className="h-3 w-24 rounded bg-muted/60" /></div>
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-6 w-24 rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
