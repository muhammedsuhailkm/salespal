import { Prisma } from "@prisma/client";
import { parseDateOnly } from "@/lib/salesman-targets";
import { cargoTotals, DEFAULT_DIMENSION_UNIT, isDimensionUnit, MAX_PACKAGE_LINES, round3, type CargoPackage, type DimensionUnit } from "@/lib/freight";
import { enquiryModes, enquiryPaymentModes, gauges, incoterms, isOpenTop, isReefer, jobRefs, REEFER_TEMP_MAX, REEFER_TEMP_MIN, seaServiceTypes, truckTypes, type JobRef } from "@/types/enquiry";

/** The shipment details of an enquiry (everything but client, figures and status). Shared by create and edit. */
export type EnquiryDetails = {
  enquiry_date: Date;
  mode: string;
  from: string;
  to: string;
  /** Pickup address; null when not given. */
  collection_address: string | null;
  job_ref: string;
  incoterm: string;
  payment_mode: string;
  credit_days: number | null;
  clearance: boolean;
  is_dg: boolean;
  /** Only when is_dg. */
  un_number: string | null;
  /** Null when no dimensions were given. */
  packages: CargoPackage[] | null;
  dimension_unit: DimensionUnit;
  actual_weight: number | null;
  /** null = not specified. */
  stackable: boolean | null;
  /** Computed: max(actual, volumetric). */
  chargeable_weight: number | null;
  /** Computed from the packing list. */
  cbm: number | null;
  service_type: string | null;
  /** °C, reefer containers only. */
  reefer_temp: number | null;
  /** ig | og, open top containers only. */
  gauge: string | null;
  truck_type: string | null;
  notes: string | null;
};

/** Optional measurement: blank → null, otherwise a number ≥ 0 rounded to 3 decimals; undefined when invalid. */
function measurement(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : undefined;
}

/** Packing list lines: each needs length, width, height > 0 and a whole quantity ≥ 1; undefined when invalid. */
function packingList(value: unknown): CargoPackage[] | undefined {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_PACKAGE_LINES) return undefined;
  const lines: CargoPackage[] = [];
  for (const raw of value) {
    const line = { length: Number(raw?.length), width: Number(raw?.width), height: Number(raw?.height), qty: Number(raw?.qty) };
    if (![line.length, line.width, line.height].every((n) => Number.isFinite(n) && n > 0)) return undefined;
    if (!Number.isInteger(line.qty) || line.qty < 1) return undefined;
    lines.push({ length: round3(line.length), width: round3(line.width), height: round3(line.height), qty: line.qty });
  }
  return lines;
}

/** "1203, un1950" → "UN1203, UN1950"; null when empty, undefined when any entry isn't UN + 4 digits. */
function unNumbers(value: unknown): string | null | undefined {
  const parts = String(value ?? "").split(/[\s,;/]+/).filter(Boolean);
  if (!parts.length) return null;
  const normalised = parts.map((p) => p.toUpperCase().replace(/^UN-?/, ""));
  if (!normalised.every((n) => /^\d{4}$/.test(n))) return undefined;
  return [...new Set(normalised)].map((n) => `UN${n}`).join(", ");
}

