import { Suspense } from "react";
import { getAccountantOrders } from "@/lib/cached-queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrderList } from "@/components/orders/OrderList";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AccountantOrdersPage() {
  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Review and approve accounts sign-off for orders company-wide."
      />
      <div className="mt-4">
        <Suspense fallback={<OrdersListSkeleton />}>
          <AccountantOrdersSection />
        </Suspense>
      </div>
    </>
  );
}

async function AccountantOrdersSection() {
  const orders = await getAccountantOrders();

  return <OrderList initialOrders={orders} role="accountant" />;
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
