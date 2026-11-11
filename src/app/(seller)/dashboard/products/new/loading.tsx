export default function Loading() {
  return (
    <div className="max-w-2xl space-y-5 animate-pulse">
      <div className="h-7 w-36 rounded-lg bg-muted" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 p-5 space-y-3">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="h-10 rounded-lg bg-muted" />
          {i === 0 && <div className="h-24 rounded-lg bg-muted" />}
        </div>
      ))}
      <div className="h-11 w-36 rounded-xl bg-muted" />
    </div>
  );
}
