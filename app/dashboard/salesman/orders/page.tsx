import { Suspense } from "react";
import { getSalesPalSession } from "@/lib/auth";
import { getOrdersPage } from "@/lib/orders-list";
import type { SearchParams } from "@/lib/list-params";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrderList } from "@/components/orders/OrderList";
import { Skeleton } from "@/components/ui/Skeleton";

export default async function SalesmanOrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Orders created when you confirm an enquiry. Accounts add the job details and close them out."
      />
      <div className="mt-4">
        <Suspense fallback={<OrdersListSkeleton />}>
          <OrdersListSection params={params} />
        </Suspense>
      </div>
    </>
  );
}

async function OrdersListSection({ params }: { params: SearchParams }) {
  const session = await getSalesPalSession();
  const userId = Number(session!.user.id);
  const data = await getOrdersPage({ created_by_id: userId }, params);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">All Orders</h2>
        <OrderList data={data} role="salesman" detailBasePath="/dashboard/salesman/orders" />
      </div>
    </div>
  );
}

function OrdersListSkeleton() {
  return (
    <div className="space-y-4 animate-page-in">
      <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl w-fit">
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-16 rounded-lg" />
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-card border border-border bg-card p-4 shadow-card">
            <div className="flex-1 space-y-2.5 min-w-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-72" />
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
