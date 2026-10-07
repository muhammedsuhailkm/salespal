import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-page-in">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Charts / report cards skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border/80 bg-card p-5 space-y-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Summary table skeleton */}
      <div className="rounded-card border border-border/80 bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
