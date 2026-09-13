"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit3, Loader2, Ban, CheckCircle2 } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ApprovalBadge } from "@/components/orders/ApprovalBadge";
import { EditOrderModal } from "@/components/orders/EditOrderModal";
import { formatAmount, formatDate, titleCase } from "@/lib/utils";
import { setOrderStatus } from "@/lib/actions/order-actions";
import type { OrderListItem } from "@/types/order";

export function OrderDetail({ order: initialOrder }: { order: OrderListItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [order, setOrder] = useState(initialOrder);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const isDraft = order.status === "draft";
  const bothApproved = order.manager_approval === "approved" && order.accounts_approval === "approved";
  const canCancel = order.status !== "cancelled";

  function handleFinalize(status: "cancelled" | "completed") {
    startTransition(async () => {
      const result = await setOrderStatus(order.id, status);
      if (result.success) {
        setOrder((prev) => ({ ...prev, status }));
        triggerToast(`Order marked as ${status}.`);
        router.refresh();
      } else {
        triggerToast(result.error ?? "Failed to update order status");
      }
    });
  }

  return (
    <div className="space-y-6">
      {toastMsg && <Toast message={toastMsg} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {order.client?.name ?? "Order"} — {order.from} <span className="text-slate-300">&rarr;</span> {order.to}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 font-semibold uppercase tracking-wider">
            {titleCase(order.mode)} • {titleCase(order.payment_mode)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/salesman/orders"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </Link>
          {isDraft && (
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-700/20 rounded-xl transition cursor-pointer shadow-md hover:shadow-lg active:scale-95"
            >
              <Edit3 size={14} />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-5">Order Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Created</span>
                <span className="text-sm font-semibold text-slate-800">{formatDate(order.created_at)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Route</span>
                <span className="text-sm font-semibold text-slate-800">
                  {order.from} <span className="text-slate-300">&rarr;</span> {order.to}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mode / Payment</span>
                <span className="text-sm font-semibold text-slate-800">
                  {titleCase(order.mode)} / {titleCase(order.payment_mode)}
                </span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-100 pt-5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Amount</span>
                <span className="text-sm font-bold text-slate-900">{formatAmount(order.amount)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Advance</span>
                <span className="text-sm font-bold text-emerald-700">{formatAmount(order.advance_amount)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Balance</span>
                <span className="text-sm font-bold text-amber-700">{formatAmount(order.balance)}</span>
              </div>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Description</span>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm">
                {order.description}
              </p>
            </div>
          </div>

          {canCancel && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-4">Finalize Order</h2>
              <p className="text-xs text-slate-500 mb-4">
                {isDraft
                  ? "A draft order can be completed once both approvals are in, or cancelled at any time. This cannot be undone."
                  : "This order can still be cancelled at any time. This cannot be undone."}
              </p>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  {isDraft && (
                    <button
                      type="button"
                      onClick={() => handleFinalize("completed")}
                      disabled={isPending || !bothApproved}
                      title={!bothApproved ? "Requires both manager and accounts approval" : undefined}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow active:scale-95"
                    >
                      {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      <span>Mark Completed</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleFinalize("cancelled")}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : <Ban size={14} />}
                    <span>Cancel Order</span>
                  </button>
                </div>
                {isDraft && !bothApproved && (
                  <p className="text-[11px] font-semibold text-amber-600">
                    Waiting on {order.manager_approval !== "approved" && order.accounts_approval !== "approved"
                      ? "manager and accounts approval"
                      : order.manager_approval !== "approved"
                        ? "manager approval"
                        : "accounts approval"}{" "}
                    before this order can be completed.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sticky top-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Approvals</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                <span className="text-xs font-semibold text-slate-600">Manager Approval</span>
                <ApprovalBadge status={order.manager_approval} />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                <span className="text-xs font-semibold text-slate-600">Accounts Approval</span>
                <ApprovalBadge status={order.accounts_approval} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditOrderModal
        order={order}
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSaved={(updated) => {
          setOrder(updated);
          triggerToast("Order updated successfully!");
          router.refresh();
        }}
      />
    </div>
  );
}
