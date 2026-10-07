import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

/** Title + subtitle placeholder matching PageHeader. */
export function HeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-80 max-w-[70vw]" />
      </div>
      {action && <Skeleton className="h-10 w-32 rounded-control" />}
    </div>
  );
}

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-card border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-control" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8, columns = 5, toolbar = true }: { rows?: number; columns?: number; toolbar?: boolean }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <Skeleton className="h-9 w-64 rounded-control" />
          <Skeleton className="h-9 w-32 rounded-control" />
          <Skeleton className="h-9 w-32 rounded-control" />
        </div>
      )}
      <div className="grid gap-4 border-b border-border bg-subtle px-4 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-20" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid items-center gap-4 px-4 py-3.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className={cn("h-4", c === 0 ? "w-36" : c === columns - 1 ? "w-16 rounded-full" : "w-24")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Generic page placeholder: header, optional KPI row, then a table or a detail layout. */
export function PageSkeleton({ kpis = 0, variant = "table" }: { kpis?: number; variant?: "table" | "detail" }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <HeaderSkeleton action={variant === "table"} />
      {kpis > 0 && <KpiSkeleton count={kpis} />}
      {variant === "table" ? (
        <TableSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 rounded-card border border-border bg-card p-5 shadow-card lg:col-span-2">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-2 gap-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
          <div className="space-y-3 rounded-card border border-border bg-card p-5 shadow-card">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-control" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
