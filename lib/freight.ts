/**
 * Cargo measurements for an enquiry: package dimensions → CBM → volumetric weight, and the
 * chargeable weight (the higher of actual and volumetric). Pure, so the form previews exactly
 * what the server stores.
 */

export const dimensionUnits = ["cm", "m", "ft", "in"] as const;
export type DimensionUnit = (typeof dimensionUnits)[number];
export const DEFAULT_DIMENSION_UNIT: DimensionUnit = "m";
export const dimensionUnitLabels: Record<DimensionUnit, string> = { cm: "cm", m: "m", ft: "ft", in: "inch" };

const CM_PER_UNIT: Record<DimensionUnit, number> = { cm: 1, m: 100, ft: 30.48, in: 2.54 };

/**
 * Volumetric divisor per mode, in cm³ per kg: L × W × H (cm) / divisor = volumetric kg.
 * Air 6,000 (1 m³ = 167 kg), road 3,000 (1 m³ = 333 kg), ocean LCL 1,000 (1 m³ = 1,000 kg).
 */
export const volumetricDivisors: Record<string, number> = { air: 6000, land: 3000, sea: 1000 };

export const volumetricRuleLabels: Record<string, string> = {
  air: "Air · L×W×H (cm) ÷ 6,000 · 1 m³ = 167 kg",
  land: "Road · L×W×H (cm) ÷ 3,000 · 1 m³ = 333 kg",
  sea: "Ocean LCL · L×W×H (cm) ÷ 1,000 · 1 m³ = 1,000 kg",
};

/** One line of the packing list: dimensions of a single piece in the enquiry's unit, and how many. */
export type CargoPackage = { length: number; width: number; height: number; qty: number };

export const MAX_PACKAGE_LINES = 50;

export type CargoTotals = {
  pieces: number;
  /** m³ */
  cbm: number | null;
  /** kg */
  volumetricWeight: number | null;
  actualWeight: number | null;
  chargeableWeight: number | null;
  /** Which weight the chargeable weight came from; null when there is neither. */
  basis: "actual" | "volumetric" | null;
};

export const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function isDimensionUnit(value: unknown): value is DimensionUnit {
  return dimensionUnits.includes(value as DimensionUnit);
}

/** Volume of one line (all its pieces) in m³. */
export function lineCbm(p: CargoPackage, unit: DimensionUnit) {
  const f = CM_PER_UNIT[unit];
  return (p.length * f * p.width * f * p.height * f * p.qty) / 1_000_000;
}

export function cargoTotals(packages: CargoPackage[], unit: DimensionUnit, mode: string, actualWeight: number | null): CargoTotals {
  const pieces = packages.reduce((sum, p) => sum + p.qty, 0);
  const cubicCm = packages.reduce((sum, p) => sum + lineCbm(p, unit) * 1_000_000, 0);
  const divisor = volumetricDivisors[mode];
  const cbm = packages.length ? round3(cubicCm / 1_000_000) : null;
  const volumetricWeight = packages.length && divisor ? round3(cubicCm / divisor) : null;
  const actual = actualWeight === null ? null : round3(actualWeight);

  let chargeableWeight: number | null = null;
  let basis: CargoTotals["basis"] = null;
  if (actual !== null || volumetricWeight !== null) {
    basis = (volumetricWeight ?? -1) > (actual ?? -1) ? "volumetric" : "actual";
    chargeableWeight = basis === "volumetric" ? volumetricWeight : actual;
  }
  return { pieces, cbm, volumetricWeight, actualWeight: actual, chargeableWeight, basis };
}

/** Reads a stored packing list defensively (it's a JSON column); malformed lines are dropped. */
export function readPackages(value: unknown): CargoPackage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((p) => {
    const line = { length: Number(p?.length), width: Number(p?.width), height: Number(p?.height), qty: Number(p?.qty) };
    return Object.values(line).every((n) => Number.isFinite(n) && n > 0) ? [line] : [];
  });
}

/** Order-independent key for comparing packing lists (jsonb reorders object keys). */
export function packagesKey(packages: CargoPackage[] | null) {
  return (packages ?? []).map((p) => `${p.length}x${p.width}x${p.height}*${p.qty}`).join(";");
}
