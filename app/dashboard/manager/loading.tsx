import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      {/* KPI cards row — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5 border-t-[3px] border-t-slate-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Salesman Performance — 2 columns */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Spotlight card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <Skeleton className="h-5 w-28 rounded-full" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-[54px] w-[54px] rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-10 w-14" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-14 rounded-xl" />
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-2 rounded-full" />
            ))}
            <Skeleton className="h-12 rounded-xl" />
          </div>
          {/* Leaderboard */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <Skeleton className="h-5 w-36" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-1.5 w-3/4 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Funnel + Tasks — 2 columns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 rounded-lg" />
            </div>
          ))}
          <Skeleton className="h-10 w-16 mx-auto" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="flex items-center gap-3">
              <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2 w-20" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed — full width */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 5 }).map((_, j) => (
          <div key={j} className="flex items-start gap-3">
            <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
