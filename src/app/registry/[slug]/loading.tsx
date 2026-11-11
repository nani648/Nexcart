export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 h-14 w-full border-b border-border/50 bg-background/95" />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-4 animate-pulse">
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-6 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-muted" />
          <div className="h-6 w-48 rounded-lg bg-muted" />
          <div className="h-4 w-32 rounded bg-muted/60" />
          <div className="h-2 w-64 rounded-full bg-muted mt-2" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="flex gap-3 p-4">
                <div className="h-20 w-20 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2"><div className="h-4 w-48 rounded bg-muted" /><div className="h-5 w-20 rounded bg-muted" /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
