"use client";

import { useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedParam, useUrlFilters } from "@/hooks/useUrlFilters";
import type { EnquiryPage } from "@/lib/enquiries";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { orderHref, orderNo, type AppRole } from "@/lib/record-links";
import { ArrowRight, BellRing, ChevronRight, ClipboardList, MessageSquareText, Pencil, Plus } from "lucide-react";
import { EnquiryDetailSheet } from "@/components/enquiries/EnquiryDetailSheet";
import { EnquiryPdfButton } from "@/components/enquiries/EnquiryPdfButton";
import { packageLinesPayload } from "@/components/enquiries/CargoDimensionsField";
import { EnquiryForm, emptyEnquiryForm, enquiryFormFrom } from "@/components/enquiries/EnquiryForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { FollowUpModal } from "@/components/enquiries/EnquiryFollowUpModals";
import { EnquiryStageActions, primaryAction } from "@/components/enquiries/EnquiryStageActions";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatAmount, formatDate } from "@/lib/utils";
import { clientStatusLabel } from "@/types/client";
import {
  jobRefNames,
  type JobRef,
  type EnquiryStatus,
  enquiryStatuses,
  enquiryStatusLabels,
  isActiveEnquiry,
  type EnquiryListItem,
  shipmentSpec,
} from "@/types/enquiry";

/** Anything short of Confirmed can still be corrected. */
const canEditEnquiry = (e: EnquiryListItem) => e.status !== "confirmed";

const FILTERS: { value: EnquiryStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...enquiryStatuses.map((value) => ({ value, label: enquiryStatusLabels[value] })),
];

const DAY_MS = 24 * 60 * 60 * 1000;
const daysOpen = (enquiryDate: string) => Math.max(0, Math.floor((Date.now() - new Date(`${enquiryDate}T00:00:00Z`).getTime()) / DAY_MS));

