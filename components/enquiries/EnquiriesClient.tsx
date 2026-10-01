"use client";

import { useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { ClientPicker } from "@/components/clients/ClientPicker";
import { useDebouncedParam, useUrlFilters } from "@/hooks/useUrlFilters";
import type { EnquiryPage } from "@/lib/enquiries";
import { useRouter } from "next/navigation";
import { ArrowRight, Ban, BellRing, ClipboardList, Loader2, MessageSquareText, Plus, Repeat, X } from "lucide-react";
import { CancelEnquiryModal, FollowUpModal } from "@/components/enquiries/EnquiryFollowUpModals";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatAmount, formatDate, titleCase } from "@/lib/utils";
import {
  enquiryModes,
  enquiryPaymentModes,
  jobRefNames,
  jobRefs,
  type JobRef,
  incotermNames,
  incoterms,
  type Incoterm,
  type EnquiryListItem,
  type EnquiryStatus,
} from "@/types/enquiry";

const statusStyles: Record<EnquiryStatus, string> = {
  open: "bg-amber-50 text-amber-800 ring-amber-200",
  order_created: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

function StatusBadge({ status }: { status: EnquiryStatus }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ring-1", statusStyles[status])}>
      {titleCase(status)}
    </span>
  );
}

const fieldClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200";

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="block text-sm font-medium text-slate-700">
      <span className="mb-1 block">{label}</span>
      <select id={id} required={required} value={value} onChange={(e) => onChange(e.target.value)} className={cn(fieldClass, "cursor-pointer")}>
        {children}
      </select>
    </label>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  enquiry_date: today(),
  mode: "sea",
  from: "",
  to: "",
  job_ref: "",
  incoterm: "",
  payment_mode: "cash",
  credit_days: "",
  clearance: false,
  provisional_cost: "",
  provisional_profit: "",
  notes: "",
});

