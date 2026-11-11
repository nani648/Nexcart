export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 h-14 w-full border-b border-border/50 bg-background/95" />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-4 animate-pulse">
        <div className="h-7 w-16 rounded-lg bg-muted" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 rounded-xl border border-border/40 p-4">
            <div className="h-20 w-20 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 space-y-2"><div className="h-4 w-48 rounded bg-muted" /><div className="h-3 w-24 rounded bg-muted/60" /><div className="h-5 w-20 rounded bg-muted" /></div>
          </div>
        ))}
        <div className="rounded-xl border border-border/40 p-5 space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="flex justify-between"><div className="h-4 w-24 rounded bg-muted" /><div className="h-4 w-16 rounded bg-muted" /></div>)}
          <div className="h-11 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
