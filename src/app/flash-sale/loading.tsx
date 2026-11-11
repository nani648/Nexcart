export default function Loading() {
  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-50 h-14 w-full border-b border-white/10 bg-black/80" />
      <div className="py-10 px-4 text-center animate-pulse">
        <div className="h-10 w-48 rounded-xl bg-white/10 mx-auto mb-4" />
        <div className="h-4 w-64 rounded bg-white/8 mx-auto" />
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 animate-pulse">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 overflow-hidden">
              <div className="aspect-square bg-white/8" />
              <div className="p-3 space-y-2"><div className="h-3 w-3/4 rounded bg-white/8" /><div className="h-4 w-1/2 rounded bg-white/8" /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