const FILTERS: { value: EnquiryStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "order_created", label: "Order created" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const daysOpen = (enquiryDate: string) => Math.max(0, Math.floor((Date.now() - new Date(`${enquiryDate}T00:00:00Z`).getTime()) / DAY_MS));

/** Server-paginated enquiries table. Status tab, search and page are URL params. */
export function EnquiriesClient({
  data,
  canCreate,
  canConvert,
  canFollowUp = false,
}: {
  data: EnquiryPage;
  canCreate: boolean;
  canConvert: boolean;
  /** Salesmen / managers: log follow-up comments and cancel open enquiries. */
  canFollowUp?: boolean;
}) {
  const router = useRouter();
  const { get, set, isPending } = useUrlFilters();
  const filter = (get("status") || "all") as EnquiryStatus | "all";
  const [search, setSearch] = useDebouncedParam("q", set, get("q"));
  const [toast, setToast] = useState<string | undefined>();
  const enquiries = data.rows;

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [client, setClient] = useState<{ id: number; name: string } | null>(null);

  const [convertFor, setConvertFor] = useState<EnquiryListItem | null>(null);
  const [conv, setConv] = useState({ job_no: "", actual_cost: "", actual_profit: "", advance_amount: "", invoice_date: "", credit_days: "", due_date: "" });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ?followUp=<id> (deep link from a follow-up task) opens that enquiry even if it is on another page.
  const [followUpId, setFollowUpId] = useState<number | null>(data.focus?.id ?? null);
  const followUpFor =
    followUpId === null ? null : enquiries.find((e) => e.id === followUpId) ?? (data.focus?.id === followUpId ? data.focus : null);
  const closeFollowUp = () => {
    setFollowUpId(null);
    if (get("followUp")) set({ followUp: null, page: get("page") || null });
  };
  const [cancelFor, setCancelFor] = useState<EnquiryListItem | null>(null);
  const followUpsDue = data.followUpsDue;

  const visible = enquiries;

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(undefined), 3000);
  }

  async function post(url: string, body: unknown) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!client) {
      setError("Select a client");
      return;
    }
    const data = await post("/api/enquiries", {
      ...form,
      client_id: client.id,
      credit_days: form.payment_mode === "credit" ? Number(form.credit_days) : null,
      provisional_cost: Number(form.provisional_cost),
      provisional_profit: Number(form.provisional_profit),
    });
    if (!data) return;
    setCreateOpen(false);
    flash(data.client_onboarded ? "Enquiry created · client marked as Onboarded" : "Enquiry created");
    router.refresh();
  }

  function openConvert(enquiry: EnquiryListItem) {
    setError(null);
    setConv({
      job_no: "",
      actual_cost: String(enquiry.provisional_cost),
      actual_profit: String(enquiry.provisional_profit),
      advance_amount: "",
      invoice_date: today(),
      credit_days: enquiry.credit_days !== null ? String(enquiry.credit_days) : "",
      due_date: "",
    });
    setConvertFor(enquiry);
  }

  async function submitConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!convertFor) return;
    const data = await post(`/api/enquiries/${convertFor.id}/convert`, {
      job_no: conv.job_no,
      actual_cost: Number(conv.actual_cost),
      actual_profit: Number(conv.actual_profit),
      advance_amount: conv.advance_amount === "" ? undefined : Number(conv.advance_amount),
      invoice_date: conv.invoice_date,
      ...(isCredit ? { credit_days: Number(conv.credit_days) } : { due_date: conv.due_date || undefined }),
    });
    if (!data) return;
    setConvertFor(null);
    flash(`Order created with job no ${data.order.job_no}`);
    router.refresh();
  }

  const orderAmount = (Number(conv.actual_cost) || 0) + (Number(conv.actual_profit) || 0);
  const isCredit = convertFor?.payment_mode === "credit";
  const creditDueDate =
    isCredit && conv.invoice_date && conv.credit_days !== "" && Number.isInteger(Number(conv.credit_days))
      ? new Date(new Date(`${conv.invoice_date}T00:00:00Z`).getTime() + Number(conv.credit_days) * 86400000).toISOString().slice(0, 10)
      : null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => set({ status: f.value })}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                filter === f.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {f.label}
              <span className="ml-1 text-slate-400">
                {data.counts[f.value].toLocaleString()}
              </span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ref, client or job no..."
          aria-label="Search enquiries"
          className="h-9 min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none transition focus:border-slate-400 focus:bg-white"
        />
        {canCreate && (
          <button
            onClick={() => {
              setError(null);
              setForm(emptyForm());
              setClient(null);
              setCreateOpen(true);
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={14} />
            <span>New enquiry</span>
          </button>
        )}
      </div>

      {canFollowUp && followUpsDue > 0 && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
          <BellRing size={14} className="shrink-0" aria-hidden />
          {followUpsDue} enquir{followUpsDue === 1 ? "y has" : "ies have"} been open for over 30 days. Log a follow-up or cancel with a reason.
        </div>
      )}

      {/* Table */}
      {visible.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={data.counts.all === 0 && !search ? "No enquiries yet" : "No enquiries match"}
          message={data.counts.all === 0 && !search && canCreate ? "Create an enquiry to capture a client's shipping request." : undefined}
        />
      ) : (
        <div className={cn("space-y-1 transition-opacity", isPending && "opacity-60")} aria-busy={isPending}>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-100 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Ref / Date</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Mode / Route</th>
                <th className="px-4 py-3">Job Ref</th>
                <th className="px-4 py-3">Incoterm</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Clearance</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Profit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Job no</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((e) => {
                const converted = e.actual_cost !== null;
                return (
                  <tr key={e.id} className="transition hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="block font-bold text-slate-900">{e.ref}</span>
                      <span className="block text-[11px] text-slate-500">{formatDate(e.enquiry_date)} · {e.created_by}</span>
                      {e.status === "open" && (
                        <span className={cn("block text-[11px]", e.follow_up_due ? "font-semibold text-amber-700" : "text-slate-400")}>
                          Open {daysOpen(e.enquiry_date)} days{e.follow_up_due ? " · follow-up due" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{e.client_name}</td>
                    <td className="px-4 py-3">
                      <span className="block text-xs font-bold uppercase text-slate-500">{e.mode}</span>
                      <span className="flex items-center gap-1 text-slate-800">
                        {e.from} <ArrowRight size={12} className="text-slate-400" /> {e.to}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {e.job_ref ? (
                        <span className="block whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-slate-800">{e.job_ref}</span>
                          <span className="block text-[11px] text-slate-500">{jobRefNames[e.job_ref as JobRef] ?? ""}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {e.incoterm ? (
                        <span
                          title={incotermNames[e.incoterm as Incoterm] ?? e.incoterm}
                          className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700 ring-1 ring-slate-200"
                        >
                          {e.incoterm}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {titleCase(e.payment_mode)}
                      {e.payment_mode === "credit" && e.credit_days ? (
                        <span className="block text-[11px] text-slate-500">{e.credit_days} days</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-semibold", e.clearance ? "text-emerald-700" : "text-slate-400")}>
                        {e.clearance ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="block font-semibold text-slate-900">{formatAmount(converted ? e.actual_cost! : e.provisional_cost)}</span>
                      <span className="block text-[10px] font-medium uppercase text-slate-400">
                        {converted ? `Prov. ${formatAmount(e.provisional_cost)}` : "Provisional"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="block font-semibold text-slate-900">{formatAmount(converted ? e.actual_profit! : e.provisional_profit)}</span>
                      <span className="block text-[10px] font-medium uppercase text-slate-400">
                        {converted ? `Prov. ${formatAmount(e.provisional_profit)}` : "Provisional"}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      <StatusBadge status={e.status} />
                      {e.status === "cancelled" && e.cancel_reason && (
                        <span className="mt-1 block truncate text-[11px] text-slate-500" title={e.cancel_reason}>
                          {e.cancel_reason}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-700">{e.order?.job_no ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canConvert && e.status === "open" && (
                          <button
                            onClick={() => openConvert(e)}
                            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                          >
                            <Repeat size={12} />
                            Convert to order
                          </button>
                        )}
                        {((canFollowUp && e.status === "open") || e.follow_ups.length > 0 || e.status === "cancelled") && (
                          <button
                            onClick={() => setFollowUpId(e.id)}
                            className={cn(
                              "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition",
                              canFollowUp && e.follow_up_due
                                ? "bg-amber-500 text-white hover:bg-amber-600"
                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <MessageSquareText size={12} />
                            {canFollowUp && e.status === "open" ? "Follow up" : "Details"}
                            {e.follow_ups.length > 0 && <span className="opacity-70">{e.follow_ups.length}</span>}
                          </button>
                        )}
                        {canFollowUp && e.status === "open" && (
                          <button
                            onClick={() => setCancelFor(e)}
                            aria-label={`Cancel ${e.ref}`}
                            title="Cancel enquiry"
                            className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} pending={isPending} noun="enquiries" onPage={(p) => set({ page: p })} />
        </div>
      )}

      {/* Create enquiry */}
      <Modal open={createOpen}>
        <form onSubmit={submitCreate} className="space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">New enquiry</h3>
              <p className="text-xs text-slate-500">Cost and profit here are provisional. Actual figures are set when the accountant converts it to an order.</p>
            </div>
            <button type="button" onClick={() => setCreateOpen(false)} aria-label="Close" className="cursor-pointer rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}

          <div className="block text-sm font-medium text-slate-700">
            <label htmlFor="enq-client" className="mb-1 block">Client</label>
            <ClientPicker id="enq-client" required value={client} onChange={setClient} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Enquiry date" type="date" required value={form.enquiry_date} onChange={(e) => setForm({ ...form, enquiry_date: e.target.value })} />
            <SelectField id="enq-mode" label="Mode of transport" value={form.mode} onChange={(v) => setForm({ ...form, mode: v })}>
              {enquiryModes.map((m) => (
                <option key={m} value={m}>{titleCase(m)}</option>
              ))}
            </SelectField>
            <Input label="From" required value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} placeholder="Origin" />
            <Input label="To" required value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} placeholder="Destination" />
            <SelectField id="enq-job-ref" label="Job Ref" required value={form.job_ref} onChange={(v) => setForm({ ...form, job_ref: v })}>
              <option value="">Select job ref...</option>
              {jobRefs.map((code) => (
                <option key={code} value={code}>{code} — {jobRefNames[code]}</option>
              ))}
            </SelectField>
            <SelectField id="enq-incoterm" label="Incoterm" required value={form.incoterm} onChange={(v) => setForm({ ...form, incoterm: v })}>
              <option value="">Select incoterm...</option>
              {incoterms.map((t) => (
                <option key={t} value={t}>{t} — {incotermNames[t]}</option>
              ))}
            </SelectField>
            <SelectField id="enq-payment" label="Payment mode" value={form.payment_mode} onChange={(v) => setForm({ ...form, payment_mode: v })}>
              {enquiryPaymentModes.map((p) => (
                <option key={p} value={p}>{titleCase(p)}</option>
              ))}
            </SelectField>
            {form.payment_mode === "credit" && (
              <Input label="Credit days" type="number" min="1" step="1" required value={form.credit_days} onChange={(e) => setForm({ ...form, credit_days: e.target.value })} placeholder="e.g. 30" />
            )}
          </div>

          {/* Clearance toggle */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
            <div>
              <span id="enq-clearance-label" className="block text-sm font-medium text-slate-700">Clearance</span>
              <span className="text-xs text-slate-500">Include customs clearance</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.clearance}
              aria-labelledby="enq-clearance-label"
              onClick={() => setForm({ ...form, clearance: !form.clearance })}
              className={cn("relative h-6 w-11 cursor-pointer rounded-full transition", form.clearance ? "bg-emerald-500" : "bg-slate-300")}
            >
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", form.clearance ? "left-[22px]" : "left-0.5")} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Provisional cost" type="number" min="0" step="0.01" required value={form.provisional_cost} onChange={(e) => setForm({ ...form, provisional_cost: e.target.value })} />
            <Input label="Provisional profit" type="number" step="0.01" required value={form.provisional_profit} onChange={(e) => setForm({ ...form, provisional_profit: e.target.value })} />
          </div>

          <label htmlFor="enq-notes" className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Notes (optional)</span>
            <textarea id="enq-notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200" />
          </label>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setCreateOpen(false)} className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
              {saving && <Loader2 size={12} className="animate-spin" />}
              Save enquiry
            </button>
          </div>
        </form>
      </Modal>

      {/* Convert to order */}
      <Modal open={!!convertFor}>
        <form onSubmit={submitConvert} className="space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Convert {convertFor?.ref} to order</h3>
              <p className="text-xs text-slate-500">
                {convertFor?.client_name} · {convertFor?.from} → {convertFor?.to}. A draft order is created and follows the normal approval flow.
              </p>
            </div>
            <button type="button" onClick={() => setConvertFor(null)} aria-label="Close" className="cursor-pointer rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}

          <Input label="Job no" required value={conv.job_no} onChange={(e) => setConv({ ...conv, job_no: e.target.value })} placeholder="e.g. JOB-2026-001" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Actual cost" type="number" min="0" step="0.01" required value={conv.actual_cost} onChange={(e) => setConv({ ...conv, actual_cost: e.target.value })} />
            <Input label="Actual profit" type="number" step="0.01" required value={conv.actual_profit} onChange={(e) => setConv({ ...conv, actual_profit: e.target.value })} />
          </div>
          <Input label="Advance received (optional)" type="number" min="0" step="0.01" value={conv.advance_amount} onChange={(e) => setConv({ ...conv, advance_amount: e.target.value })} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Invoice date" type="date" required value={conv.invoice_date} onChange={(e) => setConv({ ...conv, invoice_date: e.target.value })} />
            {isCredit ? (
              <Input label="Credit days" type="number" min="0" step="1" required value={conv.credit_days} onChange={(e) => setConv({ ...conv, credit_days: e.target.value })} />
            ) : (
              <Input label="Due date (optional)" type="date" min={conv.invoice_date || undefined} value={conv.due_date} onChange={(e) => setConv({ ...conv, due_date: e.target.value })} />
            )}
          </div>
          {isCredit && (
            <p className="-mt-2 text-xs text-slate-500">
              Credit enquiry ({convertFor?.credit_days ?? "—"} days agreed).{" "}
              {creditDueDate ? (
                <>Payment due on <span className="font-semibold text-slate-800">{formatDate(creditDueDate)}</span>.</>
              ) : (
                "Enter credit days to set the due date."
              )}
            </p>
          )}

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
            <span className="text-slate-600">Order amount (cost + profit)</span>
            <span className="font-bold text-slate-900">{formatAmount(orderAmount)}</span>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setConvertFor(null)} className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
              {saving && <Loader2 size={12} className="animate-spin" />}
              Create order
            </button>
          </div>
        </form>
      </Modal>

      <FollowUpModal
        enquiry={followUpFor}
        canAdd={canFollowUp}
        onClose={closeFollowUp}
        onSaved={() => {
          closeFollowUp();
          flash("Follow-up saved");
          router.refresh();
        }}
      />
      <CancelEnquiryModal
        enquiry={cancelFor}
        onClose={() => setCancelFor(null)}
        onCancelled={() => {
          setCancelFor(null);
          flash("Enquiry cancelled");
          router.refresh();
        }}
      />

      <Toast message={toast} />
    </div>
  );
}
