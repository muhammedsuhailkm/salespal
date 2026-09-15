import { Suspense } from "react";
import { getShippingRates } from "@/lib/cached-queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShippingRateTable } from "@/components/shipping-rates/ShippingRateTable";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AccountantShippingRatesPage() {
  return (
    <>
      <PageHeader
        title="Shipping Rates"
        subtitle="Maintain the rate card salesmen use to quote clients."
      />
      <div className="mt-4">
        <Suspense fallback={<ShippingRatesSkeleton />}>
          <ShippingRatesSection />
        </Suspense>
      </div>
    </>
  );
}

async function ShippingRatesSection() {
  const rates = await getShippingRates();
  return <ShippingRateTable initialRates={rates} editable />;
}

function ShippingRatesSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Rate Finder Skeleton */}
      <div className="ss-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>

      {/* Rates Directory Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>
        <div className="hidden md:block ss-card overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: "var(--ds-border-default)" }}>
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
