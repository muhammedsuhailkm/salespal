"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ClipboardList, Package, Receipt, TrendingUp, Wallet } from "lucide-react";
import { KpiTile } from "@/components/shared/KpiTile";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { cn, formatAmount, formatCompact, formatDate, formatPercent } from "@/lib/utils";
import { enquiryStatuses, enquiryStatusLabels } from "@/types/enquiry";
import type { ClientHistory as History } from "@/lib/client-history";
import { enquiryHref, orderHref, orderNo, type AppRole } from "@/lib/record-links";


/** Order / enquiry reference: a link when the role has a page for it, plain text otherwise. */
function RecordLink({ href, children, className }: { href: string | null; children: React.ReactNode; className?: string }) {
  return href ? (
    <Link href={href} className={cn("font-mono hover:text-primary hover:underline", className)}>
      {children}
    </Link>
  ) : (
    <span className={cn("font-mono", className)}>{children}</span>
  );
}

function Route({ mode, from, to }: { mode: string; from: string; to: string }) {
  return (
    <>
      <span className="block text-xs font-semibold text-muted-foreground">{mode}</span>
      <span className="flex min-w-0 items-center gap-1 text-foreground">
        <span className="truncate">{from}</span>
        <ArrowRight size={12} className="shrink-0 text-muted-foreground" aria-label="to" />
        <span className="truncate">{to}</span>
      </span>
    </>
  );
}

const th = "px-4 py-2.5 font-medium";

/**
 * Client money summary + paginated Orders / Enquiries tables.
 * Tab and pages live in the URL (c_tab, o_page, e_page) so the server pages through everything.
 */
