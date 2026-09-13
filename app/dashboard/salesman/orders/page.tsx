import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getSalesPalSession } from "@/lib/auth";
import { getSalesmanOrders } from "@/lib/cached-queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrderList } from "@/components/orders/OrderList";
import { OrderDraftTable } from "@/components/orders/OrderDraftTable";
import { Skeleton } from "@/components/ui/Skeleton";

export default function SalesmanOrdersPage() {
  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Track shipment orders you've created and their approval status."
        action={
          <Link
            href="/dashboard/salesman/orders/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm"
          >
            <Plus size={14} />
            <span>Add Order</span>
          </Link>
        }
      />
      <div className="mt-4">
        <Suspense fallback={<OrdersListSkeleton />}>
          <OrdersListSection />
        </Suspense>
      </div>
    </>
  );
}

async function OrdersListSection() {
  const session = await getSalesPalSession();
  const orders = await getSalesmanOrders(session!.user.id);

  return (
    <div className="space-y-8">
      <OrderDraftTable orders={orders} />
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3">All Orders</h2>
        <OrderList initialOrders={orders} role="salesman" detailBasePath="/dashboard/salesman/orders" liveUpdates />
      </div>
    </div>
  );
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
              <Skeleton className="h-3.5 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
