import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSalesPalSession } from "@/lib/auth";
import { getOrderById } from "@/lib/cached-queries";
import { OrderDetail } from "./OrderDetail";
import OrderDetailLoading from "./loading";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<OrderDetailLoading />}>
      <OrderDetailContent params={params} />
    </Suspense>
  );
}

async function OrderDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);

  if (isNaN(orderId)) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-red-600">Invalid Order ID</h3>
        <p className="mt-2 text-xs text-slate-500">The order ID provided is not valid.</p>
      </div>
    );
  }

  const session = await getSalesPalSession();
  if (!session) redirect("/login");

  const order = await getOrderById(orderId);

  // This route sits under the salesman layout (role_id === 3 enforced there),
  // so the only remaining check is that the order belongs to this salesman.
  if (!order || order.created_by_id !== session.user.id) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-red-600">Order Not Found</h3>
        <p className="mt-2 text-xs text-slate-500">This order does not exist or you do not have access to it.</p>
      </div>
    );
  }

  return <OrderDetail order={order} />;
}
