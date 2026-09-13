"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ApprovalBadge } from "@/components/orders/ApprovalBadge";
import { formatAmount, formatDate, titleCase } from "@/lib/utils";
import { setManagerApproval, setAccountsApproval } from "@/lib/actions/order-actions";
import type { OrderListItem } from "@/types/order";

interface OrderRowProps {
  order: OrderListItem;
  role: "salesman" | "manager" | "accountant";
  detailHref?: string;
}

const APPROVAL_CONFIG = {
  manager: { field: "manager_approval" as const, action: setManagerApproval },
  accountant: { field: "accounts_approval" as const, action: setAccountsApproval },
};

export function OrderRow({ order, role, detailHref }: OrderRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localOrder, setLocalOrder] = useState(order);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const approvalConfig = role === "manager" || role === "accountant" ? APPROVAL_CONFIG[role] : null;

  function handleApproval(decision: "approved" | "rejected") {
    if (!approvalConfig) return;
    setErrorMsg(null);
    startTransition(async () => {
      const result = await approvalConfig.action(localOrder.id, decision);
      if (result.success) {
        setLocalOrder((prev) => ({ ...prev, [approvalConfig.field]: decision }));
        router.refresh();
      } else {
        setErrorMsg(result.error ?? "Failed to update approval");
      }
    });
  }

  const content = (
    <div className="flex-1 min-w-0 space-y-1.5">
      <div className="flex items-center flex-wrap gap-2">
        <span className="text-sm font-bold text-slate-900">{localOrder.client?.name ?? "Client"}</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
          {titleCase(localOrder.mode)}
        </span>
        <span className="text-[11px] font-medium text-slate-400">{titleCase(localOrder.payment_mode)}</span>
      </div>
      <p className="text-xs font-semibold text-slate-600 truncate">
        {localOrder.from} <span className="text-slate-300">&rarr;</span> {localOrder.to}
      </p>
      <p className="text-xs text-slate-500 truncate">{localOrder.description}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
        <span className="text-slate-500">
          Amount <span className="font-bold text-slate-800">{formatAmount(localOrder.amount)}</span>
        </span>
        <span className="text-slate-500">
          Advance <span className="font-bold text-emerald-700">{formatAmount(localOrder.advance_amount)}</span>
        </span>
        <span className="text-slate-500">
          Balance <span className="font-bold text-amber-700">{formatAmount(localOrder.balance)}</span>
        </span>
      </div>
      <p className="text-[11px] text-slate-400">Created {formatDate(localOrder.created_at)}</p>
    </div>
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      {detailHref ? (
        <Link href={detailHref} className="flex flex-1 min-w-0">
          {content}
        </Link>
      ) : (
        content
      )}

      <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
        <OrderStatusBadge status={localOrder.status} />
        <div className="flex flex-col gap-1">
          <ApprovalBadge label="Manager" status={localOrder.manager_approval} />
          <ApprovalBadge label="Accounts" status={localOrder.accounts_approval} />
        </div>

        {approvalConfig && localOrder[approvalConfig.field] === "pending" && (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleApproval("approved")}
              disabled={isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              <span>Approve</span>
            </button>
            <button
              type="button"
              onClick={() => handleApproval("rejected")}
              disabled={isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
              <span>Reject</span>
            </button>
          </div>
        )}
        {errorMsg && <p className="text-[10px] font-semibold text-red-600">{errorMsg}</p>}
      </div>
    </div>
  );
}
