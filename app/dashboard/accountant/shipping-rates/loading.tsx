import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex gap-4 border-t border-slate-100/70 pt-3.5">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100/50 last:border-0">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full ml-3" />
              <Skeleton className="h-4 w-16 ml-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
