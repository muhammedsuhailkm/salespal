import { Skeleton } from "@/components/ui/Skeleton";

/** Placeholder for ClientHistory while the summary and first pages load. */
export function ClientHistorySkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-card" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-card" />
      <Skeleton className="h-[360px] rounded-card" />
    </div>
  );
}
