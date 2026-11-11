export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5"><div className="h-7 w-36 rounded-lg bg-muted" /><div className="h-4 w-52 rounded bg-muted/60" /></div>
        <div className="h-9 w-28 rounded-xl bg-muted" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="h-14 w-14 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2"><div className="h-4 w-40 rounded bg-muted" /><div className="h-3 w-24 rounded bg-muted/60" /></div>
            <div className="flex gap-2"><div className="h-8 w-16 rounded-lg bg-muted" /><div className="h-8 w-8 rounded-lg bg-muted" /></div>
          </div>
        </div>
      ))}
    </div>
  );
}