/** Server-paginated enquiries table. Status tab, search and page are URL params. */
export function EnquiriesClient({
  data,
  role,
  canCreate,
  canFollowUp = false,
}: {
  data: EnquiryPage;
  /** Decides where order links go (see lib/record-links.ts). */
  role: AppRole;
  canCreate: boolean;
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
  // Set while the form edits an existing enquiry instead of creating one.
  const [editing, setEditing] = useState<EnquiryListItem | null>(null);
  const [form, setForm] = useState(emptyEnquiryForm);
  const [client, setClient] = useState<{ id: number; name: string } | null>(null);


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
  // Looked up by id so the panel shows fresh data after router.refresh().
  // ?view=<id> (link from an order or client page) opens that enquiry even if it is on another page.
  const [detailId, setDetailId] = useState<number | null>(() => Number(get("view")) || null);
  const detailFor =
    detailId === null ? null : enquiries.find((e) => e.id === detailId) ?? (data.focus?.id === detailId ? data.focus : null);
  const closeDetail = () => {
    setDetailId(null);
    if (get("view")) set({ view: null, page: get("page") || null });
  };
  const orderLink = (id: number) => orderHref(role, id);
  const followUpsDue = data.followUpsDue;

  const visible = enquiries;

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(undefined), 3000);
  }

  async function post(url: string, body: unknown, method = "POST") {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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

  function openEdit(enquiry: EnquiryListItem) {
    setError(null);
    setDetailId(null);
    setEditing(enquiry);
    setForm(enquiryFormFrom(enquiry));
    setClient({ id: enquiry.client_id, name: enquiry.client_name });
    setCreateOpen(true);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      const data = await post(
        `/api/enquiries/${editing.id}`,
        { ...form, packages: packageLinesPayload(form.packages), credit_days: form.payment_mode === "credit" ? Number(form.credit_days) : null },
        "PATCH",
      );
      if (!data) return;
      setCreateOpen(false);
      flash(data.changed.length ? `${editing.ref} updated` : "No changes to save");
      router.refresh();
      return;
    }
    if (!client) {
      setError("Select a client");
      return;
    }
    const data = await post("/api/enquiries", {
      ...form,
      client_id: client.id,
      packages: packageLinesPayload(form.packages),
      credit_days: form.payment_mode === "credit" ? Number(form.credit_days) : null,
      // Both empty → "Inquiry received" (quote later); both filled → "Quoted".
      provisional_cost: form.provisional_cost === "" ? null : Number(form.provisional_cost),
      provisional_profit: form.provisional_profit === "" ? null : Number(form.provisional_profit),
    });
    if (!data) return;
    setCreateOpen(false);
    flash(data.client_status ? `Enquiry created · client moved to ${clientStatusLabel(data.client_status)}` : "Enquiry created");
    router.refresh();
  }


  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-border/80 bg-card p-4 shadow-card">
        <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => set({ status: f.value })}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                filter === f.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              <span className="ml-1 text-muted-foreground/80">
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
          className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-9 min-w-[200px] flex-1"
        />
        <EnquiryPdfButton enquiry={null} label="Blank form" className="h-9 rounded-xl" />
        {canCreate && (
          <button
            onClick={() => {
              setError(null);
              setEditing(null);
              setForm(emptyEnquiryForm());
              setClient(null);
              setCreateOpen(true);
            }}
            className={buttonVariants({ size: "sm" })}
          >
            <Plus size={14} />
            <span>New enquiry</span>
          </button>
        )}
      </div>

      {canFollowUp && followUpsDue > 0 && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-xs font-medium text-warning-foreground">
          <BellRing size={14} className="shrink-0" aria-hidden />
          {followUpsDue} enquir{followUpsDue === 1 ? "y has" : "ies have"} been open for over 30 days. Log a follow-up or cancel with a reason.
        </div>
      )}

      {/* Table (lg+) / cards (phones & tablets). Row click opens every field in the detail panel. */}
      {visible.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={data.counts.all === 0 && !search ? "No enquiries yet" : "No enquiries match"}
          message={data.counts.all === 0 && !search && canCreate ? "Create an enquiry to capture a client's shipping request." : undefined}
        />
      ) : (
        <div className={cn("space-y-1 transition-opacity", isPending && "opacity-60")} aria-busy={isPending}>
          <div className="hidden overflow-hidden rounded-card border border-border bg-card shadow-card lg:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-border bg-subtle text-xs font-medium text-muted-foreground">
                <tr>
                  <th scope="col" className="w-[22%] px-4 py-3 font-medium">Enquiry</th>
                  <th scope="col" className="px-4 py-3 font-medium">Client</th>
                  <th scope="col" className="w-[22%] px-4 py-3 font-medium">Route</th>
                  <th scope="col" className="hidden w-[13%] px-4 py-3 text-right font-medium xl:table-cell">Cost / Profit</th>
                  <th scope="col" className="w-[136px] px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="w-[184px] px-4 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((e) => {
                  const converted = e.actual_cost !== null;
                  return (
                    <tr
                      key={e.id}
                      onClick={() => setDetailId(e.id)}
                      className="group cursor-pointer transition-colors hover:bg-subtle"
                    >
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setDetailId(e.id);
                          }}
                          aria-label={`View details for ${e.ref}`}
                          className="cursor-pointer rounded font-mono text-[13px] font-semibold text-foreground group-hover:text-primary"
                        >
                          {e.ref}
                        </button>
                        <span className="block truncate text-xs text-muted-foreground">{formatDate(e.enquiry_date)} · {e.created_by}</span>
                        {isActiveEnquiry(e.status) && (
                          <span className={cn("block text-xs", e.follow_up_due ? "font-medium text-warning-foreground" : "text-muted-foreground")}>
                            Active {daysOpen(e.enquiry_date)}d{e.follow_up_due ? " · follow-up due" : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="line-clamp-2 font-medium text-foreground">{e.client_name}</span>
                        {e.job_ref && <span className="block truncate text-xs text-muted-foreground">{e.job_ref} · {jobRefNames[e.job_ref as JobRef] ?? ""}</span>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          {e.mode}
                          {e.is_dg && <DgBadge unNumber={e.un_number} />}
                        </span>
                        <span className="flex min-w-0 items-center gap-1 text-foreground">
                          <span className="truncate">{e.from}</span>
                          <ArrowRight size={12} className="shrink-0 text-muted-foreground" aria-label="to" />
                          <span className="truncate">{e.to}</span>
                        </span>
                        {shipmentSpec(e) && <span className="block truncate text-xs tabular-nums text-muted-foreground">{shipmentSpec(e)}</span>}
                      </td>
                      <td className="hidden px-4 py-3 text-right align-top tabular-nums xl:table-cell">
                        {e.provisional_cost === null ? (
                          <span className="text-xs text-muted-foreground">Not quoted</span>
                        ) : (
                          <>
                            <span className="block font-medium text-foreground">{formatAmount(converted ? e.actual_cost! : e.provisional_cost)}</span>
                            <span className="block text-xs text-muted-foreground">{formatAmount(converted ? e.actual_profit! : e.provisional_profit ?? 0)}</span>
                            {!converted && <span className="block text-xs text-muted-foreground/80">Quoted</span>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusBadge status={e.status} />
                        {e.order && (
                          <OrderChip id={e.order.id} jobNo={e.order.job_no} href={orderLink(e.order.id)} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right align-top" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {canFollowUp && primaryAction(e.status) && !e.follow_up_due && (
                            <EnquiryStageActions enquiry={e} only={[primaryAction(e.status)!]} onDone={flash} />
                          )}
                          {canFollowUp && isActiveEnquiry(e.status) && e.follow_up_due && (
                            <Button
                              size="sm"
                              variant={e.follow_up_due ? "primary" : "secondary"}
                              onClick={() => setFollowUpId(e.id)}
                              className={cn(e.follow_up_due && "bg-warning text-white hover:bg-warning/90 dark:text-foreground")}
                            >
                              <MessageSquareText /> Follow up
                              {e.follow_ups.length > 0 && <span className="opacity-70">{e.follow_ups.length}</span>}
                            </Button>
                          )}
                          {canFollowUp && canEditEnquiry(e) && (
                            <SimpleTooltip label="Edit enquiry">
                              <Button size="icon-sm" variant="ghost" onClick={() => openEdit(e)} aria-label={`Edit ${e.ref}`}>
                                <Pencil />
                              </Button>
                            </SimpleTooltip>
                          )}
                          <ChevronRight size={16} className="shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground" aria-hidden />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards below lg */}
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:hidden">
            {visible.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setDetailId(e.id)}
                  className="w-full cursor-pointer rounded-card border border-border bg-card p-4 text-left shadow-card transition-colors active:bg-subtle"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-semibold text-foreground">{e.ref}</p>
                      <p className="truncate text-sm font-medium text-foreground">{e.client_name}</p>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  <p className="mt-2 flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                    <span className="text-[11px] font-semibold uppercase">{e.mode}</span>
                    {e.is_dg && <DgBadge unNumber={e.un_number} />}
                    <span aria-hidden>·</span>
                    <span className="truncate">{e.from}</span>
                    <ArrowRight size={12} className="shrink-0" aria-label="to" />
                    <span className="truncate">{e.to}</span>
                  </p>
                  {shipmentSpec(e) && <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{shipmentSpec(e)}</p>}
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(e.enquiry_date)}</span>
                    {isActiveEnquiry(e.status) && (
                      <span className={cn(e.follow_up_due && "font-medium text-warning-foreground")}>
                        Active {daysOpen(e.enquiry_date)}d{e.follow_up_due ? " · follow-up due" : ""}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} pending={isPending} noun="enquiries" onPage={(p) => set({ page: p })} />
        </div>
      )}

      <EnquiryDetailSheet
        enquiry={detailFor}
        daysOpen={daysOpen}
        canFollowUp={canFollowUp}
        onClose={closeDetail}
        orderLink={orderLink}
        onEdit={canFollowUp ? openEdit : undefined}
        onFollowUp={(e) => {
          setDetailId(null);
          setFollowUpId(e.id);
        }}
        onDone={(message) => {
          flash(message);
          router.refresh();
        }}
      />

      {/* Create / edit enquiry */}
      <Modal onClose={() => setCreateOpen(false)} open={createOpen} size="xl" className="p-0">
        <EnquiryForm
          form={form}
          setForm={setForm}
          editing={editing}
          client={client}
          setClient={setClient}
          error={error}
          saving={saving}
          onSubmit={submitCreate}
          onCancel={() => setCreateOpen(false)}
        />
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

      <Toast message={toast} />
    </div>
  );
}

/** "Order #00012 · JOB-1" under the status; a link when the role has somewhere to go. */
function OrderChip({ id, jobNo, href }: { id: number; jobNo: string | null; href: string | null }) {
  const text = `${orderNo(id)}${jobNo ? ` · ${jobNo}` : ""}`;
  return href ? (
    <Link
      href={href}
      onClick={(ev) => ev.stopPropagation()}
      className="mt-1 block truncate font-mono text-xs text-primary hover:underline"
      title="Open order"
    >
      {text}
    </Link>
  ) : (
    <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">{text}</span>
  );
}

/** Dangerous-goods marker; the UN number(s) are in the tooltip and for screen readers. */
function DgBadge({ unNumber }: { unNumber: string | null }) {
  const text = `Dangerous goods${unNumber ? ` · ${unNumber}` : ""}`;
  return (
    <span title={text} className="shrink-0 rounded bg-warning-soft px-1 py-px text-[10px] font-semibold tracking-wide text-warning-foreground">
      DG<span className="sr-only"> — {text}</span>
    </span>
  );
}
