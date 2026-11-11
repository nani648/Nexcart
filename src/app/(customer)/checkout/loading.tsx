export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 h-14 w-full border-b border-border/50 bg-background/95" />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 grid lg:grid-cols-2 gap-6 animate-pulse">
        <div className="space-y-4">
          <div className="h-6 w-36 rounded-lg bg-muted" />
          {[...Array(4)].map((_, i) => <div key={i} className="h-11 rounded-lg bg-muted" />)}
        </div>
        <div className="rounded-xl border border-border/40 p-5 space-y-4 h-fit">
          <div className="h-5 w-28 rounded bg-muted" />
          {[...Array(3)].map((_, i) => <div key={i} className="flex gap-3"><div className="h-12 w-12 rounded-lg bg-muted" /><div className="flex-1 space-y-2"><div className="h-3 w-full rounded bg-muted" /><div className="h-4 w-20 rounded bg-muted" /></div></div>)}
          <div className="h-11 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
