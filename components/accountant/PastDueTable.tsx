"use client";

import { useState } from "react";
import { BellRing, Check, Loader2, Mail, MessageCircle } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { cn, formatAmount, formatDate } from "@/lib/utils";
import type { ReceivableOrder } from "@/lib/accountant-dashboard";

const orderNo = (id: number) => `#${String(id).padStart(5, "0")}`;

function reminderText(o: ReceivableOrder) {
  return `Dear ${o.client_name},\n\nThis is a friendly reminder that payment of ${formatAmount(o.balance)} for order ${orderNo(o.id)}${
    o.job_no ? ` (Job ${o.job_no})` : ""
  } was due on ${formatDate(o.due_date)} and is now ${o.days_overdue} day${o.days_overdue === 1 ? "" : "s"} overdue.\n\nKindly arrange the payment at your earliest convenience.\n\nThank you.`;
}

export function PastDueTable({ orders }: { orders: ReceivableOrder[] }) {
  const [sending, setSending] = useState<number | null>(null);
  const [reminded, setReminded] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | undefined>();

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(undefined), 3000);
  }

  async function remindSalesman(order: ReceivableOrder) {
    setSending(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/reminder`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send reminder");
      setReminded((prev) => new Set(prev).add(order.id));
      flash(`Reminder task sent to ${data.salesman}`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Failed to send reminder");
    } finally {
      setSending(null);
    }
  }

  if (orders.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No past-due payments. 🎉</p>;
  }

  return (
    <>
      <div className="-mx-6 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-y border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-2.5">Order</th>
              <th className="px-3 py-2.5">Client</th>
              <th className="px-3 py-2.5">Salesman</th>
              <th className="px-3 py-2.5">Due</th>
              <th className="px-3 py-2.5 text-right">Balance</th>
              <th className="px-6 py-2.5 text-right">Send reminder</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => {
              const text = reminderText(o);
              const subject = `Payment reminder – order ${orderNo(o.id)}`;
              const phone = o.client_phone.replace(/\D/g, "");
              const done = reminded.has(o.id);
              return (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-6 py-3">
                    <span className="block font-bold text-slate-900">{orderNo(o.id)}</span>
                    {o.job_no && <span className="font-mono text-[10px] text-slate-500">Job {o.job_no}</span>}
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-800">{o.client_name}</td>
                  <td className="px-3 py-3 text-slate-600">{o.salesman}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="block text-slate-700">{formatDate(o.due_date)}</span>
                    <span
                      className={cn(
                        "text-[11px] font-bold",
                        o.days_overdue > 30 ? "text-red-600" : o.days_overdue > 7 ? "text-orange-600" : "text-amber-600"
                      )}
                    >
                      {o.days_overdue}d overdue
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums text-red-700">{formatAmount(o.balance)}</td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => remindSalesman(o)}
                        disabled={sending === o.id || done}
                        title="Create a follow-up task for the salesman"
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition disabled:cursor-default",
                          done ? "bg-emerald-50 text-emerald-700" : "bg-slate-900 text-white hover:bg-slate-800"
                        )}
                      >
                        {sending === o.id ? <Loader2 size={12} className="animate-spin" /> : done ? <Check size={12} /> : <BellRing size={12} />}
                        {done ? "Reminded" : "Salesman"}
                      </button>
                      {o.client_email && (
                        <a
                          href={`mailto:${o.client_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`}
                          title={`Email ${o.client_email}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Mail size={12} /> Email
                        </a>
                      )}
                      {phone && (
                        <a
                          href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`WhatsApp ${o.client_phone}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Toast message={toast} />
    </>
  );
}
