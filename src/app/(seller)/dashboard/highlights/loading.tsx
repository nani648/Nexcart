export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-44 rounded-lg bg-muted" />
      <div className="h-4 w-72 rounded bg-muted/60" />
      <div className="rounded-xl border border-border/40 p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="aspect-video rounded-xl bg-muted" />)}
        </div>
      </div>
      <div className="h-10 w-36 rounded-xl bg-muted" />
    </div>
  );
}
