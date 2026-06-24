export default function ClientOverviewLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-2xl bg-[var(--nm-surface)] shadow-nm-sm" />
        <div className="space-y-2">
          <div className="h-5 w-48 rounded bg-slate-300/40" />
          <div className="h-3 w-32 rounded bg-slate-200/40" />
        </div>
      </div>

      {/* Client Information Card Skeleton */}
      <div className="rounded-2xl bg-[var(--nm-surface)] shadow-nm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/20 flex items-center gap-2">
          <div className="h-4 w-40 rounded bg-slate-300/40" />
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 rounded bg-slate-200/40" />
              <div className="h-5 w-28 rounded bg-slate-300/40" />
            </div>
          ))}
        </div>
      </div>

      {/* Onboarding Checklist Card Skeleton */}
      <div className="rounded-2xl bg-[var(--nm-surface)] shadow-nm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/20 flex items-center justify-between">
          <div className="h-4 w-44 rounded bg-slate-300/40" />
          <div className="h-4 w-10 rounded bg-slate-200/40" />
        </div>
        {/* Progress bar skeleton */}
        <div className="px-5 pt-4 pb-2">
          <div className="h-2.5 w-full rounded-full bg-[rgba(163,177,198,0.2)]">
            <div className="h-2.5 w-1/3 rounded-full bg-slate-300/40" />
          </div>
        </div>
        <div className="p-5 space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-slate-300/40" />
              <div className="h-4 w-48 rounded bg-slate-200/40" />
            </div>
          ))}
        </div>
      </div>

      {/* Client Tasks Card Skeleton */}
      <div className="rounded-2xl bg-[var(--nm-surface)] shadow-nm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/20 flex items-center justify-between">
          <div className="h-4 w-28 rounded bg-slate-300/40" />
          <div className="h-8 w-24 rounded-xl bg-[var(--nm-surface)] shadow-nm-sm" />
        </div>
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-slate-200/10 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-slate-300/40" />
                <div className="space-y-1.5">
                  <div className="h-4 w-52 rounded bg-slate-300/40" />
                  <div className="h-3 w-24 rounded bg-slate-200/40" />
                </div>
              </div>
              <div className="h-5 w-5 rounded bg-slate-200/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
