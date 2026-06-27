import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>



      {/* KPI cards row — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5 border-t-[3px] border-t-slate-200 space-y-3"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Company hero — 2 columns */}
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-32 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((j) => <Skeleton key={j} className="h-16 rounded-xl" />)}
            </div>
            <Skeleton className="h-3 rounded-full" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Middle & Bottom combined grid — 5 cards */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Leaderboard skeleton */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 h-[400px] space-y-4 order-1 lg:order-none">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1.5 w-3/4 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Task health skeleton */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 h-[400px] space-y-4 order-2 lg:order-none">
          <Skeleton className="h-5 w-24" />
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((j) => <Skeleton key={j} className="h-10 rounded-lg" />)}
          </div>
          <Skeleton className="h-3 rounded-full" />
          <Skeleton className="h-5 w-24" />
          <div className="space-y-2">
            {[0, 1, 2].map((j) => <Skeleton key={j} className="h-5 w-full" />)}
          </div>
        </div>

        {/* Monthly Trend skeleton */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 h-[400px] order-3 lg:order-none">
          <Skeleton className="h-4 w-44 mb-4" />
          <Skeleton className="h-[220px] rounded-xl" />
        </div>

        {/* Lost clients skeleton */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden h-[340px] order-5 lg:order-none lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100">
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="divide-y divide-slate-100 p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity skeleton */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 h-[340px] space-y-4 order-4 lg:order-none">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1.5 w-3/4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
