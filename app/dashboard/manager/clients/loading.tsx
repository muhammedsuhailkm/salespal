import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 animate-page-in">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="flex items-center justify-between bg-subtle/50 p-4 rounded-xl border border-border/60 shadow-sm flex-wrap gap-3">
        <Skeleton className="h-5 w-44" />
      </div>

      <div className="flex flex-col gap-4 bg-card p-4 rounded-card border border-border/80 shadow-card">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex flex-wrap items-end gap-4 border-t border-border/70 pt-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 min-w-[140px]">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_0.9fr_0.9fr_0.8fr] gap-4 bg-muted px-4 py-3 border-b border-border">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1.3fr_1fr_1fr_1fr_0.9fr_0.9fr_0.8fr] gap-4 items-center px-4 py-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}