"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderActions } from "@/components/orders/OrderActions";
import { formatAmount, formatDate, titleCase } from "@/lib/utils";
import { enquiryRef } from "@/types/enquiry";
import { enquiryHref } from "@/lib/record-links";
import type { OrderListItem } from "@/types/order";

import { buttonVariants } from "@/components/ui/Button";
export function OrderDetail({ order: initialOrder }: { order: OrderListItem }) {
  const order = initialOrder;
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {toastMsg && <Toast message={toastMsg} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            {order.client?.name ?? "Order"} — {order.from} <span className="text-muted-foreground/60">&rarr;</span> {order.to}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground font-semibold">
            {titleCase(order.mode)} • {titleCase(order.payment_mode)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/salesman/orders"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </Link>
          <OrderActions order={order} role="salesman" onDone={triggerToast} size="md" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <h2 className="text-base font-semibold text-foreground mb-5">Order Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">Status</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">Created</span>
                <span className="text-sm font-semibold text-foreground">{formatDate(order.created_at)}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">Job no / Invoice</span>
                <span className="text-sm font-semibold text-foreground">
                  {order.job_no ?? "Waiting for accounts"}
                  {order.invoice_date ? ` · ${formatDate(order.invoice_date)}` : ""}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">Enquiry</span>
                {order.enquiry_id ?? order.origin_enquiry_id ? (
                  <Link
                    href={enquiryHref("salesman", (order.enquiry_id ?? order.origin_enquiry_id)!)}
                    className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-primary hover:underline"
                  >
                    {enquiryRef((order.enquiry_id ?? order.origin_enquiry_id)!)} <ExternalLink size={12} aria-hidden />
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-foreground">—</span>
                )}
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">Route</span>
                <span className="text-sm font-semibold text-foreground">
                  {order.from} <span className="text-muted-foreground/60">&rarr;</span> {order.to}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">Mode / Payment</span>
                <span className="text-sm font-semibold text-foreground">
                  {titleCase(order.mode)} / {titleCase(order.payment_mode)}
                </span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">Amount</span>
                <span className="text-sm font-semibold text-foreground">{formatAmount(order.amount)}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">Advance</span>
                <span className="text-sm font-semibold text-success-foreground">{formatAmount(order.advance_amount)}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">Total collected</span>
                <span className="text-sm font-semibold text-success-foreground">{formatAmount(order.paid_amount)}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">Balance</span>
                <span className="text-sm font-semibold text-warning-foreground">{formatAmount(order.balance)}</span>
              </div>
            </div>
            {order.payments.length > 0 && (
              <div className="mt-6 border-t border-border pt-5">
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1.5">Payments collected</span>
                <ul className="divide-y divide-border rounded-lg border border-border text-xs">
                  {order.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="text-foreground/70">
                        {formatDate(p.paid_on)} · {titleCase(p.method)}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </span>
                      <span className="font-semibold tabular-nums text-success-foreground">{formatAmount(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {order.closed_reason && (
              <div className="mt-6 border-t border-border pt-5">
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1.5">
                  {order.status === "revision_requested" ? "Revision reason" : "Cancellation reason"}
                </span>
                <p className="text-sm text-foreground/85">{order.closed_reason}</p>
              </div>
            )}
            <div className="mt-6 border-t border-border pt-5">
              <span className="text-xs font-semibold text-muted-foreground/80 block mb-1.5">Description</span>
              <p className="text-xs text-foreground/70 leading-relaxed bg-subtle p-3 rounded-lg border border-border shadow-sm">
                {order.description}
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
