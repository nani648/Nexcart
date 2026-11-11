export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 rounded-lg bg-muted" />
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-muted" />
          <div className="h-9 w-28 rounded-xl bg-muted/60" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border/40 overflow-hidden">
            <div className="aspect-[4/3] bg-muted" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted/60" />
              <div className="flex justify-between mt-3">
                <div className="h-5 w-16 rounded bg-muted" />
                <div className="h-7 w-20 rounded-lg bg-muted/60" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
