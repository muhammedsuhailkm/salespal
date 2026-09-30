import Link from "next/link";
import { AlertTriangle, ArrowRight, ClipboardList, Clock, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { PastDueTable } from "@/components/accountant/PastDueTable";
import { DEFAULT_CREDIT_DAYS, getAccountantDashboard } from "@/lib/accountant-dashboard";
import { cn, formatAmount, formatDate, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

const orderNo = (id: number) => `#${String(id).padStart(5, "0")}`;

export default async function AccountantDashboardPage() {
  const { pending, pastDue, newEnquiries, totals } = await getAccountantDashboard();

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Receivables, overdue payments and enquiries waiting for conversion." />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link href="/dashboard/accountant/orders" className="rounded-3xl transition hover:-translate-y-0.5 hover:shadow-md">
          <StatCard icon={Wallet} label="Pending payments" value={formatAmount(totals.outstanding)} badgeLabel={`${pending.length} orders`} badgeDirection="flat" theme={{ bg: "bg-blue-600" }} />
        </Link>
        <a href="#past-due" className="rounded-3xl transition hover:-translate-y-0.5 hover:shadow-md">
          <StatCard
            icon={AlertTriangle}
            label="Past due"
            value={formatAmount(totals.pastDue)}
            badgeLabel={`${pastDue.length} orders`}
            badgeDirection={pastDue.length > 0 ? "up" : "flat"}
            theme={{ bg: pastDue.length > 0 ? "bg-red-600" : "bg-slate-700" }}
          />
        </a>
        <Link href="/dashboard/accountant/enquiries" className="rounded-3xl transition hover:-translate-y-0.5 hover:shadow-md">
          <StatCard icon={ClipboardList} label="New enquiries" value={newEnquiries.length} badgeLabel="to convert" badgeDirection="flat" theme={{ bg: "bg-violet-600" }} />
        </Link>
        <StatCard icon={Clock} label="Collected this month" value={formatAmount(totals.collectedThisMonth)} theme={{ bg: "bg-teal-600" }} />
      </div>

      {/* Past due */}
      <div id="past-due" className="scroll-mt-4">
        <SectionCard
          title="Past due payments"
          subtitle={`Uses the due date set at conversion; otherwise order date + credit days (${DEFAULT_CREDIT_DAYS} for credit orders without one, cash/card due on the order date)`}
          icon={AlertTriangle}
          iconClassName="text-red-500"
          href="/dashboard/accountant/orders"
        >
          <PastDueTable orders={pastDue} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending payment orders */}
        <SectionCard
          title="Pending payment orders"
          subtitle={`${pending.length} orders with a balance, by due date`}
          href="/dashboard/accountant/orders"
          className="flex flex-col lg:h-[460px]"
          bodyClassName="min-h-0 flex-1 overflow-y-auto -mx-2 px-2"
        >
          {pending.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">All orders are fully paid.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pending.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {o.client_name} <span className="font-normal text-slate-400">· {orderNo(o.id)}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {o.salesman} · {titleCase(o.payment_mode)} ·{" "}
                      <span className={cn(o.days_overdue > 0 ? "font-semibold text-red-600" : "text-slate-500")}>
                        {o.days_overdue > 0 ? `${o.days_overdue}d overdue` : `due ${formatDate(o.due_date)}`}
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-amber-700">{formatAmount(o.balance)}</p>
                    <p className="text-[11px] tabular-nums text-slate-400">of {formatAmount(o.amount)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* New enquiries */}
        <SectionCard
          title="New enquiries"
          subtitle="Open enquiries waiting to be converted to orders"
          href="/dashboard/accountant/enquiries"
          className="flex flex-col lg:h-[460px]"
          bodyClassName="min-h-0 flex-1 overflow-y-auto -mx-2 px-2"
        >
          {newEnquiries.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No open enquiries.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {newEnquiries.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {e.client_name} <span className="font-mono text-xs font-normal text-slate-400">· {e.ref}</span>
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                      <span className="font-bold uppercase text-indigo-600">{e.mode}</span> {e.from} <ArrowRight size={11} /> {e.to} · {e.created_by}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-slate-900">{formatAmount(e.provisional_value)}</p>
                    <p className="text-[11px] text-slate-400">{formatDate(e.enquiry_date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
