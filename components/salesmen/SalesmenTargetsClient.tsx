"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { History, Target, Users, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatAmount, formatDate } from "@/lib/utils";
import type { SalesmanTargetRow, SalesmanTargetView, TargetState } from "@/types/salesman-target";

import { buttonVariants } from "@/components/ui/Button";
const stateStyles: Record<TargetState, string> = {
  active: "bg-info-soft text-info-foreground ring-info/30",
  upcoming: "bg-primary-soft text-primary ring-primary/30",
  achieved: "bg-success-soft text-success-foreground ring-success/30",
  missed: "bg-danger-soft text-danger-foreground ring-danger/30",
  replaced: "bg-muted text-foreground/70 ring-border",
};

function StateBadge({ state }: { state: TargetState }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ring-1", stateStyles[state])}>
      {state}
    </span>
  );
}

function ProgressBar({ target }: { target: SalesmanTargetView }) {
  const width = Math.min(100, target.percent);
  const done = target.percent >= 100;
  return (
    <div className="min-w-[160px]">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-foreground">{formatAmount(target.achieved)}</span>
        <span className="font-semibold text-muted-foreground">{target.percent.toFixed(0)}%</span>
      </div>
      <div
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(width)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Target progress"
      >
        <div className={cn("h-full rounded-full transition-all", done ? "bg-success" : "bg-primary")} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

const PERIOD_OPTIONS = [
  { months: 1, label: "Monthly" },
  { months: 3, label: "Quarterly" },
  { months: 6, label: "6 months" },
  { months: 12, label: "Yearly" },
];

/** Period from the first day of `startMonth` (YYYY-MM) to the last day of the final month. */
function periodDates(startMonth: string, months: number) {
  const [year, month] = startMonth.split("-").map(Number);
  const end = new Date(Date.UTC(year, month - 1 + months, 0));
  return { period_start: `${startMonth}-01`, period_end: end.toISOString().slice(0, 10) };
}

function periodMonths(t: SalesmanTargetView) {
  const [sy, sm] = t.period_start.split("-").map(Number);
  const [ey, em] = t.period_end.split("-").map(Number);
  return (ey - sy) * 12 + (em - sm) + 1;
}

const period = (t: SalesmanTargetView) => `${formatDate(t.period_start)} – ${formatDate(t.period_end)}`;
const periodLabel = (t: SalesmanTargetView) =>
  PERIOD_OPTIONS.find((option) => option.months === periodMonths(t))?.label ?? `${periodMonths(t)} months`;

const currentMonth = () => new Date().toISOString().slice(0, 7);

export function SalesmenTargetsClient({
  salesmen,
  canAssign,
  kpiScores,
  salesmanHref,
  renderActions,
}: {
  salesmen: SalesmanTargetRow[];
  canAssign: boolean;
  /** When given, a KPI score column is shown. */
  kpiScores?: Record<number, number>;
  salesmanHref?: (id: number) => string;
  /** Extra per-row actions, rendered after Set target / History. */
  renderActions?: (row: SalesmanTargetRow) => React.ReactNode;
}) {
  const router = useRouter();
  const [assignFor, setAssignFor] = useState<SalesmanTargetRow | null>(null);
  const [historyFor, setHistoryFor] = useState<SalesmanTargetRow | null>(null);
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState(1);
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | undefined>();

  function openAssign(row: SalesmanTargetRow) {
    setAmount("");
    setMonths(1);
    setStartMonth(currentMonth());
    setError(null);
    setAssignFor(row);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignFor) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/salesman-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesman_id: assignFor.id, amount: Number(amount), ...periodDates(startMonth, months) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set target");
      setToast(`Target set for ${assignFor.name}`);
      setTimeout(() => setToast(undefined), 3000);
      setAssignFor(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (salesmen.length === 0) {
    return <EmptyState icon={Users} title="No salesmen yet" message="Salesmen on your team will appear here." />;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-subtle border-b border-border text-xs text-muted-foreground font-medium">
            <tr>
              <th className="px-5 py-3.5">Salesman</th>
              <th className="px-5 py-3.5">Clients</th>
              {kpiScores && <th className="px-5 py-3.5">KPI</th>}
              <th className="px-5 py-3.5 text-right" title="Actual profit from enquiries whose order is fully paid">Completed profit</th>
              <th className="px-5 py-3.5">Target</th>
              <th className="px-5 py-3.5">Period</th>
              <th className="px-5 py-3.5">Progress</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {salesmen.map((row) => (
              <tr key={row.id} className="transition duration-150 hover:bg-subtle/50">
                <td className="px-5 py-4">
                  {salesmanHref ? (
                    <Link href={salesmanHref(row.id)} className="font-semibold text-foreground transition hover:text-primary hover:underline">
                      {row.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-foreground">{row.name}</span>
                  )}
                  <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground/80">{row.email}</span>
                </td>
                <td className="px-5 py-4 font-semibold text-foreground/85">{row.clientCount}</td>
                {kpiScores && <td className="px-5 py-4 font-semibold text-foreground">{kpiScores[row.id] ?? 0}</td>}
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <span className={cn("block font-semibold", row.completedProfit.profit < 0 ? "text-danger-foreground" : "text-success-foreground")}>
                    {formatAmount(row.completedProfit.profit)}
                  </span>
                  <span className="block text-[11px] text-muted-foreground/80">
                    {row.completedProfit.count} completed enquir{row.completedProfit.count === 1 ? "y" : "ies"}
                  </span>
                </td>
                {row.current ? (
                  <>
                    <td className="px-5 py-4 font-semibold text-foreground">{formatAmount(row.current.amount)}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="block font-semibold text-foreground">{periodLabel(row.current)}</span>
                      <span className="block text-[11px] text-muted-foreground">{period(row.current)}</span>
                    </td>
                    <td className="px-5 py-4"><ProgressBar target={row.current} /></td>
                    <td className="px-5 py-4"><StateBadge state={row.current.state} /></td>
                  </>
                ) : (
                  <td colSpan={4} className="px-5 py-4 text-xs italic text-muted-foreground/80">No active target</td>
                )}
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    {canAssign && (
                      <button
                        onClick={() => openAssign(row)}
                        className={buttonVariants({ size: "sm" })}
                      >
                        <Target size={13} />
                        <span>Set target</span>
                      </button>
                    )}
                    <button
                      onClick={() => setHistoryFor(row)}
                      className={buttonVariants({ variant: "secondary", size: "sm" })}
                    >
                      <History size={13} />
                      <span>History</span>
                    </button>
                    {renderActions?.(row)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Set target */}
      <Modal onClose={() => setAssignFor(null)} open={!!assignFor}>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Set target for {assignFor?.name}</h3>
              <p className="text-xs text-muted-foreground">
                A new target replaces any existing target that overlaps its period. The old one stays in history.
              </p>
            </div>
            <button type="button" onClick={() => setAssignFor(null)} aria-label="Close" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
              <X size={16} />
            </button>
          </div>
          {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs font-medium text-danger-foreground">{error}</p>}
          <Input label="Target amount" type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-foreground/85" htmlFor="target-period">
              <span className="mb-1 block">Period</span>
              <Select id="target-period" className="w-full" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.months} value={option.months}>{option.label}</option>
                ))}
              </Select>
            </label>
            <Input label="Starting month" type="month" required min={currentMonth()} value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
          </div>
          {startMonth && (
            <p className="text-xs text-muted-foreground">
              Runs {formatDate(periodDates(startMonth, months).period_start)} – {formatDate(periodDates(startMonth, months).period_end)}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setAssignFor(null)} className="cursor-pointer rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground/85 transition hover:bg-subtle">
              Cancel
            </button>
            <button type="submit" disabled={saving} className={buttonVariants({ size: "sm" })}>
              {saving ? "Saving…" : "Save target"}
            </button>
          </div>
        </form>
      </Modal>

      {/* History */}
      <Modal onClose={() => setHistoryFor(null)} open={!!historyFor}>
        <div className="space-y-4">
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Target history · {historyFor?.name}</h3>
              <p className="text-xs text-muted-foreground">Progress counts the salesman's orders (excluding cancelled or sent back for revision) created in each period.</p>
            </div>
            <button onClick={() => setHistoryFor(null)} aria-label="Close" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
              <X size={16} />
            </button>
          </div>
          {historyFor && historyFor.history.length === 0 ? (
            <p className="py-6 text-center text-xs italic text-muted-foreground/80">No targets have been set yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {historyFor?.history.map((t) => (
                <li key={t.id} className="space-y-2 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">{formatAmount(t.amount)}</span>
                    <StateBadge state={t.state} />
                  </div>
                  <p className="text-xs text-muted-foreground">{periodLabel(t)} · {period(t)} · set by {t.set_by} on {formatDate(t.created_at)}</p>
                  <ProgressBar target={t} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <Toast message={toast} />
    </>
  );
}
