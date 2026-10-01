import { Suspense } from "react";
import { getOrdersPage } from "@/lib/orders-list";
import type { SearchParams } from "@/lib/list-params";
import { getAccountantCompanies } from "@/lib/accountant-dashboard";
import { getSalesPalSession } from "@/lib/auth";
import { AccountantCompanyChips, NoAssignedCompanies } from "@/components/accountant/AccountantCompanies";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrderList } from "@/components/orders/OrderList";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function AccountantOrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const session = await getSalesPalSession();
  const companies = await getAccountantCompanies(Number(session!.user.id));

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Review and approve accounts sign-off for orders of your assigned companies."
        action={<AccountantCompanyChips companies={companies} />}
      />
      <div className="mt-4">
        {companies.length === 0 ? (
          <NoAssignedCompanies />
        ) : (
          <Suspense fallback={<OrdersListSkeleton />}>
            <AccountantOrdersSection orgIds={companies.map((c) => c.id)} params={params} />
          </Suspense>
        )}
      </div>
    </>
  );
}

async function AccountantOrdersSection({ orgIds, params }: { orgIds: number[]; params: SearchParams }) {
  const data = await getOrdersPage({ client: { org_id: { in: orgIds } } }, params);

  return <OrderList data={data} role="accountant" />;
}

function OrdersListSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-16 rounded-lg" />
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex-1 space-y-2.5 min-w-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-72" />
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-7 w-40 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
