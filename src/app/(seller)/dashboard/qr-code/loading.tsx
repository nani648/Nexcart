export default function Loading() {
  return (
    <div className="max-w-xl space-y-5 animate-pulse">
      <div className="h-7 w-36 rounded-lg bg-muted" />
      <div className="h-4 w-60 rounded bg-muted/60" />
      <div className="rounded-xl border border-border/40 p-6 flex flex-col items-center gap-4">
        <div className="h-52 w-52 rounded-2xl bg-muted" />
      </div>
      <div className="rounded-xl border border-border/40 p-4">
        <div className="h-4 w-full rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-2xl bg-muted" />)}
      </div>
    </div>
  );
}
