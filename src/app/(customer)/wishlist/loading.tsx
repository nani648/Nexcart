export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 h-14 w-full border-b border-border/50 bg-background/95" />
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 animate-pulse">
        <div className="h-7 w-24 rounded-lg bg-muted mb-6" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border/40 overflow-hidden">
              <div className="aspect-square bg-muted" />
              <div className="p-3 space-y-2"><div className="h-3 w-3/4 rounded bg-muted" /><div className="h-4 w-1/2 rounded bg-muted" /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
