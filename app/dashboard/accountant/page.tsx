import { AlertTriangle, ArrowRight, ClipboardList, Clock, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiTile } from "@/components/shared/KpiTile";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { PastDueTable } from "@/components/accountant/PastDueTable";
import { AccountantCompanyChips, NoAssignedCompanies } from "@/components/accountant/AccountantCompanies";
import { DEFAULT_CREDIT_DAYS, getAccountantCompanies, getAccountantDashboard, getPastDuePage } from "@/lib/accountant-dashboard";
import { intParam, param, type SearchParams } from "@/lib/list-params";
import { getSalesPalSession } from "@/lib/auth";
import { cn, formatAmount, formatDate, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

const orderNo = (id: number) => `#${String(id).padStart(5, "0")}`;

export default async function AccountantDashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const session = await getSalesPalSession();
  const companies = await getAccountantCompanies(Number(session!.user.id));
  const header = (
    <PageHeader
      title="Dashboard"
      subtitle="Receivables, overdue payments and confirmed orders waiting for details."
      action={<AccountantCompanyChips companies={companies} />}
    />
  );

  if (companies.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <NoAssignedCompanies />
      </div>
    );
  }

  const orgIds = companies.map((c) => c.id);
  const [{ pending, awaitingDetails, counts, totals }, pastDue] = await Promise.all([
    getAccountantDashboard(orgIds),
    getPastDuePage(orgIds, { q: param(params, "pd_q"), page: intParam(params, "pd_page") ?? 1 }),
  ]);

  return (
    <div className="space-y-6">
      {header}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          href="/dashboard/accountant/orders"
          icon={Wallet}
          label="Pending payments"
          value={formatAmount(totals.outstanding)}
          meta={`${counts.pending} orders`}
          definition="Unpaid balance on every active or completed order in your companies (not cancelled or sent back), whether due yet or not."
        />
        <KpiTile
          href="#past-due"
          icon={AlertTriangle}
          tone={counts.pastDue > 0 ? "danger" : "neutral"}
          label="Past due"
          value={formatAmount(totals.pastDue)}
          meta={`${counts.pastDue} orders`}
          definition="The part of pending payments whose due date has already passed."
        />
        <KpiTile
          href="/dashboard/accountant/orders?status=transit"
          icon={ClipboardList}
          tone="info"
          label="Awaiting details"
          value={counts.awaitingDetails.toLocaleString()}
          meta="orders"
          definition="Confirmed orders in transit that still need a job no, actual cost / profit and invoice date."
        />
        <KpiTile
          icon={Clock}
          tone="success"
          label="Collected this month"
          value={formatAmount(totals.collectedThisMonth)}
          definition="Payments recorded since the 1st, plus advances on orders created this month."
        />
      </div>

      {/* Past due */}
      <div id="past-due" className="scroll-mt-4">
        <SectionCard
          title="Past due payments"
          subtitle={`Uses the due date set at conversion; otherwise order date + credit days (${DEFAULT_CREDIT_DAYS} for credit orders without one, cash/card due on the order date)`}
          icon={AlertTriangle}
          iconClassName="text-danger-foreground"
          href="/dashboard/accountant/orders"
        >
          <PastDueTable data={pastDue} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending payment orders */}
        <SectionCard
          title="Pending payment orders"
          subtitle={`${counts.pending} orders with a balance, by due date${counts.pending > pending.length ? ` · first ${pending.length} shown` : ""}`}
          href="/dashboard/accountant/orders"
          className="flex flex-col lg:h-[460px]"
          bodyClassName="min-h-0 flex-1 overflow-y-auto -mx-2 px-2"
        >
          {pending.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground/80">All orders are fully paid.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pending.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {o.client_name} <span className="font-normal text-muted-foreground/80">· {orderNo(o.id)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.salesman} · {titleCase(o.payment_mode)} ·{" "}
                      <span className={cn(o.days_overdue > 0 ? "font-semibold text-danger-foreground" : "text-muted-foreground")}>
                        {o.days_overdue > 0 ? `${o.days_overdue}d overdue` : `due ${formatDate(o.due_date)}`}
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-warning-foreground">{formatAmount(o.balance)}</p>
                    <p className="text-[11px] tabular-nums text-muted-foreground/80">of {formatAmount(o.amount)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Orders awaiting details */}
        <SectionCard
          title="Orders awaiting details"
          subtitle={`${counts.awaitingDetails} confirmed orders without a job no yet, oldest first${counts.awaitingDetails > awaitingDetails.length ? ` · first ${awaitingDetails.length} shown` : ""}`}
          href="/dashboard/accountant/orders?status=transit"
          className="flex flex-col lg:h-[460px]"
          bodyClassName="min-h-0 flex-1 overflow-y-auto -mx-2 px-2"
        >
          {awaitingDetails.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground/80">Every confirmed order has its details.</p>
          ) : (
            <ul className="divide-y divide-border">
              {awaitingDetails.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {o.client_name} <span className="font-mono text-xs font-normal text-muted-foreground/80">· {o.ref}</span>
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <span className="font-semibold uppercase text-primary">{o.mode}</span> {o.from} <ArrowRight size={11} /> {o.to} · {o.created_by}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-foreground">{formatAmount(o.amount)}</p>
                    <p className="text-[11px] text-muted-foreground/80">{formatDate(o.created_on)}</p>
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
