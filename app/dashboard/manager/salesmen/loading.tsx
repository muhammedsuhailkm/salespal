import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-page-in">
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-3 rounded-card border border-border bg-card p-5 shadow-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-2 w-40 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
