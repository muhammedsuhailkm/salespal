"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, ExternalLink, Loader2, Plus, Search, Wallet, X } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ApprovalBadge } from "@/components/orders/ApprovalBadge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { cn, formatAmount, formatDate, titleCase } from "@/lib/utils";
import { setAccountsApproval, setManagerApproval } from "@/lib/actions/order-actions";
import { orderPaymentMethods, orderStatuses, type OrderListItem } from "@/types/order";
import { enquiryRef } from "@/types/enquiry";

interface OrderListProps {
  initialOrders: OrderListItem[];
  role: "salesman" | "manager" | "accountant";
  detailBasePath?: string;
  liveUpdates?: boolean;
}

const APPROVAL_CONFIG = {
  manager: { field: "manager_approval" as const, action: setManagerApproval },
  accountant: { field: "accounts_approval" as const, action: setAccountsApproval },
};

const orderNo = (id: number) => `#${String(id).padStart(5, "0")}`;
const today = () => new Date().toISOString().slice(0, 10);

function PaidBar({ order }: { order: OrderListItem }) {
  const pct = order.amount > 0 ? Math.min(100, (order.paid_amount / order.amount) * 100) : 100;
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
      <div className={cn("h-full rounded-full", pct >= 100 ? "bg-emerald-500" : "bg-amber-400")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function OrderList({ initialOrders, role, detailBasePath, liveUpdates = false }: OrderListProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>(initialOrders);
  const { orders: liveOrders, loading: liveLoading } = useOrders();

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    if (liveUpdates && !liveLoading) setOrders(liveOrders);
  }, [liveUpdates, liveOrders, liveLoading]);

  const [statusFilter, setStatusFilter] = useState<"all" | (typeof orderStatuses)[number]>("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "due" | "paid">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | undefined>();

  const approvalConfig = role === "manager" || role === "accountant" ? APPROVAL_CONFIG[role] : null;
  const canRecordPayment = role === "accountant";
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (paymentFilter === "due" && o.balance <= 0) return false;
      if (paymentFilter === "paid" && o.balance > 0) return false;
      if (!q) return true;
      return [
        orderNo(o.id),
        String(o.id),
        o.client?.name,
        o.createdBy?.name,
        o.job_no,
        o.enquiry_id ? enquiryRef(o.enquiry_id) : null,
        o.from,
        o.to,
        o.description,
      ].some((field) => field?.toLowerCase().includes(q));
    });
  }, [orders, statusFilter, paymentFilter, search]);

  const totals = useMemo(
    () =>
      filteredOrders
        .filter((o) => o.status !== "cancelled")
        .reduce((acc, o) => ({ amount: acc.amount + o.amount, paid: acc.paid + o.paid_amount, balance: acc.balance + o.balance }), {
          amount: 0,
          paid: 0,
          balance: 0,
        }),
    [filteredOrders]
  );

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(undefined), 3000);
  }

  function handleApproval(order: OrderListItem, decision: "approved" | "rejected") {
    if (!approvalConfig) return;
    setPendingId(order.id);
    startTransition(async () => {
      const result = await approvalConfig.action(order.id, decision);
      if (result.success) {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, [approvalConfig.field]: decision } : o)));
        router.refresh();
      } else {
        flash(result.error ?? "Failed to update approval");
      }
      setPendingId(null);
    });
  }

  /* ── Record payment ── */
  const [paymentFor, setPaymentFor] = useState<OrderListItem | null>(null);
  const [payment, setPayment] = useState({ amount: "", paid_on: today(), method: "bank_transfer", reference: "", notes: "" });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  function openPayment(order: OrderListItem) {
    setPaymentError(null);
    setPayment({ amount: order.balance > 0 ? String(order.balance) : "", paid_on: today(), method: "bank_transfer", reference: "", notes: "" });
    setPaymentFor(order);
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentFor) return;
    setSavingPayment(true);
    setPaymentError(null);
    try {
      const res = await fetch(`/api/orders/${paymentFor.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payment, amount: Number(payment.amount) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to record payment");
      setPaymentFor(null);
      flash(`Payment of ${formatAmount(Number(payment.amount))} recorded`);
      router.refresh();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSavingPayment(false);
    }
  }

  const colCount = 9;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order no, client, salesman, job no, enquiry ref, route..."
            aria-label="Search orders"
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Order status">
            {(["all", ...orderStatuses] as const).map((status) => (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={statusFilter === status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  statusFilter === status ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {status === "all" ? "All orders" : titleCase(status)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Payment">
            {([
              ["all", "Any payment"],
              ["due", "Balance due"],
              ["paid", "Fully paid"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={paymentFilter === value}
                onClick={() => setPaymentFilter(value)}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  paymentFilter === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Order value", value: totals.amount, tone: "text-slate-900" },
          { label: "Collected", value: totals.paid, tone: "text-emerald-700" },
          { label: "Outstanding", value: totals.balance, tone: "text-amber-700" },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.label}</p>
            <p className={cn("mt-1 text-lg font-bold tabular-nums", t.tone)}>{formatAmount(t.value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1150px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-100 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="w-8 px-3 py-3" />
              <th className="px-3 py-3">Order</th>
              <th className="px-3 py-3">Client</th>
              <th className="px-3 py-3">Salesman</th>
              <th className="px-3 py-3">Mode / Route</th>
              <th className="px-3 py-3 text-right">Amount</th>
              <th className="px-3 py-3 w-44">Paid / Balance</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center text-sm text-slate-500">
                  No orders found.
                </td>
              </tr>
            )}
            {filteredOrders.map((order) => {
              const expanded = expandedId === order.id;
              const busy = isPending && pendingId === order.id;
              return (
                <Fragment key={order.id}>
                  <tr className={cn("align-top transition hover:bg-slate-50/60", expanded && "bg-slate-50/60")}>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : order.id)}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Hide" : "Show"} details for order ${orderNo(order.id)}`}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                      >
                        <ChevronDown size={14} className={cn("transition-transform", expanded && "rotate-180")} />
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="block font-bold text-slate-900">{orderNo(order.id)}</span>
                      <span className="block text-[11px] text-slate-500">
                        {order.invoice_date ? `Inv. ${formatDate(order.invoice_date)}` : formatDate(order.created_at)}
                      </span>
                      {order.due_date && order.balance > 0 && order.status !== "cancelled" && (
                        <span
                          className={cn(
                            "block text-[11px] font-semibold",
                            new Date(order.due_date) < new Date(new Date().toDateString()) ? "text-red-600" : "text-slate-500"
                          )}
                        >
                          Due {formatDate(order.due_date)}
                        </span>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {order.job_no && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">Job {order.job_no}</span>
                        )}
                        {order.enquiry_id && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-800">{enquiryRef(order.enquiry_id)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800">{order.client?.name ?? "—"}</td>
                    <td className="px-3 py-3 font-medium text-slate-700">{order.createdBy?.name ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span className="block text-[10px] font-bold uppercase text-indigo-600">
                        {titleCase(order.mode)} · {titleCase(order.payment_mode)}
                      </span>
                      <span className="flex items-center gap-1 text-slate-800">
                        {order.from} <ArrowRight size={12} className="text-slate-400" /> {order.to}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums text-slate-900">{formatAmount(order.amount)}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-between gap-2 text-xs tabular-nums">
                        <span className="font-semibold text-emerald-700">{formatAmount(order.paid_amount)}</span>
                        <span className={cn("font-semibold", order.balance > 0 ? "text-amber-700" : "text-slate-400")}>
                          {order.balance > 0 ? `${formatAmount(order.balance)} due` : "Paid"}
                        </span>
                      </div>
                      <PaidBar order={order} />
                    </td>
                    <td className="px-3 py-3">
                      <OrderStatusBadge status={order.status} />
                      <div className="mt-1.5 flex flex-col gap-1">
                        <ApprovalBadge label="Manager" status={order.manager_approval} />
                        <ApprovalBadge label="Accounts" status={order.accounts_approval} />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-end gap-1.5">
                        {approvalConfig && order[approvalConfig.field] === "pending" && order.status !== "cancelled" && (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApproval(order, "approved")}
                              disabled={busy}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                            >
                              {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproval(order, "rejected")}
                              disabled={busy}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                            >
                              <X size={11} />
                              Reject
                            </button>
                          </div>
                        )}
                        {canRecordPayment && order.status !== "cancelled" && order.balance > 0 && (
                          <button
                            type="button"
                            onClick={() => openPayment(order)}
                            className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-slate-800"
                          >
                            <Plus size={11} />
                            Add payment
                          </button>
                        )}
                        {detailBasePath && (
                          <Link
                            href={`${detailBasePath}/${order.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition hover:text-slate-900"
                          >
                            Open <ExternalLink size={11} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expanded && (
                    <tr className="bg-slate-50/60">
                      <td />
                      <td colSpan={colCount - 1} className="px-3 pb-4 pt-1">
                        <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
                          <div className="space-y-1 text-xs">
                            <p className="font-semibold uppercase tracking-wide text-slate-400">Description</p>
                            <p className="text-slate-700">{order.description || "—"}</p>
                          </div>
                          <div>
                            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              <Wallet size={12} /> Payment collection
                            </p>
                            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white text-xs">
                              <li className="flex items-center justify-between px-3 py-2">
                                <span className="text-slate-600">Advance (at order)</span>
                                <span className="font-semibold tabular-nums text-slate-900">{formatAmount(order.advance_amount)}</span>
                              </li>
                              {order.payments.map((p) => (
                                <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                                  <span className="text-slate-600">
                                    {formatDate(p.paid_on)} · {titleCase(p.method)}
                                    {p.reference ? ` · ${p.reference}` : ""}
                                    <span className="block text-[10px] text-slate-400">recorded by {p.recorded_by}</span>
                                  </span>
                                  <span className="font-semibold tabular-nums text-emerald-700">{formatAmount(p.amount)}</span>
                                </li>
                              ))}
                              <li className="flex items-center justify-between bg-slate-50 px-3 py-2 font-semibold">
                                <span className="text-slate-700">Balance due</span>
                                <span className={cn("tabular-nums", order.balance > 0 ? "text-amber-700" : "text-emerald-700")}>{formatAmount(order.balance)}</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add payment */}
      <Modal open={!!paymentFor}>
        <form onSubmit={submitPayment} className="space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Add payment · {paymentFor && orderNo(paymentFor.id)}</h3>
              <p className="text-xs text-slate-500">
                {paymentFor?.client?.name} · balance due {paymentFor && formatAmount(paymentFor.balance)}
              </p>
            </div>
            <button type="button" onClick={() => setPaymentFor(null)} aria-label="Close" className="cursor-pointer rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          {paymentError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{paymentError}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Amount" type="number" min="0.01" step="0.01" max={paymentFor?.balance} required value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
            <Input label="Payment date" type="date" required value={payment.paid_on} onChange={(e) => setPayment({ ...payment, paid_on: e.target.value })} />
            <label htmlFor="pay-method" className="block text-sm font-medium text-slate-700">
              <span className="mb-1 block">Method</span>
              <select
                id="pay-method"
                value={payment.method}
                onChange={(e) => setPayment({ ...payment, method: e.target.value })}
                className="h-10 w-full cursor-pointer rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              >
                {orderPaymentMethods.map((m) => (
                  <option key={m} value={m}>{titleCase(m)}</option>
                ))}
              </select>
            </label>
            <Input label="Reference (optional)" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} placeholder="Receipt / txn no" />
          </div>
          <Input label="Notes (optional)" value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setPaymentFor(null)} className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={savingPayment} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
              {savingPayment && <Loader2 size={12} className="animate-spin" />}
              Record payment
            </button>
          </div>
        </form>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}
