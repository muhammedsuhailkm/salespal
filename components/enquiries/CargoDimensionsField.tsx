"use client";

import { Plus, Trash2 } from "lucide-react";
import { cn, formatQuantity } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  cargoTotals,
  dimensionUnitLabels,
  dimensionUnits,
  lineCbm,
  MAX_PACKAGE_LINES,
  volumetricRuleLabels,
  type CargoPackage,
  type DimensionUnit,
} from "@/lib/freight";

/** A packing-list line as typed (strings, so fields can be blank while editing). */
export type PackageLineInput = { length: string; width: string; height: string; qty: string };

export const emptyPackageLine = (): PackageLineInput => ({ length: "", width: "", height: "", qty: "1" });

const isBlank = (l: PackageLineInput) => !l.length && !l.width && !l.height;

/** Lines worth sending: anything with a dimension typed in (the server rejects incomplete ones). */
export function packageLinesPayload(lines: PackageLineInput[]) {
  return lines.filter((l) => !isBlank(l)).map((l) => ({ length: Number(l.length), width: Number(l.width), height: Number(l.height), qty: Number(l.qty) }));
}

/** Complete, valid lines only — what the live totals are built from. */
function validLines(lines: PackageLineInput[]): CargoPackage[] {
  return packageLinesPayload(lines).filter(
    (p) => [p.length, p.width, p.height].every((n) => Number.isFinite(n) && n > 0) && Number.isInteger(p.qty) && p.qty >= 1,
  );
}

const cellClass =
  "h-9 w-full min-w-0 rounded-md border border-border-strong bg-card px-2 text-sm tabular-nums outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20";

const DIMENSIONS = [
  { key: "length", label: "Length", short: "L" },
  { key: "width", label: "Width", short: "W" },
  { key: "height", label: "Height", short: "H" },
] as const;

/**
 * Packing list (L × W × H × nos) with a unit switch, actual weight, and a live summary of
 * CBM, volumetric weight for the mode, and the chargeable weight (whichever is higher).
 */