export function parseEnquiryDetails(body: Record<string, unknown>): { data: EnquiryDetails } | { error: string } {
  const enquiryDate = parseDateOnly(body.enquiry_date);
  const from = String(body.from ?? "").trim();
  const to = String(body.to ?? "").trim();
  const collectionAddress = String(body.collection_address ?? "").trim();
  const creditDays = body.payment_mode === "credit" ? Number(body.credit_days) : null;
  // Every mode takes a packing list and actual weight; CBM and chargeable weight are derived from them.
  // Sea also takes a service type, land a truck type; fields that don't belong to the mode are cleared.
  const packages = packingList(body.packages);
  const unit = body.dimension_unit === undefined || body.dimension_unit === null || body.dimension_unit === "" ? DEFAULT_DIMENSION_UNIT : body.dimension_unit;
  const actualWeight = measurement(body.actual_weight);
  const isDg = Boolean(body.is_dg);
  const unNumber = isDg ? unNumbers(body.un_number) : null;
  const serviceType = body.mode === "sea" ? String(body.service_type ?? "") : null;
  const reeferTemp = isReefer(serviceType) ? Number(body.reefer_temp) : null;
  const gauge = isOpenTop(serviceType) ? String(body.gauge ?? "") : null;
  const truckType = body.mode === "land" ? String(body.truck_type ?? "") : null;

  if (!enquiryDate) return { error: "Invalid enquiry date" };
  if (!enquiryModes.includes(body.mode as never)) return { error: "Invalid mode of transport" };
  if (!from || !to) return { error: "From and To are required" };
  if (collectionAddress.length > 500) return { error: "Collection address is too long (500 characters max)" };
  if (!jobRefs.includes(body.job_ref as JobRef)) return { error: "Select a job ref" };
  if (!incoterms.includes(body.incoterm as never)) return { error: "Select an incoterm" };
  if (!enquiryPaymentModes.includes(body.payment_mode as never)) return { error: "Invalid payment mode" };
  if (creditDays !== null && (!Number.isInteger(creditDays) || creditDays <= 0)) return { error: "Credit days must be a whole number above 0" };
  if (packages === undefined) return { error: `Each package line needs length, width and height above 0 and a whole quantity (max ${MAX_PACKAGE_LINES} lines)` };
  if (isDg && !unNumber) return { error: "Enter the UN number for dangerous goods (UN followed by 4 digits, e.g. UN1203)" };
  if (!isDimensionUnit(unit)) return { error: "Invalid dimension unit" };
  if (actualWeight === undefined) return { error: "Actual weight must be a number of 0 or more" };
  if (serviceType !== null && !seaServiceTypes.includes(serviceType as never)) return { error: "Select a service type" };
  if (reeferTemp !== null && (body.reefer_temp === "" || body.reefer_temp === null || body.reefer_temp === undefined || !Number.isFinite(reeferTemp) || reeferTemp < REEFER_TEMP_MIN || reeferTemp > REEFER_TEMP_MAX)) {
    return { error: `Enter the reefer temperature in °C (${REEFER_TEMP_MIN} to +${REEFER_TEMP_MAX})` };
  }
  if (gauge !== null && !gauges.includes(gauge as never)) return { error: "Select in gauge (IG) or out of gauge (OG) for the open top container" };
  if (truckType !== null && !truckTypes.includes(truckType as never)) return { error: "Select a truck type" };

  const totals = cargoTotals(packages, unit, body.mode as string, actualWeight);

  return {
    data: {
      enquiry_date: enquiryDate,
      mode: body.mode as string,
      from,
      to,
      collection_address: collectionAddress || null,
      job_ref: body.job_ref as string,
      incoterm: body.incoterm as string,
      payment_mode: body.payment_mode as string,
      credit_days: creditDays,
      clearance: Boolean(body.clearance),
      is_dg: isDg,
      un_number: unNumber ?? null,
      packages: packages.length ? packages : null,
      dimension_unit: unit,
      actual_weight: actualWeight,
      stackable: body.stackable === true || body.stackable === "true" ? true : body.stackable === false || body.stackable === "false" ? false : null,
      chargeable_weight: totals.chargeableWeight,
      cbm: totals.cbm,
      service_type: serviceType,
      reefer_temp: reeferTemp === null ? null : Math.round(reeferTemp * 10) / 10,
      gauge,
      truck_type: truckType,
      notes: body.notes ? String(body.notes).trim() || null : null,
    },
  };
}

export const ENQUIRY_FIELD_LABELS: Record<keyof EnquiryDetails, string> = {
  enquiry_date: "date",
  mode: "mode",
  from: "from",
  to: "to",
  collection_address: "collection address",
  job_ref: "job ref",
  incoterm: "incoterm",
  payment_mode: "payment mode",
  credit_days: "credit days",
  clearance: "clearance",
  is_dg: "dangerous goods",
  un_number: "UN number",
  packages: "dimensions",
  dimension_unit: "dimension unit",
  actual_weight: "actual weight",
  stackable: "stackability",
  chargeable_weight: "chargeable weight",
  cbm: "CBM",
  service_type: "service type",
  reefer_temp: "reefer temperature",
  gauge: "gauge",
  truck_type: "truck type",
  notes: "notes",
};

/** EnquiryDetails as Prisma write data (a null JSON column has to be written as DbNull). */
export function enquiryDetailsData(details: EnquiryDetails) {
  return { ...details, packages: details.packages ?? Prisma.DbNull };
}
