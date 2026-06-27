import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Page header skeleton */}
      <div className="space-y-2 mb-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Buttons skeleton */}
      <div className="flex gap-2 justify-end mb-6">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Two Column Grid */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
            <div className="space-y-3 pb-4 border-b border-slate-100">
              <Skeleton className="h-6 w-36" />
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((j) => (
                  <Skeleton key={j} className="h-14 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <div className="rounded-xl border border-slate-100 p-4 space-y-3">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
