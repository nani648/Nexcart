export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 h-14 w-full border-b border-border/50 bg-background/95" />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-3 animate-pulse">
        <div className="h-7 w-40 rounded-lg bg-muted" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-border/40 p-4">
            <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5"><div className="h-4 w-48 rounded bg-muted" /><div className="h-3 w-64 rounded bg-muted/60" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
