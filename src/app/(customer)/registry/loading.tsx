export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 h-14 w-full border-b border-border/50 bg-background/95" />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5"><div className="h-7 w-40 rounded-lg bg-muted" /><div className="h-4 w-56 rounded bg-muted/60" /></div>
          <div className="h-9 w-32 rounded-xl bg-muted" />
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/40 p-5 space-y-3">
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted/60" />
            <div className="h-3 w-20 rounded bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
