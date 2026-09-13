"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Trash2, Loader2, FileText } from "lucide-react";
import { EditOrderModal } from "@/components/orders/EditOrderModal";
import { Toast } from "@/components/ui/Toast";
import { formatAmount, formatDate, titleCase } from "@/lib/utils";
import type { OrderListItem } from "@/types/order";

interface OrderDraftTableProps {
  orders: OrderListItem[];
}

export function OrderDraftTable({ orders: allOrders }: OrderDraftTableProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>(() => allOrders.filter((o) => o.status === "draft"));
  const [editingOrder, setEditingOrder] = useState<OrderListItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setOrders(allOrders.filter((o) => o.status === "draft"));
  }, [allOrders]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  async function handleDelete(id: number) {
    if (!confirm("Delete this draft order? This cannot be undone.")) return;
    setDeletingId(id);

    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete order");
      }
      setOrders((prev) => prev.filter((o) => o.id !== id));
      triggerToast("Draft order deleted");
      router.refresh();
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {toastMsg && <Toast message={toastMsg} />}

      <div className="flex items-center gap-2">
        <FileText size={15} className="text-slate-400" />
        <h2 className="text-sm font-bold text-slate-900">Draft Orders ({orders.length})</h2>
      </div>

      {orders.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3 hidden sm:table-cell">Mode</th>
                <th className="px-4 py-3 hidden md:table-cell">Payment</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 hidden lg:table-cell">Advance</th>
                <th className="px-4 py-3 hidden lg:table-cell">Balance</th>
                <th className="px-4 py-3 hidden md:table-cell">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orders.map((order) => (
                <tr key={order.id} className="bg-white hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-bold text-slate-900">{order.client?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                    {order.from} <span className="text-slate-300">&rarr;</span> {order.to}
                  </td>
                  <td className="px-4 py-3 text-slate-700 hidden sm:table-cell">{titleCase(order.mode)}</td>
                  <td className="px-4 py-3 text-slate-700 hidden md:table-cell">{titleCase(order.payment_mode)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{formatAmount(order.amount)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700 hidden lg:table-cell whitespace-nowrap">{formatAmount(order.advance_amount)}</td>
                  <td className="px-4 py-3 font-semibold text-amber-700 hidden lg:table-cell whitespace-nowrap">{formatAmount(order.balance)}</td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell whitespace-nowrap">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingOrder(order)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                        title="Edit draft order"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(order.id)}
                        disabled={deletingId === order.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
                        title="Delete draft order"
                      >
                        {deletingId === order.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
          No draft orders. Orders you create start as drafts here until finalized.
        </div>
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          open={!!editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={(updated) => {
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            triggerToast("Order updated successfully!");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
