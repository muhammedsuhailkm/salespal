import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShippingRateTable } from "@/components/shipping-rates/ShippingRateTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { getShippingRates } from "@/lib/cached-queries";

export default function SalesmanDashboardOrgPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Salesman dashboard workspace"
      />

      <Suspense fallback={<ShippingRatesSkeleton />}>
        <ShippingRatesSection />
      </Suspense>
    </div>
  );
}

async function ShippingRatesSection() {
  const rates = await getShippingRates();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <ShippingRateTable initialRates={rates} />
    </div>
  );
}

function ShippingRatesSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse space-y-4">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-md" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}
