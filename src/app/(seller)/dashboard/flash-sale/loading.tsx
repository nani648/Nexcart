export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-36 rounded-lg bg-muted" />
      <div className="h-14 rounded-xl bg-muted/40" />
      <div className="rounded-xl border border-border/40 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/30 last:border-0">
            <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5"><div className="h-4 w-48 rounded bg-muted" /><div className="h-3 w-20 rounded bg-muted/60" /></div>
            <div className="h-4 w-16 rounded bg-muted hidden sm:block" />
            <div className="h-6 w-11 rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
