export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 h-14 w-full border-b border-border/50 bg-background/95" />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 animate-pulse">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="h-11 w-11 rounded-[10px] bg-muted" />
            <div className="h-8 w-56 rounded-lg bg-muted" />
            <div className="h-4 w-72 rounded bg-muted/60" />
            <div className="space-y-3 mt-4">{[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded-lg bg-muted" />)}</div>
          </div>
          <div className="rounded-[10px] border border-border/60 p-6 space-y-4">
            <div className="h-5 w-28 rounded bg-muted" />
            <div className="h-11 rounded-[8px] bg-muted" />
            <div className="h-28 rounded-[8px] bg-muted" />
            <div className="h-11 rounded-[10px] bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
