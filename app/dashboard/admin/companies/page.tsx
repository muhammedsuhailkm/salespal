import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getSalesPalSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getCachedAdminCompaniesPageOrgs,
  getCachedAdminCompaniesPageManagers,
  getCachedAdminCompaniesPageSalesmen,
  getCachedAdminCompaniesPageRelations,
  getCachedAdminCompaniesPageClientCounts
} from "@/lib/cached-queries";
import { CompaniesClient } from "./CompaniesClient";
import { Skeleton } from "@/components/ui/Skeleton";

async function CompaniesDashboardWrapper() {
  const [
    companies,
    managersList,
    salesmenList,
    managerSalesmen,
    clientCounts
  ] = await Promise.all([
    getCachedAdminCompaniesPageOrgs(),
    getCachedAdminCompaniesPageManagers(),
    getCachedAdminCompaniesPageSalesmen(),
    getCachedAdminCompaniesPageRelations(),
    getCachedAdminCompaniesPageClientCounts()
  ]);

  return (
    <CompaniesClient
      companies={companies}
      managersList={managersList}
      salesmenList={salesmenList}
      managerSalesmen={managerSalesmen}
      clientCounts={clientCounts}
    />
  );
}

function CompaniesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Buttons skeleton */}
      <div className="flex gap-2 justify-end">
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

export default async function CompaniesPage() {
  const session = await getSalesPalSession();
  if (!session) {
    redirect("/login");
  }

  if (session.user.role_id !== 1) {
    return (
      <div className="p-6 text-center text-rose-700 font-semibold bg-rose-50 rounded-xl border border-rose-100">
        Unauthorized access
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Companies"
        subtitle="Assign managers and salesmen to each company"
      />
      <div className="mt-6">
        <Suspense fallback={<CompaniesSkeleton />}>
          <CompaniesDashboardWrapper />
        </Suspense>
      </div>
    </>
  );
}
