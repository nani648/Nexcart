import { ProductGridSkeleton } from "@/components/shared/Skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-32 rounded-lg bg-muted animate-pulse" />
      </div>
      <ProductGridSkeleton count={12} />
    </div>
  );
}
