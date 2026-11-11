export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-36 rounded-lg bg-muted" />
      <div className="rounded-2xl border border-border/40 p-5 space-y-3">
        <div className="h-5 w-40 rounded bg-muted" />
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-[200px] w-[200px] shrink-0 rounded-2xl bg-muted" />)}
        </div>
      </div>
      <div className="rounded-2xl border border-border/40 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-border/30 last:border-0">
            <div className="h-14 w-14 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5"><div className="h-4 w-48 rounded bg-muted" /><div className="h-3 w-24 rounded bg-muted/60" /></div>
            <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
