"use client";

import { useEffect, useMemo, useState } from "react";
import { useOrders } from "@/hooks/useOrders";
import { OrderRow } from "@/components/orders/OrderRow";
import { orderStatuses, type OrderListItem } from "@/types/order";
import { cn, titleCase } from "@/lib/utils";

interface OrderListProps {
  initialOrders: OrderListItem[];
  role: "salesman" | "manager" | "accountant";
  detailBasePath?: string;
  liveUpdates?: boolean;
}

export function OrderList({ initialOrders, role, detailBasePath, liveUpdates = false }: OrderListProps) {
  const [orders, setOrders] = useState<OrderListItem[]>(initialOrders);
  const { orders: liveOrders, loading: liveLoading } = useOrders();

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    if (liveUpdates && !liveLoading) {
      setOrders(liveOrders);
    }
  }, [liveUpdates, liveOrders, liveLoading]);

  const [statusFilter, setStatusFilter] = useState<"all" | (typeof orderStatuses)[number]>("all");

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {(["all", ...orderStatuses] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer",
              statusFilter === status
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50",
            )}
          >
            {status === "all" ? "All Orders" : titleCase(status)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              role={role}
              detailHref={detailBasePath ? `${detailBasePath}/${order.id}` : undefined}
            />
          ))
        ) : (
          <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
            No orders found.
          </div>
        )}
      </div>
    </div>
  );
}
