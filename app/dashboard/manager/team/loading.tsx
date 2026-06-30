import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_0.7fr] gap-4 bg-slate-100 px-5 py-3.5 border-b border-slate-200">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-16 justify-self-end" />
          </div>
          <div className="divide-y divide-slate-200">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1.6fr_1fr_1fr_1fr_0.7fr] gap-4 items-center px-5 py-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-7 w-7 rounded-lg justify-self-end" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}