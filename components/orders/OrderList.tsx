"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, ExternalLink, Loader2, Plus, Search, Wallet, X } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedParam, useUrlFilters } from "@/hooks/useUrlFilters";
import type { OrdersPage } from "@/lib/orders-list";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderActions } from "@/components/orders/OrderActions";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { cn, formatAmount, formatDate, titleCase } from "@/lib/utils";
import { orderPaymentMethods, orderStatusLabels, orderStatuses, type OrderListItem } from "@/types/order";
import { enquiryRef } from "@/types/enquiry";
import { enquiryHref } from "@/lib/record-links";

import { buttonVariants } from "@/components/ui/Button";
interface OrderListProps {
  /** One server-filtered page of orders plus totals over all matches. */
  data: OrdersPage;
  role: "salesman" | "manager" | "accountant";
  detailBasePath?: string;
}

const orderNo = (id: number) => `#${String(id).padStart(5, "0")}`;
const today = () => new Date().toISOString().slice(0, 10);

function PaidBar({ order }: { order: OrderListItem }) {
  const pct = order.amount > 0 ? Math.min(100, (order.paid_amount / order.amount) * 100) : 100;
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className={cn("h-full rounded-full", pct >= 100 ? "bg-success" : "bg-warning")} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Server-paginated orders table. Status / payment tabs, search and page are URL params. */
export function OrderList({ data, role, detailBasePath }: OrderListProps) {
  const router = useRouter();
  const { get, set, isPending: isNavigating } = useUrlFilters();
  const statusFilter = (get("status") || "all") as "all" | (typeof orderStatuses)[number];
  const paymentFilter = (get("pay") || "all") as "all" | "due" | "paid";
  const [search, setSearch] = useDebouncedParam("q", set, get("q"));
  // ?open=<id> (link from an enquiry or client page) starts with that order expanded.
  const [expandedId, setExpandedId] = useState<number | null>(() => Number(get("open")) || null);
  const [toast, setToast] = useState<string | undefined>();

  // Accountants, and salesmen on orders converted from their own enquiries (the server re-checks ownership).
  const canRecordPayment = (order: OrderListItem) => role === "accountant" || (role === "salesman" && !!order.enquiry_id);
  const filteredOrders = data.rows as OrderListItem[];
  const totals = data.totals;

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(undefined), 3000);
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
      <div className="flex flex-col gap-3 rounded-card border border-border/80 bg-card p-4 shadow-card">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order no, client, salesman, job no, enquiry ref, route..."
            aria-label="Search orders"
            className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 w-full pl-9 pr-3"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Order status">
            {(["all", ...orderStatuses] as const).map((status) => (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={statusFilter === status}
                onClick={() => set({ status })}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  statusFilter === status ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/85"
                )}
              >
                {status === "all" ? "All orders" : orderStatusLabels[status]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Payment">
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
                onClick={() => set({ pay: value })}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  paymentFilter === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/85"
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
          { label: "Order value", value: totals.amount, tone: "text-foreground" },
          { label: "Collected", value: totals.paid, tone: "text-success-foreground" },
          { label: "Outstanding", value: totals.balance, tone: "text-warning-foreground" },
        ].map((t) => (
          <div key={t.label} className="rounded-card border border-border bg-card px-4 py-3 shadow-card">
            <p className="text-xs font-semibold text-muted-foreground">{t.label}</p>
            <p className={cn("mt-1 text-lg font-semibold tabular-nums", t.tone)}>{formatAmount(t.value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className={cn("space-y-1 transition-opacity", isNavigating && "opacity-60")} aria-busy={isNavigating}>
      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full min-w-[1150px] text-left text-sm">
          <thead className="bg-subtle border-b border-border text-xs text-muted-foreground font-medium">
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
          <tbody className="divide-y divide-border">
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            )}
            {filteredOrders.map((order) => {
              const expanded = expandedId === order.id;
              return (
                <Fragment key={order.id}>
                  <tr className={cn("align-top transition hover:bg-subtle/60", expanded && "bg-subtle/60")}>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : order.id)}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? "Hide" : "Show"} details for order ${orderNo(order.id)}`}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground/80 transition hover:bg-muted hover:text-foreground/85"
                      >
                        <ChevronDown size={14} className={cn("transition-transform", expanded && "rotate-180")} />
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="block font-semibold text-foreground">{orderNo(order.id)}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {order.invoice_date ? `Inv. ${formatDate(order.invoice_date)}` : formatDate(order.created_at)}
                      </span>
                      {order.due_date && order.balance > 0 && (order.status === "transit" || order.status === "delivered") && (
                        <span
                          className={cn(
                            "block text-[11px] font-semibold",
                            new Date(order.due_date) < new Date(new Date().toDateString()) ? "text-danger-foreground" : "text-muted-foreground"
                          )}
                        >
                          Due {formatDate(order.due_date)}
                        </span>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {order.job_no && (
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground/85">Job {order.job_no}</span>
                        )}
                        {(order.enquiry_id ?? order.origin_enquiry_id) && (
                          <Link
                            href={enquiryHref(role, (order.enquiry_id ?? order.origin_enquiry_id)!)}
                            title="Open enquiry"
                            className="rounded bg-warning-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold text-warning-foreground transition hover:bg-warning-soft hover:underline"
                          >
                            {enquiryRef((order.enquiry_id ?? order.origin_enquiry_id)!)}
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-foreground">{order.client?.name ?? "—"}</td>
                    <td className="px-3 py-3 font-medium text-foreground/85">{order.createdBy?.name ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span className="block text-xs font-semibold text-primary">
                        {titleCase(order.mode)} · {titleCase(order.payment_mode)}
                      </span>
                      <span className="flex items-center gap-1 text-foreground">
                        {order.from} <ArrowRight size={12} className="text-muted-foreground/80" /> {order.to}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-foreground">{formatAmount(order.amount)}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-between gap-2 text-xs tabular-nums">
                        <span className="font-semibold text-success-foreground">{formatAmount(order.paid_amount)}</span>
                        <span className={cn("font-semibold", order.balance > 0 ? "text-warning-foreground" : "text-muted-foreground/80")}>
                          {order.balance > 0 ? `${formatAmount(order.balance)} due` : "Paid"}
                        </span>
                      </div>
                      <PaidBar order={order} />
                    </td>
                    <td className="px-3 py-3">
                      <OrderStatusBadge status={order.status} />
                      {order.closed_reason && (
                        <span className="mt-1 block max-w-[180px] truncate text-[11px] text-muted-foreground" title={order.closed_reason}>
                          {order.closed_reason}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-end gap-1.5">
                        <OrderActions order={order} role={role} onDone={flash} />
                        {canRecordPayment(order) && (order.status === "transit" || order.status === "delivered") && order.balance > 0 && (
                          <button
                            type="button"
                            onClick={() => openPayment(order)}
                            className={buttonVariants({ size: "sm" })}
                          >
                            <Plus size={11} />
                            Add payment
                          </button>
                        )}
                        {detailBasePath && (
                          <Link
                            href={`${detailBasePath}/${order.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
                          >
                            Open <ExternalLink size={11} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expanded && (
                    <tr className="bg-subtle/60">
                      <td />
                      <td colSpan={colCount - 1} className="px-3 pb-4 pt-1">
                        <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
                          <div className="space-y-1 text-xs">
                            <p className="font-semibold text-muted-foreground/80">Description</p>
                            <p className="text-foreground/85">{order.description || "—"}</p>
                          </div>
                          <div>
                            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/80">
                              <Wallet size={12} /> Payment collection
                            </p>
                            <ul className="divide-y divide-border rounded-card border border-border bg-card text-xs">
                              <li className="flex items-center justify-between px-3 py-2">
                                <span className="text-foreground/70">Advance (at order)</span>
                                <span className="font-semibold tabular-nums text-foreground">{formatAmount(order.advance_amount)}</span>
                              </li>
                              {order.payments.map((p) => (
                                <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                                  <span className="text-foreground/70">
                                    {formatDate(p.paid_on)} · {titleCase(p.method)}
                                    {p.reference ? ` · ${p.reference}` : ""}
                                    <span className="block text-[10px] text-muted-foreground/80">recorded by {p.recorded_by}</span>
                                  </span>
                                  <span className="font-semibold tabular-nums text-success-foreground">{formatAmount(p.amount)}</span>
                                </li>
                              ))}
                              <li className="flex items-center justify-between bg-subtle px-3 py-2 font-semibold">
                                <span className="text-foreground/85">Balance due</span>
                                <span className={cn("tabular-nums", order.balance > 0 ? "text-warning-foreground" : "text-success-foreground")}>{formatAmount(order.balance)}</span>
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
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} pending={isNavigating} noun="orders" onPage={(p) => set({ page: p })} />
      </div>

      {/* Add payment */}
      <Modal onClose={() => setPaymentFor(null)} open={!!paymentFor}>
        <form onSubmit={submitPayment} className="space-y-4">
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Add payment · {paymentFor && orderNo(paymentFor.id)}</h3>
              <p className="text-xs text-muted-foreground">
                {paymentFor?.client?.name} · balance due {paymentFor && formatAmount(paymentFor.balance)}
              </p>
            </div>
            <button type="button" onClick={() => setPaymentFor(null)} aria-label="Close" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
              <X size={16} />
            </button>
          </div>
          {paymentError && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs font-medium text-danger-foreground">{paymentError}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Amount" type="number" min="0.01" step="0.01" max={paymentFor?.balance} required value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
            <Input label="Payment date" type="date" required value={payment.paid_on} onChange={(e) => setPayment({ ...payment, paid_on: e.target.value })} />
            <label htmlFor="pay-method" className="block text-sm font-medium text-foreground/85">
              <span className="mb-1 block">Method</span>
              <select
                id="pay-method"
                value={payment.method}
                onChange={(e) => setPayment({ ...payment, method: e.target.value })}
                className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 w-full cursor-pointer"
              >
                {orderPaymentMethods.map((m) => (
                  <option key={m} value={m}>{titleCase(m)}</option>
                ))}
              </select>
            </label>
            <Input label="Reference (optional)" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} placeholder="Receipt / txn no" />
          </div>
          <Input label="Notes (optional)" value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} />
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <button type="button" onClick={() => setPaymentFor(null)} className="cursor-pointer rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground/70 transition hover:bg-subtle">
              Cancel
            </button>
            <button type="submit" disabled={savingPayment} className={buttonVariants({ size: "sm" })}>
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
