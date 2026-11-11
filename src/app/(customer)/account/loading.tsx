export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 h-14 w-full border-b border-border/50 bg-background/95" />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 space-y-5 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted shrink-0" />
          <div className="space-y-2"><div className="h-4 w-32 rounded bg-muted" /><div className="h-3 w-44 rounded bg-muted/60" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-[10px] bg-muted" />)}
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-[10px] bg-muted" />)}
        </div>
        <div className="h-11 rounded-[10px] bg-muted" />
      </div>
    </div>
  );
}
