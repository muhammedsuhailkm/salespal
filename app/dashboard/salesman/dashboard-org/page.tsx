import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShippingRateTable } from "@/components/shipping-rates/ShippingRateTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { getShippingRates } from "@/lib/cached-queries";
import { getSalesPalSession } from "@/lib/auth";
import { getSalesmanOrgIds } from "@/lib/scoping";
import { getCompanyProfiles } from "@/lib/company-documents";
import { CompanyInfoCard } from "@/components/companies/CompanyInfoCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Building } from "lucide-react";

export default function SalesmanDashboardOrgPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Your company details, documents and the current shipping rates."
      />

      <Suspense fallback={<CompanySkeleton />}>
        <CompanySection />
      </Suspense>

      <Suspense fallback={<ShippingRatesSkeleton />}>
        <ShippingRatesSection />
      </Suspense>
    </div>
  );
}

async function CompanySection() {
  const session = await getSalesPalSession();
  const companies = await getCompanyProfiles(await getSalesmanOrgIds(Number(session!.user.id)));

  if (companies.length === 0) {
    return (
      <EmptyState
        icon={Building}
        title="No company linked yet"
        message="Company details appear here once your manager is assigned to a company."
      />
    );
  }

  return (
    <div className="space-y-4">
      {companies.map((company) => (
        <CompanyInfoCard key={company.id} company={company} />
      ))}
    </div>
  );
}

function CompanySkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function ShippingRatesSection() {
  const rates = await getShippingRates();

  return <ShippingRateTable initialRates={rates} />;
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
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="hidden md:block ss-card overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: "var(--ds-border-default)" }}>
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
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
