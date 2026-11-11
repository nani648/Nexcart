export default function Loading() {
  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-50 h-14 w-full border-b border-border/30 bg-background/95" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 animate-pulse">
        <div className="h-8 w-36 rounded-lg bg-muted mb-6" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {[...Array(12)].map((_, i) => (
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
