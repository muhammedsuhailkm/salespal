"use client";

import { useState } from "react";
import { BellRing, Check, Mail, MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { Toast } from "@/components/ui/Toast";
import { useDebouncedParam, useUrlFilters } from "@/hooks/useUrlFilters";
import { cn, formatAmount, formatDate } from "@/lib/utils";
import type { PastDuePage, ReceivableOrder } from "@/lib/accountant-dashboard";

const orderNo = (id: number) => `#${String(id).padStart(5, "0")}`;

function reminderText(o: ReceivableOrder) {
  return `Dear ${o.client_name},\n\nThis is a friendly reminder that payment of ${formatAmount(o.balance)} for order ${orderNo(o.id)}${
    o.job_no ? ` (Job ${o.job_no})` : ""
  } was due on ${formatDate(o.due_date)} and is now ${o.days_overdue} day${o.days_overdue === 1 ? "" : "s"} overdue.\n\nKindly arrange the payment at your earliest convenience.\n\nThank you.`;
}

const overdueClass = (days: number) =>
  days > 30 ? "bg-danger-soft text-danger-foreground" : days > 7 ? "bg-warning-soft text-warning-foreground" : "bg-muted text-muted-foreground";

function ReminderActions({ o, done, sending, onRemind }: { o: ReceivableOrder; done: boolean; sending: boolean; onRemind: () => void }) {
  const text = reminderText(o);
  const subject = `Payment reminder – order ${orderNo(o.id)}`;
  const phone = o.client_phone.replace(/\D/g, "");
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button
        size="sm"
        variant={done ? "soft" : "primary"}
        onClick={onRemind}
        loading={sending}
        disabled={done}
        title="Create a follow-up task for the salesman"
        className="disabled:opacity-100"
      >
        {!sending && (done ? <Check /> : <BellRing />)}
        {done ? "Reminded" : "Salesman"}
      </Button>
      {o.client_email && (
        <Button asChild size="sm" variant="secondary">
          <a href={`mailto:${o.client_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`} title={`Email ${o.client_email}`}>
            <Mail /> Email
          </a>
        </Button>
      )}
      {phone && (
        <Button asChild size="sm" variant="secondary">
          <a href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" title={`WhatsApp ${o.client_phone}`}>
            <MessageCircle /> WhatsApp
          </a>
        </Button>
      )}
    </div>
  );
}

/** Search + page live in the URL (pd_q, pd_page) so the server pages through every past-due order. */
export function PastDueTable({ data }: { data: PastDuePage }) {
  const { get, set, isPending } = useUrlFilters();
  const [search, setSearch] = useDebouncedParam("pd_q", (u) => set({ ...u, pd_page: null }), get("pd_q"));
  const [sending, setSending] = useState<number | null>(null);
  const [reminded, setReminded] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | undefined>();
  const orders = data.rows;

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

  if (data.total === 0 && !search && !get("pd_q")) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No past-due payments. 🎉</p>;
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client, salesman, job or order no..."
          aria-label="Search past-due payments"
          className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 w-full pl-9 pr-3"
        />
      </div>

      <div className={cn("transition-opacity", isPending && "opacity-60")} aria-busy={isPending}>
        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No past-due payments match “{search}”.</p>
        ) : (
          <>
            {/* Table (md+) */}
            <div className="-mx-6 hidden md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-y border-border bg-subtle text-xs font-medium text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-[17%] py-2.5 pl-6 pr-3 font-medium">Order</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Client</th>
                    <th scope="col" className="w-[17%] px-3 py-2.5 font-medium">Due</th>
                    <th scope="col" className="w-[17%] px-3 py-2.5 text-right font-medium">Balance</th>
                    <th scope="col" className="w-[150px] py-2.5 pl-3 pr-6 text-right font-medium xl:w-[300px]">Send reminder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((o) => (
                    <tr key={o.id} className="align-top transition-colors hover:bg-subtle">
                      <td className="py-3 pl-6 pr-3">
                        <span className="block font-mono text-[13px] font-semibold text-foreground">{orderNo(o.id)}</span>
                        {o.job_no && <span className="block truncate font-mono text-[11px] text-muted-foreground">Job {o.job_no}</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className="block truncate font-medium text-foreground">{o.client_name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{o.salesman}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block text-foreground">{formatDate(o.due_date)}</span>
                        <span className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums", overdueClass(o.days_overdue))}>
                          {o.days_overdue}d overdue
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-danger-foreground">{formatAmount(o.balance)}</td>
                      <td className="py-3 pl-3 pr-6">
                        <ReminderActions o={o} done={reminded.has(o.id)} sending={sending === o.id} onRemind={() => remindSalesman(o)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards (phones) */}
            <ul className="space-y-2.5 md:hidden">
              {orders.map((o) => (
                <li key={o.id} className="rounded-control border border-border p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{o.client_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{orderNo(o.id)}</span>
                        {o.job_no && <> · Job {o.job_no}</>} · {o.salesman}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-danger-foreground">{formatAmount(o.balance)}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    Due {formatDate(o.due_date)}
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums", overdueClass(o.days_overdue))}>
                      {o.days_overdue}d overdue
                    </span>
                  </div>
                  <div className="mt-3">
                    <ReminderActions o={o} done={reminded.has(o.id)} sending={sending === o.id} onRemind={() => remindSalesman(o)} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} pending={isPending} noun="past-due orders" onPage={(p) => set({ pd_page: p })} />
      </div>
      <Toast message={toast} />
    </div>
  );
}
