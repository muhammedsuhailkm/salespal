"use client";

import { ArrowRight, Loader2, Plane, Ship, Truck, X, type LucideIcon } from "lucide-react";
import { ClientPicker } from "@/components/clients/ClientPicker";
import { CargoDimensionsField, emptyPackageLine, type PackageLineInput } from "@/components/enquiries/CargoDimensionsField";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import { DEFAULT_DIMENSION_UNIT, isDimensionUnit, type DimensionUnit } from "@/lib/freight";
import { cn, formatAmount } from "@/lib/utils";
import {
  enquiryPaymentModes,
  ftlTruckTypes,
  gaugeLabels,
  gauges,
  incotermNames,
  incoterms,
  isOpenTop,
  isReefer,
  jobRefNames,
  jobRefs,
  REEFER_TEMP_MAX,
  REEFER_TEMP_MIN,
  seaContainerTypes,
  seaOtherServiceTypes,
  seaServiceTypeCodes,
  seaServiceTypeLabels,
  sharedTruckTypes,
  truckTypeLabels,
  type EnquiryListItem,
  type JobRef,
  type SeaServiceType,
} from "@/types/enquiry";

/* ─── Form state (strings while editing; EnquiriesClient turns it into the API payload) ─── */

const today = () => new Date().toISOString().slice(0, 10);

export const emptyEnquiryForm = () => ({
  enquiry_date: today(),
  mode: "sea",
  from: "",
  to: "",
  collection_address: "",
  job_ref: "",
  incoterm: "",
  payment_mode: "cash",
  credit_days: "",
  clearance: false,
  is_dg: false,
  un_number: "",
  packages: [emptyPackageLine()] as PackageLineInput[],
  dimension_unit: DEFAULT_DIMENSION_UNIT as DimensionUnit,
  actual_weight: "",
  stackable: "true" as "" | "true" | "false",
  service_type: "",
  reefer_temp: "",
  gauge: "",
  truck_type: "",
  provisional_cost: "",
  provisional_profit: "",
  notes: "",
});

export type EnquiryFormState = ReturnType<typeof emptyEnquiryForm>;

/** Edit form prefilled from an enquiry (figures are changed through Quote / Offer revised, not here). */
export const enquiryFormFrom = (e: EnquiryListItem): EnquiryFormState => ({
  enquiry_date: e.enquiry_date,
  mode: e.mode,
  from: e.from,
  to: e.to,
  collection_address: e.collection_address ?? "",
  job_ref: e.job_ref ?? "",
  incoterm: e.incoterm ?? "",
  payment_mode: e.payment_mode,
  credit_days: e.credit_days ? String(e.credit_days) : "",
  clearance: e.clearance,
  is_dg: e.is_dg,
  un_number: e.un_number ?? "",
  packages: e.packages.length
    ? e.packages.map((p) => ({ length: String(p.length), width: String(p.width), height: String(p.height), qty: String(p.qty) }))
    : [emptyPackageLine()],
  dimension_unit: isDimensionUnit(e.dimension_unit) ? e.dimension_unit : DEFAULT_DIMENSION_UNIT,
  actual_weight: e.actual_weight === null ? "" : String(e.actual_weight),
  stackable: (e.stackable === null ? "" : String(e.stackable)) as "" | "true" | "false",
  service_type: e.service_type ?? "",
  reefer_temp: e.reefer_temp === null ? "" : String(e.reefer_temp),
  gauge: e.gauge ?? "",
  truck_type: e.truck_type ?? "",
  provisional_cost: "",
  provisional_profit: "",
  notes: e.notes ?? "",
});

/* ─── Option data for the pickers ─── */

const MODES: { value: string; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "sea", label: "Sea", hint: "FCL, LCL, RO-RO", icon: Ship },
  { value: "air", label: "Air", hint: "Air freight", icon: Plane },
  { value: "land", label: "Road", hint: "FTL or LTL trucking", icon: Truck },
];
const MODE_LABEL: Record<string, string> = { sea: "Sea", air: "Air", land: "Road" };

/** Job ref codes grouped by the mode they belong to (first letter of the code). */
const JOB_REF_GROUPS: { mode: string; label: string; codes: JobRef[] }[] = [
  { mode: "air", label: "Air", codes: jobRefs.filter((c) => c.startsWith("A")) },
  { mode: "sea", label: "Sea", codes: jobRefs.filter((c) => c.startsWith("S")) },
  { mode: "land", label: "Road / land", codes: jobRefs.filter((c) => c.startsWith("R") || c.startsWith("L")) },
  { mode: "other", label: "Other", codes: jobRefs.filter((c) => !/^[ASRL]/.test(c)) },
];

