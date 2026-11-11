import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center bg-background">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">404 Error</p>
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground">Page not found</h1>
        <p className="text-[14px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-[10px] bg-primary px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/search"
          className="rounded-[10px] border border-border/60 bg-white dark:bg-card px-5 py-2.5 text-[13px] font-semibold text-foreground hover:bg-muted/50 transition-colors"
        >
          Browse Products
        </Link>
      </div>
    </div>
  );
}
