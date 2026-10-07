"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, MessageSquareText, Pencil } from "lucide-react";
import { EnquiryStageActions } from "@/components/enquiries/EnquiryStageActions";
import { EnquiryPdfButton } from "@/components/enquiries/EnquiryPdfButton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn, formatAmount, formatDate, formatDateTime, formatQuantity, titleCase } from "@/lib/utils";
import { enquiryStatusLabels, equipmentLabel, formatTemp, gaugeLabels, type Gauge, incotermNames, isActiveEnquiry, jobRefNames, type EnquiryEventItem, type EnquiryListItem, type EnquiryStatus, type Incoterm, type JobRef } from "@/types/enquiry";
import { orderStatusLabel } from "@/types/order";
import { cargoTotals, dimensionUnitLabels, isDimensionUnit, lineCbm, volumetricRuleLabels, DEFAULT_DIMENSION_UNIT } from "@/lib/freight";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

const dash = <span className="text-muted-foreground">—</span>;

/** Every field of an enquiry plus its actions, opened by clicking a table row. */
export function EnquiryDetailSheet({
  enquiry,
  daysOpen,
  canFollowUp,
  onClose,
  onFollowUp,
  onEdit,
  onDone,
  orderLink,
}: {
  enquiry: EnquiryListItem | null;
  daysOpen: (enquiryDate: string) => number;
  /** Salesmen / managers: stage moves, follow-ups, mark lost. */
  canFollowUp: boolean;
  onClose: () => void;
  onFollowUp: (e: EnquiryListItem) => void;
  /** Shown for anything short of Confirmed when given. */
  onEdit?: (e: EnquiryListItem) => void;
  onDone: (message: string) => void;
  /** Where an order number links to for this role; null = no link. */
  orderLink?: (orderId: number) => string | null;
}) {
  const e = enquiry;
  const converted = e ? e.actual_cost !== null : false;
  const active = e ? isActiveEnquiry(e.status) : false;
  const quoted = e ? e.provisional_cost !== null : false;
  const showFollowUp = e ? (canFollowUp && active) || e.follow_ups.length > 0 : false;
  const latest = e?.follow_ups[0];
  const canEdit = !!onEdit && !!e && e.status !== "confirmed";

  return (
    <Sheet open={!!e} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" title={e ? `Enquiry ${e.ref}` : "Enquiry"} hideTitle className="w-[440px]">
        {e && (
          <>
            {/* Header */}
            <div className="space-y-3 border-b border-border px-6 pb-5 pt-6 pr-14">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-foreground">{e.ref}</span>
                <StatusBadge status={e.status} />
              </div>
              <div>
                <p className="text-lg font-semibold leading-snug text-foreground">{e.client_name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="font-medium uppercase">{e.mode}</span>
                  <span aria-hidden>·</span>
                  {e.from} <ArrowRight size={13} aria-label="to" /> {e.to}
                </p>
              </div>
              {active && (
                <p className={cn("text-xs", e.follow_up_due ? "font-medium text-warning-foreground" : "text-muted-foreground")}>
                  Active {daysOpen(e.enquiry_date)} days{e.follow_up_due ? " · follow-up due" : ""}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <Section title="Commercial">
                {!quoted ? (
                  <p className="rounded-control border border-dashed border-border p-3 text-sm text-muted-foreground">Not quoted yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-control border border-border bg-subtle p-3">
                      <p className="text-xs text-muted-foreground">{converted ? "Actual cost" : "Quoted cost"}</p>
                      <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                        {formatAmount(converted ? e.actual_cost! : e.provisional_cost!)}
                      </p>
                      {converted && <p className="text-[11px] tabular-nums text-muted-foreground">Quoted {formatAmount(e.provisional_cost!)}</p>}
                    </div>
                    <div className="rounded-control border border-border bg-subtle p-3">
                      <p className="text-xs text-muted-foreground">{converted ? "Actual profit" : "Quoted profit"}</p>
                      <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                        {formatAmount(converted ? e.actual_profit! : e.provisional_profit!)}
                      </p>
                      {converted && <p className="text-[11px] tabular-nums text-muted-foreground">Quoted {formatAmount(e.provisional_profit!)}</p>}
                    </div>
                  </div>
                )}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="Payment">
                    {titleCase(e.payment_mode)}
                    {e.payment_mode === "credit" && e.credit_days ? <span className="text-muted-foreground"> · {e.credit_days} days</span> : null}
                  </Field>
                  <Field label="Order">
                    {e.order ? (
                      <>
                        {orderLink?.(e.order.id) ? (
                          <Link href={orderLink(e.order.id)!} className="inline-flex items-center gap-1 font-mono text-primary hover:underline">
                            #{String(e.order.id).padStart(5, "0")} <ExternalLink size={12} aria-hidden />
                          </Link>
                        ) : (
                          <span className="font-mono">#{String(e.order.id).padStart(5, "0")}</span>
                        )}
                        <span className="block font-normal text-muted-foreground">{orderStatusLabel(e.order.status)}{e.order.job_no ? ` · Job ${e.order.job_no}` : ""}</span>
                      </>
                    ) : (
                      dash
                    )}
                  </Field>
                </dl>
              </Section>

              <Section title="Shipment">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="Collection address" className="col-span-2">
                    {e.collection_address ? <span className="whitespace-pre-wrap font-normal">{e.collection_address}</span> : dash}
                  </Field>
                  <Field label="Job ref" className="col-span-2">
                    {e.job_ref ? (
                      <>
                        <span className="font-mono">{e.job_ref}</span>
                        <span className="font-normal text-muted-foreground"> — {jobRefNames[e.job_ref as JobRef] ?? ""}</span>
                      </>
                    ) : (
                      dash
                    )}
                  </Field>
                  <Field label="Incoterm" className="col-span-2">
                    {e.incoterm ? (
                      <>
                        <span className="font-mono">{e.incoterm}</span>
                        <span className="font-normal text-muted-foreground"> — {incotermNames[e.incoterm as Incoterm] ?? e.incoterm}</span>
                      </>
                    ) : (
                      dash
                    )}
                  </Field>
                  <Field label="Clearance">
                    <span className={e.clearance ? "text-success-foreground" : "text-muted-foreground"}>{e.clearance ? "Yes" : "No"}</span>
                  </Field>
                  <Field label="Dangerous goods">
                    {e.is_dg ? (
                      <span className="text-warning-foreground">
                        Yes{e.un_number && <span className="font-mono"> · {e.un_number}</span>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </Field>
                  <Field label="Mode">{titleCase(e.mode)}</Field>
                  {e.mode === "sea" && <Field label="Service type">{equipmentLabel(e) ?? dash}</Field>}
                  {e.gauge && <Field label="Gauge">{gaugeLabels[e.gauge as Gauge] ?? e.gauge}</Field>}
                  {e.reefer_temp !== null && (
                    <Field label="Reefer temperature">
                      <span className="tabular-nums">{formatTemp(e.reefer_temp)}</span>
                    </Field>
                  )}
                  {e.mode === "land" && <Field label="Truck type">{equipmentLabel(e) ?? dash}</Field>}
                </dl>
              </Section>

              <CargoSection enquiry={e} />

              <Section title="Record">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="Enquiry date">{formatDate(e.enquiry_date)}</Field>
                  <Field label="Created by">{e.created_by}</Field>
                </dl>
              </Section>

              {e.notes && (
                <Section title="Notes">
                  <p className="whitespace-pre-wrap text-sm text-foreground">{e.notes}</p>
                </Section>
              )}

              {e.status === "lost" && (
                <Section title="Lost">
                  <div className="space-y-1 rounded-control bg-danger-soft p-3 text-sm">
                    <p className="text-foreground">{e.cancel_reason || "No reason given"}</p>
                    {(e.cancelled_by || e.cancelled_at) && (
                      <p className="text-xs text-muted-foreground">
                        {e.cancelled_by}
                        {e.cancelled_by && e.cancelled_at ? " · " : ""}
                        {e.cancelled_at ? formatDateTime(e.cancelled_at) : ""}
                      </p>
                    )}
                  </div>
                </Section>
              )}

              <Section title="History">
                <History events={e.events} orderLink={orderLink} />
              </Section>

              <Section title={`Follow-ups (${e.follow_ups.length})`}>
                {latest ? (
                  <div className="rounded-control border border-border p-3">
                    <p className="whitespace-pre-wrap text-sm text-foreground">{latest.comment}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Latest · {latest.by} · {formatDateTime(latest.at)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No follow-ups logged yet.</p>
                )}
              </Section>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border bg-subtle px-6 py-4">
                {canFollowUp && <EnquiryStageActions enquiry={e} onDone={onDone} />}
                {canEdit && (
                  <Button size="sm" variant="secondary" onClick={() => onEdit!(e)}>
                    <Pencil /> Edit
                  </Button>
                )}
                {showFollowUp && (
                  <Button size="sm" variant="secondary" onClick={() => onFollowUp(e)}>
                    <MessageSquareText />
                    {canFollowUp && active ? "Follow up" : "Follow-up history"}
                  </Button>
                )}
                <EnquiryPdfButton enquiry={e} label="Export PDF" />
              </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

const EVENT_TEXT: Record<string, string> = {
  inquiry_received: "Inquiry received",
  quoted: "Quoted",
  negotiation: "Moved to on negotiations",
  offer_revised: "Offer revised",
  confirmed: "Confirmed · order created",
  lost: "Marked lost",
  revision_requested: "Order sent back for revision",
  order_cancelled: "Order cancelled · enquiry lost",
  order_reopened: "Confirmed · order reopened",
  edited: "Details edited",
};

/** Notes that are someone's stated reason (shown in quotes); others are system summaries. */
const QUOTED_NOTES = new Set(["lost", "revision_requested", "order_cancelled"]);

function figures(cost: number | null, profit: number | null) {
  return cost === null || profit === null ? null : `${formatAmount(cost)} / ${formatAmount(profit)}`;
}

/** Stage history, newest first: who moved it, when, and the figures each quote replaced. */
function History({ events, orderLink }: { events: EnquiryEventItem[]; orderLink?: (orderId: number) => string | null }) {
  if (events.length === 0) return <p className="text-sm text-muted-foreground">No stage changes recorded yet.</p>;
  return (
    <ol className="space-y-3 border-l border-border pl-4">
      {events.map((ev) => {
        const now = figures(ev.cost, ev.profit);
        const before = figures(ev.prev_cost, ev.prev_profit);
        return (
          <li key={ev.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-border-strong" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              {EVENT_TEXT[ev.action] ?? enquiryStatusLabels[ev.action as EnquiryStatus] ?? ev.action}
              {ev.order_id ? (
                <span className="font-normal text-muted-foreground">
                  {" · "}
                  {orderLink?.(ev.order_id) ? (
                    <Link href={orderLink(ev.order_id)!} className="font-mono text-primary hover:underline">
                      #{String(ev.order_id).padStart(5, "0")}
                    </Link>
                  ) : (
                    <>#{String(ev.order_id).padStart(5, "0")}</>
                  )}
                </span>
              ) : null}
            </p>
            {now && (
              <p className="text-xs tabular-nums text-muted-foreground">
                Cost / profit {now}
                {before && ev.action === "offer_revised" ? <span className="line-through decoration-muted-foreground/60"> {before}</span> : null}
              </p>
            )}
            {ev.note && <p className="text-xs text-foreground">{QUOTED_NOTES.has(ev.action) ? `“${ev.note}”` : ev.note}</p>}
            <p className="text-[11px] text-muted-foreground">
              {ev.by} · {formatDateTime(ev.at)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/** Packing list and weights. Volumetric weight is recomputed from the stored lines for the mode. */
function CargoSection({ enquiry: e }: { enquiry: EnquiryListItem }) {
  const unit = isDimensionUnit(e.dimension_unit) ? e.dimension_unit : DEFAULT_DIMENSION_UNIT;
  const totals = cargoTotals(e.packages, unit, e.mode, e.actual_weight);
  const kg = (v: number | null) => (v !== null ? <span className="tabular-nums">{formatQuantity(v)} kg</span> : dash);
  if (!e.packages.length && e.actual_weight === null && e.chargeable_weight === null && e.cbm === null && e.stackable === null) {
    return (
      <Section title="Cargo">
        <p className="text-sm text-muted-foreground">No dimensions or weight given.</p>
      </Section>
    );
  }
  return (
    <Section title="Cargo">
      {e.packages.length > 0 && (
        <div className="overflow-hidden rounded-control border border-border">
          <table className="w-full text-sm">
            <thead className="bg-subtle text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">L × W × H ({dimensionUnitLabels[unit]})</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Nos</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">CBM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {e.packages.map((p, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-foreground">
                    {formatQuantity(p.length)} × {formatQuantity(p.width)} × {formatQuantity(p.height)}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground">{formatQuantity(p.qty)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{formatQuantity(Math.round(lineCbm(p, unit) * 1000) / 1000)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {e.packages.length > 0 && <Field label="Pieces"><span className="tabular-nums">{formatQuantity(totals.pieces)}</span></Field>}
        <Field label="Volume">{e.cbm !== null ? <span className="tabular-nums">{formatQuantity(e.cbm)} m³</span> : dash}</Field>
        <Field label="Actual weight">{kg(e.actual_weight)}</Field>
        <Field label="Stacking">
          {e.stackable === null ? dash : e.stackable ? "Stackable" : <span className="text-warning-foreground">Non-stackable</span>}
        </Field>
        <Field label="Volumetric weight">{kg(totals.volumetricWeight)}</Field>
        <Field label="Chargeable weight" className="col-span-2">
          <span className="text-base font-semibold">{kg(e.chargeable_weight)}</span>
          {totals.basis && e.chargeable_weight !== null && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">{totals.basis === "volumetric" ? "volumetric is higher" : "actual is higher"}</span>
          )}
        </Field>
      </dl>
      {e.packages.length > 0 && volumetricRuleLabels[e.mode] && <p className="text-xs text-muted-foreground">{volumetricRuleLabels[e.mode]}</p>}
    </Section>
  );
}
