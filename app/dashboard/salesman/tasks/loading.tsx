import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-page-in">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Tab bar / header skeleton */}
      <div className="flex items-center justify-between bg-card p-4 rounded-card border border-border/80 shadow-card">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>

      {/* Task cards skeleton */}
      <div className="w-full space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card p-4 rounded-card border border-border shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <div className="border-t border-border pt-2.5 flex items-center justify-between">
              <Skeleton className="h-3.5 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