export function ClientHistory({ data, role }: { data: History; role: AppRole }) {
  const { get, set, isPending } = useUrlFilters();
  const tab = get("c_tab") === "enquiries" ? "enquiries" : "orders";
  const s = data.summary;

  const tabs = [
    { value: "orders", label: "Orders", count: data.orders.total },
    { value: "enquiries", label: "Enquiries", count: data.enquiries.total },
  ] as const;

  return (
    <section className="space-y-4" aria-label="Orders and enquiries">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icon={Package}
          label="Total orders"
          value={formatAmount(s.value)}
          meta={`${s.orders} order${s.orders === 1 ? "" : "s"}`}
          definition={`Value of orders not cancelled or sent for revision. Average ${formatCompact(s.averageOrder)} per order.`}
        />
        <KpiTile
          icon={Wallet}
          label="Collected"
          tone="success"
          value={formatAmount(s.paid)}
          meta={s.value > 0 ? formatPercent((s.paid / s.value) * 100) : undefined}
          definition="Payments recorded against this client's orders, advances included."
        />
        <KpiTile
          icon={Receipt}
          label="Outstanding"
          tone={s.overdue > 0 ? "danger" : "warning"}
          value={formatAmount(s.outstanding)}
          meta={s.overdueCount ? `${s.overdueCount} overdue` : undefined}
          definition={s.overdue > 0 ? `Still to be paid, of which ${formatAmount(s.overdue)} is past its due date.` : "Amount still to be paid across this client's orders."}
        />
        <KpiTile
          icon={TrendingUp}
          label="Profit"
          tone="info"
          value={formatAmount(s.profit)}
          meta={s.winRate !== null ? `${formatPercent(s.winRate)} win rate` : undefined}
          definition="Actual profit where accounts entered it, otherwise the quoted profit, on counted orders."
        />
      </div>

      {/* Facts strip */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-card border border-border bg-card px-5 py-4 text-sm shadow-card sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["First order", s.firstOrder ? formatDate(s.firstOrder) : "—"],
          ["Last order", s.lastOrder ? formatDate(s.lastOrder) : "—"],
          ["Open orders", String(s.open)],
          ["Completed", String(s.completed)],
          ["Active enquiries", String(s.activeEnquiries)],
          ["Lost enquiries", String(s.enquiries.lost)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Tables */}
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex gap-1 rounded-control bg-muted p-1" role="tablist" aria-label="Client history">
            {tabs.map((t) => (
              <button
                key={t.value}
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => set({ c_tab: t.value === "orders" ? null : t.value })}
                className={cn(
                  "cursor-pointer rounded-[8px] px-3 py-1.5 text-xs font-semibold transition",
                  tab === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label} <span className="ml-0.5 text-muted-foreground">{t.count}</span>
              </button>
            ))}
          </div>
          {tab === "enquiries" && s.enquiryTotal > 0 && (
            <p className="text-xs text-muted-foreground">
              {enquiryStatuses
                .filter((st) => s.enquiries[st] > 0)
                .map((st) => `${enquiryStatusLabels[st]} ${s.enquiries[st]}`)
                .join(" · ")}
            </p>
          )}
        </div>

        <div className={cn("transition-opacity", isPending && "opacity-60")} aria-busy={isPending}>
          {tab === "orders" ? (
            data.orders.total === 0 ? (
              <Empty icon={Package} text="No orders yet. Orders appear here once an enquiry is confirmed." />
            ) : (
              <>
                {/* Table (md+) */}
                <table className="hidden w-full table-fixed text-left text-sm md:table">
                  <thead className="border-b border-border bg-subtle text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className={cn(th, "w-[18%] pl-5")}>Order</th>
                      <th scope="col" className={th}>Route</th>
                      <th scope="col" className={cn(th, "w-[15%]")}>Status</th>
                      <th scope="col" className={cn(th, "hidden w-[15%] lg:table-cell")}>Invoice / due</th>
                      <th scope="col" className={cn(th, "w-[14%] text-right")}>Amount</th>
                      <th scope="col" className={cn(th, "w-[15%] pr-5 text-right")}>Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.orders.rows.map((o) => (
                      <tr key={o.id} className="align-top transition-colors hover:bg-subtle">
                        <td className="py-3 pl-5 pr-4">
                          <RecordLink href={orderHref(role, o.id)} className="text-[13px] font-semibold text-foreground">
                            {orderNo(o.id)}
                          </RecordLink>
                          <span className="block truncate text-xs text-muted-foreground">{formatDate(o.created_at)}</span>
                          {o.job_no && <span className="block truncate font-mono text-[11px] text-muted-foreground">Job {o.job_no}</span>}
                          {o.enquiry_id && (
                            <RecordLink href={enquiryHref(role, o.enquiry_id)} className="block truncate text-[11px] text-muted-foreground">
                              {o.enquiry_ref}
                            </RecordLink>
                          )}
                        </td>
                        <td className="px-4 py-3"><Route {...o} /></td>
                        <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                        <td className="hidden px-4 py-3 text-xs lg:table-cell">
                          <span className="block text-foreground">{o.invoice_date ? formatDate(o.invoice_date) : "—"}</span>
                          <span className={cn("block", o.overdue ? "font-medium text-danger-foreground" : "text-muted-foreground")}>
                            {o.due_date ? `Due ${formatDate(o.due_date)}` : "No due date"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="block font-medium text-foreground">{formatAmount(o.amount)}</span>
                          <span className="block text-xs text-muted-foreground">Paid {formatAmount(o.paid)}</span>
                        </td>
                        <td className={cn("py-3 pl-4 pr-5 text-right font-semibold tabular-nums", o.overdue ? "text-danger-foreground" : o.balance > 0 ? "text-foreground" : "text-muted-foreground")}>
                          {o.balance > 0 ? formatAmount(o.balance) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Cards (phones) */}
                <ul className="divide-y divide-border md:hidden">
                  {data.orders.rows.map((o) => (
                    <li key={o.id} className="space-y-1.5 px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[13px] font-semibold text-foreground">{orderNo(o.id)}</span>
                        <OrderStatusBadge status={o.status} />
                      </div>
                      <div className="text-sm"><Route {...o} /></div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                        <span>{formatDate(o.created_at)}</span>
                        <span>
                          {formatAmount(o.amount)}
                          {o.balance > 0 && <span className={cn("ml-1.5 font-semibold", o.overdue ? "text-danger-foreground" : "text-foreground")}>· {formatAmount(o.balance)} due</span>}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : data.enquiries.total === 0 ? (
            <Empty icon={ClipboardList} text="No enquiries raised for this client yet." />
          ) : (
            <>
              <table className="hidden w-full table-fixed text-left text-sm md:table">
                <thead className="border-b border-border bg-subtle text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className={cn(th, "w-[18%] pl-5")}>Enquiry</th>
                    <th scope="col" className={th}>Route</th>
                    <th scope="col" className={cn(th, "w-[17%]")}>Status</th>
                    <th scope="col" className={cn(th, "hidden w-[15%] lg:table-cell")}>Raised by</th>
                    <th scope="col" className={cn(th, "w-[16%] pr-5 text-right")}>Cost / profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.enquiries.rows.map((e) => (
                    <tr key={e.id} className="align-top transition-colors hover:bg-subtle">
                      <td className="py-3 pl-5 pr-4">
                        <RecordLink href={enquiryHref(role, e.id)} className="block text-[13px] font-semibold text-foreground">
                          {e.ref}
                        </RecordLink>
                        <span className="block text-xs text-muted-foreground">{formatDate(e.enquiry_date)}</span>
                      </td>
                      <td className="px-4 py-3"><Route {...e} /></td>
                      <td className="px-4 py-3">
                        <StatusBadge status={e.status} />
                        {e.order_id && (
                          <RecordLink href={orderHref(role, e.order_id)} className="mt-1 block text-[11px] text-muted-foreground">
                            Order {orderNo(e.order_id)}
                          </RecordLink>
                        )}
                        {e.lost_reason && <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground" title={e.lost_reason}>{e.lost_reason}</span>}
                      </td>
                      <td className="hidden truncate px-4 py-3 text-muted-foreground lg:table-cell">{e.created_by}</td>
                      <td className="py-3 pl-4 pr-5 text-right tabular-nums">
                        {e.cost === null ? (
                          <span className="text-xs text-muted-foreground">Not quoted</span>
                        ) : (
                          <>
                            <span className="block font-medium text-foreground">{formatAmount(e.cost)}</span>
                            <span className="block text-xs text-muted-foreground">{formatAmount(e.profit ?? 0)}</span>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-border md:hidden">
                {data.enquiries.rows.map((e) => (
                  <li key={e.id} className="space-y-1.5 px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[13px] font-semibold text-foreground">{e.ref}</span>
                      <StatusBadge status={e.status} />
                    </div>
                    <div className="text-sm"><Route {...e} /></div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                      <span>{formatDate(e.enquiry_date)}</span>
                      <span>{e.cost === null ? "Not quoted" : `${formatAmount(e.cost)} / ${formatAmount(e.profit ?? 0)}`}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {(tab === "orders" ? data.orders.total : data.enquiries.total) > 0 && (
          <div className="border-t border-border px-5 py-3">
            {tab === "orders" ? (
              <Pagination page={data.orders.page} pageSize={data.orders.pageSize} total={data.orders.total} pending={isPending} noun="orders" onPage={(p) => set({ o_page: p > 1 ? p : null, page: null })} />
            ) : (
              <Pagination page={data.enquiries.page} pageSize={data.enquiries.pageSize} total={data.enquiries.total} pending={isPending} noun="enquiries" onPage={(p) => set({ e_page: p > 1 ? p : null, page: null })} />
            )}
          </div>
        )}
      </div>

      {s.overdue > 0 && (
        <p role="status" className="flex items-center gap-2 rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger-foreground">
          <AlertTriangle size={15} className="shrink-0" aria-hidden />
          {formatAmount(s.overdue)} across {s.overdueCount} order{s.overdueCount === 1 ? " is" : "s are"} past due.
        </p>
      )}
    </section>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Package; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon size={18} aria-hidden />
      </span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