const PAYMENT_LABEL: Record<string, string> = { cash: "Cash", card: "Card", credit: "Credit" };

/* ─── Small building blocks ─── */

/** One form section: title + hint on the left (desktop), fields on the right. */
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-x-8 gap-y-3 border-t border-border py-6 first:border-t-0 first:pt-1 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

/** Radio chips: one click to choose, real radio inputs so the browser's `required` check still works. */
function ChoiceChips({
  name,
  value,
  onChange,
  options,
  required,
  columns = "grid-cols-2 sm:grid-cols-3",
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: React.ReactNode; hint?: string }[];
  required?: boolean;
  columns?: string;
}) {
  return (
    <div className={cn("grid gap-2", columns)}>
      {options.map((o, i) => {
        const checked = value === o.value;
        return (
          <label
            key={o.value}
            className={cn(
              "press relative flex cursor-pointer flex-col rounded-control border px-3 py-2 text-left has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/25",
              checked ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border bg-card hover:border-border-strong hover:bg-subtle",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={checked}
              required={required && i === 0}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span className={cn("text-sm font-medium", checked ? "text-primary-soft-foreground" : "text-foreground")}>{o.label}</span>
            {o.hint && <span className={cn("text-xs", checked ? "text-primary-soft-foreground/80" : "text-muted-foreground")}>{o.hint}</span>}
          </label>
        );
      })}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs font-medium text-muted-foreground">{children}</p>;
}

/* ─── The form ─── */

export function EnquiryForm({
  form,
  setForm,
  editing,
  client,
  setClient,
  error,
  saving,
  onSubmit,
  onCancel,
}: {
  form: EnquiryFormState;
  setForm: (next: EnquiryFormState) => void;
  editing: EnquiryListItem | null;
  client: { id: number; name: string } | null;
  setClient: (client: { id: number; name: string } | null) => void;
  error: string | null;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const patch = (p: Partial<EnquiryFormState>) => setForm({ ...form, ...p });
  const cost = Number(form.provisional_cost);
  const profit = Number(form.provisional_profit);
  const quoted = form.provisional_cost !== "" && form.provisional_profit !== "" && Number.isFinite(cost) && Number.isFinite(profit) ? cost + profit : null;
  const jobRefGroups = [...JOB_REF_GROUPS].sort((a, b) => (a.mode === form.mode ? -1 : b.mode === form.mode ? 1 : 0));
  const equipment =
    form.mode === "sea" && form.service_type
      ? seaServiceTypeCodes[form.service_type as SeaServiceType]
      : form.mode === "land" && form.truck_type
        ? truckTypeLabels[form.truck_type as keyof typeof truckTypeLabels]
        : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      {/* Header (pinned) */}
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card px-6 py-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{editing ? `Edit ${editing.ref}` : "New enquiry"}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {editing
              ? "Correct the shipment details. Cost and profit change through Quote / Offer revised so the history keeps the old figures."
              : "Everything needed to price the shipment. Fields marked optional can be added later."}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} aria-label="Close">
          <X />
        </Button>
      </div>

      <div className="px-6 pt-5">
        {/* 1 · Client */}
        <Section title="Client" hint="Who is asking for the quote, and when.">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <div>
              <label htmlFor="enq-client" className="mb-1.5 block text-sm font-medium text-foreground">
                Client
              </label>
              {editing ? (
                <p id="enq-client" className="flex h-10 items-center rounded-control border border-border bg-subtle px-3 text-sm text-foreground">
                  {editing.client_name}
                </p>
              ) : (
                <ClientPicker id="enq-client" required value={client} onChange={setClient} />
              )}
            </div>
            <Input label="Enquiry date" type="date" required value={form.enquiry_date} onChange={(e) => patch({ enquiry_date: e.target.value })} />
          </div>
        </Section>

        {/* 2 · Transport */}
        <Section title="Transport" hint="The mode decides which equipment and weight rules apply.">
          <div role="radiogroup" aria-label="Mode of transport" className="grid grid-cols-3 gap-2">
            {MODES.map((m) => {
              const checked = form.mode === m.value;
              const Icon = m.icon;
              return (
                <label
                  key={m.value}
                  className={cn(
                    "press flex cursor-pointer flex-col items-start gap-2 rounded-card border p-3 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/25 sm:flex-row sm:items-center",
                    checked ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-border-strong hover:bg-subtle",
                  )}
                >
                  <input type="radio" name="enq-mode" value={m.value} checked={checked} onChange={() => patch({ mode: m.value })} className="sr-only" />
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-control",
                      checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-sm font-semibold", checked ? "text-primary-soft-foreground" : "text-foreground")}>{m.label}</span>
                    <span className="hidden text-xs text-muted-foreground sm:block">{m.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select id="enq-job-ref" label="Job ref" required value={form.job_ref} onChange={(e) => patch({ job_ref: e.target.value })}>
              <option value="">Select job ref…</option>
              {jobRefGroups.map((g) => (
                <optgroup key={g.mode} label={g.mode === form.mode ? `${g.label} (selected mode)` : g.label}>
                  {g.codes.map((code) => (
                    <option key={code} value={code}>
                      {code} — {jobRefNames[code]}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <Select id="enq-incoterm" label="Incoterm" required value={form.incoterm} onChange={(e) => patch({ incoterm: e.target.value })}>
              <option value="">Select incoterm…</option>
              {incoterms.map((t) => (
                <option key={t} value={t}>
                  {t} — {incotermNames[t]}
                </option>
              ))}
            </Select>
          </div>
        </Section>

        {/* 3 · Route */}
        <Section title="Route" hint="Origin and destination, and where to collect the cargo.">
          <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <Input label="From" required value={form.from} onChange={(e) => patch({ from: e.target.value })} placeholder="City or port of origin" />
            <ArrowRight className="mb-3 hidden size-4 text-muted-foreground sm:block" aria-hidden />
            <Input label="To" required value={form.to} onChange={(e) => patch({ to: e.target.value })} placeholder="City or port of destination" />
          </div>
          <Textarea
            id="enq-collection-address"
            label="Collection address (optional)"
            rows={2}
            maxLength={500}
            value={form.collection_address}
            onChange={(e) => patch({ collection_address: e.target.value })}
            placeholder="Building, street, area, city"
          />
        </Section>

        {/* 4 · Equipment (sea / road only) */}
        {form.mode === "sea" && (
          <Section title="Equipment" hint="Container or service needed for this sea shipment.">
            <div>
              <GroupLabel>Containers (FCL)</GroupLabel>
              <ChoiceChips
                name="enq-service-type"
                required
                value={form.service_type}
                onChange={(service_type) => patch({ service_type })}
                columns="grid-cols-2 sm:grid-cols-3"
                options={seaContainerTypes.map((t) => ({
                  value: t,
                  label: seaServiceTypeCodes[t],
                  hint: seaServiceTypeLabels[t].split("— ")[1],
                }))}
              />
            </div>
            <div>
              <GroupLabel>Other services</GroupLabel>
              <ChoiceChips
                name="enq-service-type"
                value={form.service_type}
                onChange={(service_type) => patch({ service_type })}
                columns="grid-cols-2 sm:grid-cols-3"
                options={seaOtherServiceTypes.map((t) => ({ value: t, label: seaServiceTypeCodes[t], hint: t === "lcl" ? "Less than container load" : undefined }))}
              />
            </div>
            {isReefer(form.service_type) && (
              <div className="animate-page-in sm:w-64">
                <Input
                  id="enq-reefer-temp"
                  label="Reefer temperature, °C"
                  type="number"
                  required
                  min={REEFER_TEMP_MIN}
                  max={REEFER_TEMP_MAX}
                  step="0.1"
                  inputMode="decimal"
                  value={form.reefer_temp}
                  onChange={(e) => patch({ reefer_temp: e.target.value })}
                  placeholder="e.g. -18 frozen, 4 chilled"
                />
              </div>
            )}
            {isOpenTop(form.service_type) && (
              <div className="animate-page-in">
                <GroupLabel>Gauge</GroupLabel>
                <ChoiceChips
                  name="enq-gauge"
                  required
                  value={form.gauge}
                  onChange={(gauge) => patch({ gauge })}
                  columns="grid-cols-2 sm:w-96"
                  options={gauges.map((g) => ({ value: g, label: gaugeLabels[g] }))}
                />
              </div>
            )}
          </Section>
        )}
        {form.mode === "land" && (
          <Section title="Equipment" hint="Truck needed, or LTL to share a truck.">
            <div>
              <GroupLabel>Full truckload (FTL)</GroupLabel>
              <ChoiceChips
                name="enq-truck-type"
                required
                value={form.truck_type}
                onChange={(truck_type) => patch({ truck_type })}
                options={ftlTruckTypes.map((t) => ({ value: t, label: truckTypeLabels[t] }))}
              />
            </div>
            <div>
              <GroupLabel>Shared</GroupLabel>
              <ChoiceChips
                name="enq-truck-type"
                value={form.truck_type}
                onChange={(truck_type) => patch({ truck_type })}
                options={sharedTruckTypes.map((t) => ({ value: t, label: "LTL", hint: "Less than truckload" }))}
              />
            </div>
          </Section>
        )}

        {/* 5 · Cargo */}
        <Section title="Cargo" hint="Dimensions per piece and the total weight. Chargeable weight is worked out for you.">
          <CargoDimensionsField
            bare
            mode={form.mode}
            unit={form.dimension_unit}
            onUnitChange={(dimension_unit) => patch({ dimension_unit })}
            lines={form.packages}
            onLinesChange={(packages) => patch({ packages })}
            actualWeight={form.actual_weight}
            onActualWeightChange={(actual_weight) => patch({ actual_weight })}
            stackable={form.stackable}
            onStackableChange={(stackable) => patch({ stackable })}
          />
        </Section>

        {/* 6 · Handling */}
        <Section title="Handling" hint="Customs and hazardous cargo.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-control border border-border p-3">
              <Switch
                id="enq-clearance"
                label="Customs clearance"
                description="Include clearance in the quote"
                checked={form.clearance}
                onChange={(clearance) => patch({ clearance })}
              />
            </div>
            <div className={cn("rounded-control border p-3 transition-colors", form.is_dg ? "border-warning/40 bg-warning-soft/60" : "border-border")}>
              <Switch
                id="enq-dg"
                label="Dangerous goods (DG)"
                description="Needs DG handling and declaration"
                tone="warning"
                checked={form.is_dg}
                onChange={(is_dg) => patch({ is_dg })}
              />
            </div>
          </div>
          {form.is_dg && (
            <div className="animate-page-in sm:w-1/2 sm:pl-0">
              <Input
                id="enq-un-number"
                label="UN number"
                required
                autoFocus
                value={form.un_number}
                onChange={(e) => patch({ un_number: e.target.value })}
                placeholder="e.g. UN1203 — separate several with commas"
                className="font-mono uppercase"
              />
            </div>
          )}
        </Section>

        {/* 7 · Payment */}
        <Section title="Payment" hint="How the client will pay.">
          <div className="flex flex-wrap items-end gap-4">
            <div role="radiogroup" aria-label="Payment mode" className="inline-flex rounded-control bg-muted p-1">
              {enquiryPaymentModes.map((p) => {
                const checked = form.payment_mode === p;
                return (
                  <label
                    key={p}
                    className={cn(
                      "press cursor-pointer rounded-[calc(var(--radius-control)-2px)] px-4 py-1.5 text-sm font-medium has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/25",
                      checked ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <input type="radio" name="enq-payment" value={p} checked={checked} onChange={() => patch({ payment_mode: p })} className="sr-only" />
                    {PAYMENT_LABEL[p] ?? p}
                  </label>
                );
              })}
            </div>
            {form.payment_mode === "credit" && (
              <div className="animate-page-in w-40">
                <Input
                  label="Credit days"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.credit_days}
                  onChange={(e) => patch({ credit_days: e.target.value })}
                  placeholder="e.g. 30"
                />
              </div>
            )}
          </div>
        </Section>

        {/* 8 · Quote (new enquiries only) */}
        {!editing && (
          <Section title="Quote (optional)" hint="Fill both to save it as Quoted, or leave both empty and quote later.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Provisional cost"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                required={form.provisional_profit !== ""}
                value={form.provisional_cost}
                onChange={(e) => patch({ provisional_cost: e.target.value })}
              />
              <Input
                label="Provisional profit"
                type="number"
                step="0.01"
                inputMode="decimal"
                required={form.provisional_cost !== ""}
                value={form.provisional_profit}
                onChange={(e) => patch({ provisional_profit: e.target.value })}
              />
              <div>
                <span className="mb-1.5 block text-sm font-medium text-foreground">Quoted price</span>
                <p className="flex h-10 items-center rounded-control border border-dashed border-border-strong bg-subtle px-3 text-sm font-semibold tabular-nums text-foreground">
                  {quoted === null ? <span className="font-normal text-muted-foreground">Cost + profit</span> : formatAmount(quoted)}
                </p>
              </div>
            </div>
          </Section>
        )}

        {/* 9 · Notes */}
        <Section title="Notes (optional)" hint="Anything else the pricing team should know.">
          <Textarea
            id="enq-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Cargo ready date, commodity, special handling…"
          />
        </Section>
      </div>

      {/* Footer (pinned): live summary, errors, actions */}
      <div className="sticky bottom-0 z-10 border-t border-border bg-card px-6 py-3">
        {error && (
          <p role="alert" className="animate-page-in mb-3 rounded-control bg-danger-soft px-3 py-2 text-sm font-medium text-danger-foreground">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{MODE_LABEL[form.mode] ?? form.mode}</span>
            {equipment && <> · {equipment}</>}
            {form.from && form.to && (
              <>
                {" "}· {form.from} → {form.to}
              </>
            )}
            {form.is_dg && <span className="text-warning-foreground"> · DG</span>}
          </p>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {editing ? "Save changes" : "Save enquiry"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