export function CargoDimensionsField({
  mode,
  unit,
  onUnitChange,
  lines,
  onLinesChange,
  actualWeight,
  onActualWeightChange,
  stackable,
  onStackableChange,
  bare = false,
}: {
  mode: string;
  unit: DimensionUnit;
  onUnitChange: (unit: DimensionUnit) => void;
  lines: PackageLineInput[];
  onLinesChange: (lines: PackageLineInput[]) => void;
  actualWeight: string;
  onActualWeightChange: (value: string) => void;
  /** "" = not specified (older enquiries). */
  stackable: "" | "true" | "false";
  onStackableChange: (value: "true" | "false") => void;
  /** No box of its own (when a form section already groups it). */
  bare?: boolean;
}) {
  const actual = actualWeight === "" || !(Number(actualWeight) >= 0) ? null : Number(actualWeight);
  const totals = cargoTotals(validLines(lines), unit, mode, actual);
  const update = (i: number, patch: Partial<PackageLineInput>) => onLinesChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => onLinesChange(lines.length === 1 ? [emptyPackageLine()] : lines.filter((_, j) => j !== i));

  return (
    <div role="group" aria-labelledby="enq-cargo-label" className={cn("space-y-3", !bare && "rounded-lg border border-border p-3")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id="enq-cargo-label" className="text-sm font-medium text-foreground/85">
          {bare ? "Dimensions" : "Cargo dimensions"} <span className="font-normal text-muted-foreground">(per piece)</span>
        </span>
        <div role="radiogroup" aria-label="Dimension unit" className="inline-flex rounded-lg bg-muted p-0.5">
          {dimensionUnits.map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={unit === u}
              onClick={() => onUnitChange(u)}
              className={cn(
                "min-w-10 cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition",
                unit === u ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {dimensionUnitLabels[u]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div aria-hidden className="grid grid-cols-[1fr_1fr_1fr_3.75rem_2rem] gap-1.5 text-xs font-medium text-muted-foreground sm:grid-cols-[1fr_1fr_1fr_4.5rem_5rem_2rem]">
          {DIMENSIONS.map((d) => (
            <span key={d.key}>
              {d.short} <span className="normal-case">({dimensionUnitLabels[unit]})</span>
            </span>
          ))}
          <span>Nos</span>
          <span className="hidden text-right sm:block">CBM</span>
          <span />
        </div>
        {lines.map((line, i) => {
          const complete = validLines([line]);
          return (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_3.75rem_2rem] items-center gap-1.5 sm:grid-cols-[1fr_1fr_1fr_4.5rem_5rem_2rem]">
              {DIMENSIONS.map((d) => (
                <input
                  key={d.key}
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  aria-label={`Line ${i + 1} ${d.label.toLowerCase()} (${dimensionUnitLabels[unit]})`}
                  required={!isBlank(line)}
                  value={line[d.key]}
                  onChange={(e) => update(i, { [d.key]: e.target.value })}
                  className={cellClass}
                />
              ))}
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                aria-label={`Line ${i + 1} number of pieces`}
                required={!isBlank(line)}
                value={line.qty}
                onChange={(e) => update(i, { qty: e.target.value })}
                className={cellClass}
              />
              <span className="hidden text-right text-xs tabular-nums text-muted-foreground sm:block">
                {complete.length ? formatQuantity(Math.round(lineCbm(complete[0], unit) * 1000) / 1000) : "—"}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove line ${i + 1}`}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground/80 transition hover:bg-danger-soft hover:text-danger-foreground"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
        {lines.length < MAX_PACKAGE_LINES && (
          <button
            type="button"
            onClick={() => onLinesChange([...lines, emptyPackageLine()])}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-foreground/70 transition hover:bg-muted hover:text-foreground"
          >
            <Plus size={13} /> Add line
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <label htmlFor="enq-actual-weight" className="block text-sm font-medium text-foreground/85">
        <span className="mb-1 block">Actual gross weight, kg (total)</span>
        <input
          id="enq-actual-weight"
          type="number"
          min="0"
          step="0.001"
          inputMode="decimal"
          value={actualWeight}
          onChange={(e) => onActualWeightChange(e.target.value)}
          placeholder="e.g. 1250"
          className={cn(cellClass, "h-10 px-3 sm:w-56")}
        />
      </label>

      <div>
        <span id="enq-stackable-label" className="mb-1 block text-sm font-medium text-foreground/85">Stacking</span>
        <SegmentedControl
          label="Stacking"
          value={stackable}
          onChange={(v) => onStackableChange(v as "true" | "false")}
          options={[
            { value: "true", label: "Stackable" },
            { value: "false", label: "Non-stackable" },
          ]}
        />
      </div>
      </div>

      <div className="rounded-md bg-subtle p-3" aria-live="polite">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <Summary label="Pieces" value={totals.pieces ? formatQuantity(totals.pieces) : "—"} />
          <Summary label="Volume" value={totals.cbm !== null ? `${formatQuantity(totals.cbm)} m³` : "—"} />
          <Summary
            label="Volumetric wt"
            value={totals.volumetricWeight !== null ? `${formatQuantity(totals.volumetricWeight)} kg` : "—"}
            emphasis={totals.basis === "volumetric"}
          />
          <Summary label="Actual wt" value={totals.actualWeight !== null ? `${formatQuantity(totals.actualWeight)} kg` : "—"} emphasis={totals.basis === "actual"} />
        </dl>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-2.5">
          <span className="text-sm font-medium text-foreground/85">Chargeable weight</span>
          <span className="text-right">
            <span className="text-base font-semibold tabular-nums text-foreground">
              {totals.chargeableWeight !== null ? `${formatQuantity(totals.chargeableWeight)} kg` : "—"}
            </span>
            {totals.basis && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                {totals.basis === "volumetric" ? "Volumetric" : "Actual"}
              </span>
            )}
          </span>
        </div>
        {volumetricRuleLabels[mode] && <p className="mt-1.5 text-[11px] text-muted-foreground">{volumetricRuleLabels[mode]}</p>}
      </div>
    </div>
  );
}

function Summary({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn("truncate tabular-nums", emphasis ? "font-semibold text-foreground" : "text-foreground/85")}>{value}</dd>
    </div>
  );
}
