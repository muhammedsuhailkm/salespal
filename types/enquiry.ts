import type { CargoPackage } from "@/lib/freight";

export { orderModes as enquiryModes, orderPaymentModes as enquiryPaymentModes } from "@/types/order";

/** Placeholder list — replace with the final terms when provided. */
/** Job reference codes (job types), as used in the operations system. */
export const jobRefNames = {
  ACLE: "Air Clearance",
  AEGN: "Air Export - General",
  AEGP: "Air Export - Groupage",
  AIAE: "Air Import - Air Export",
  AIGN: "Air Import - General",
  AIGP: "Air Import - Groupage",
  AISE: "Air Sea",
  LTPT: "Land Transport",
  RCLE: "Road Clearance",
  REGN: "Road Export - General",
  RIGN: "Road Import - General",
  SCLE: "Sea Clearance",
  SEFL: "Sea Export FCL",
  SEGN: "Sea Export - General",
  SEGP: "Sea Export - Groupage",
  SIAE: "Sea Air",
  SIFL: "Sea Import FCL",
  SIGN: "Sea Import - General",
  SIGP: "Sea Import - Groupage",
  SISE: "Sea Import Sea Export",
  WHST: "Warehouse Storage",
} as const;
export type JobRef = keyof typeof jobRefNames;
export const jobRefs = Object.keys(jobRefNames) as JobRef[];

/** Sea freight service: an FCL container type, or a non-container service. */
export const seaContainerTypes = ["20dc", "40dc", "40hc", "20ot", "40ot", "20fr", "40fr", "20rf", "40rf"] as const;
export const seaOtherServiceTypes = ["lcl", "ro_ro", "break_bulk"] as const;
export const seaServiceTypes = [...seaContainerTypes, ...seaOtherServiceTypes] as const;
export type SeaServiceType = (typeof seaServiceTypes)[number];
/** Reefer containers take a set temperature. */
export const REEFER_TEMP_MIN = -70;
export const REEFER_TEMP_MAX = 40;
export function isReefer(serviceType: string | null | undefined) {
  return serviceType === "20rf" || serviceType === "40rf";
}

export function formatTemp(celsius: number) {
  return `${celsius > 0 ? "+" : ""}${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(celsius)} °C`;
}

/** Open top containers take a gauge: cargo within the container's dimensions or protruding beyond them. */
export const gauges = ["ig", "og"] as const;
export type Gauge = (typeof gauges)[number];
export const gaugeLabels: Record<Gauge, string> = { ig: "In gauge (IG)", og: "Out of gauge (OG)" };
export const gaugeCodes: Record<Gauge, string> = { ig: "IG", og: "OG" };
export function isOpenTop(serviceType: string | null | undefined) {
  return serviceType === "20ot" || serviceType === "40ot";
}

/** Industry code shown in tables: 20'DC, 40'HC… */
export const seaServiceTypeCodes: Record<SeaServiceType, string> = {
  "20dc": "20'DC",
  "40dc": "40'DC",
  "40hc": "40'HC",
  "20ot": "20'OT",
  "40ot": "40'OT",
  "20fr": "20'FR",
  "40fr": "40'FR",
  "20rf": "20'RF",
  "40rf": "40'RF",
  lcl: "LCL",
  ro_ro: "RO-RO",
  break_bulk: "Break bulk",
};
export const seaServiceTypeLabels: Record<SeaServiceType, string> = {
  "20dc": "20'DC — 20ft Dry container",
  "40dc": "40'DC — 40ft Dry container",
  "40hc": "40'HC — 40ft High Cube",
  "20ot": "20'OT — 20ft Open Top",
  "40ot": "40'OT — 40ft Open Top",
  "20fr": "20'FR — 20ft Flat Rack",
  "40fr": "40'FR — 40ft Flat Rack",
  "20rf": "20'RF — 20ft Reefer",
  "40rf": "40'RF — 40ft Reefer",
  lcl: "LCL — Less than container load",
  ro_ro: "RO-RO",
  break_bulk: "Break bulk",
};

/** Land freight truck types. */
/** Land freight: a dedicated truck (FTL) by type, or LTL (shared truck, charged by volumetric / actual weight). */
export const ftlTruckTypes = ["flatbed", "curtain_side", "closed_box", "reefer", "lowbed", "tipper", "light_truck", "pickup"] as const;
export const sharedTruckTypes = ["ltl"] as const;
export const truckTypes = [...ftlTruckTypes, ...sharedTruckTypes] as const;
export type TruckType = (typeof truckTypes)[number];
export const truckTypeLabels: Record<TruckType, string> = {
  flatbed: "Flatbed trailer",
  curtain_side: "Curtain side trailer",
  closed_box: "Closed box trailer",
  reefer: "Reefer (refrigerated) trailer",
  lowbed: "Lowbed trailer",
  tipper: "Tipper",
  light_truck: "Light truck (7–10 ton)",
  pickup: "Pickup (1–3 ton)",
  ltl: "LTL (less than truckload)",
};

/** Sea service type or land truck type label for the mode, or null. `short` gives the sea code (40'HC). */
export function equipmentLabel(e: { mode: string; service_type: string | null; truck_type: string | null }, short = false) {
  if (e.mode === "sea") {
    if (!e.service_type) return null;
    const type = e.service_type as SeaServiceType;
    return (short ? seaServiceTypeCodes[type] : seaServiceTypeLabels[type]) ?? e.service_type;
  }
  if (e.mode === "land") return e.truck_type ? truckTypeLabels[e.truck_type as TruckType] ?? e.truck_type : null;
  return null;
}

/** One-line cargo spec: "40'HC · 1,250 kg chg · 12.5 CBM" — or null. */
export function shipmentSpec(e: {
  mode: string;
  chargeable_weight: number | null;
  cbm: number | null;
  service_type: string | null;
  truck_type: string | null;
  reefer_temp?: number | null;
  gauge?: string | null;
  stackable?: boolean | null;
}) {
  const qty = (v: number) => new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(v);
  const parts = [
    equipmentLabel(e, true),
    e.reefer_temp != null ? formatTemp(e.reefer_temp) : null,
    e.stackable === false ? "Non-stackable" : null,
    e.gauge ? gaugeCodes[e.gauge as Gauge] ?? e.gauge : null,
    e.chargeable_weight !== null ? `${qty(e.chargeable_weight)} kg chg` : null,
    e.cbm !== null ? `${qty(e.cbm)} CBM` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Incoterms 2020 rules, in the order they are usually listed. */
export const incoterms = ["EXW", "FCA", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"] as const;
export type Incoterm = (typeof incoterms)[number];

export const incotermNames: Record<Incoterm, string> = {
  EXW: "Ex Works",
  FCA: "Free Carrier",
  FOB: "Free On Board",
  CFR: "Cost and Freight",
  CIF: "Cost, Insurance and Freight",
  CPT: "Carriage Paid To",
  CIP: "Carriage and Insurance Paid To",
  DAP: "Delivered at Place",
  DPU: "Delivered at Place Unloaded",
  DDP: "Delivered Duty Paid",
};

export const enquiryStatuses = ["inquiry_received", "quoted", "negotiation", "offer_revised", "confirmed", "lost"] as const;
export type EnquiryStatus = (typeof enquiryStatuses)[number];

export const enquiryStatusLabels: Record<EnquiryStatus, string> = {
  inquiry_received: "Inquiry received",
  quoted: "Quoted",
  negotiation: "On negotiations",
  offer_revised: "Offer revised",
  confirmed: "Confirmed",
  lost: "Lost",
};

/** Stages still being worked: they get 30-day follow-up tasks and can be marked lost. */
export const ACTIVE_ENQUIRY_STATUSES: readonly EnquiryStatus[] = ["inquiry_received", "quoted", "negotiation", "offer_revised"];

export function isActiveEnquiry(status: string) {
  return (ACTIVE_ENQUIRY_STATUSES as readonly string[]).includes(status);
}

export type EnquiryEventItem = {
  id: number;
  action: string;
  to_status: string | null;
  prev_cost: number | null;
  prev_profit: number | null;
  cost: number | null;
  profit: number | null;
  note: string | null;
  order_id: number | null;
  by: string;
  at: string;
};

export type EnquiryFollowUpItem = { id: number; comment: string; by: string; at: string };

export function enquiryRef(id: number) {
  return `ENQ-${String(id).padStart(5, "0")}`;
}

export type EnquiryListItem = {
  id: number;
  ref: string;
  client_id: number;
  client_name: string;
  enquiry_date: string; // YYYY-MM-DD
  mode: string;
  from: string;
  to: string;
  /** Pickup / collection address. */
  collection_address: string | null;
  job_ref: string | null;
  incoterm: string | null;
  payment_mode: string;
  credit_days: number | null;
  clearance: boolean;
  /** Dangerous goods, with UN number(s) like "UN1203, UN1950". */
  is_dg: boolean;
  un_number: string | null;
  /** Packing list in dimension_unit; empty when none given. */
  packages: CargoPackage[];
  dimension_unit: string;
  /** kg, as declared. */
  actual_weight: number | null;
  /** true stackable, false non-stackable, null not specified. */
  stackable: boolean | null;
  /** kg: the higher of actual and volumetric weight. */
  chargeable_weight: number | null;
  /** m³, from the packing list. */
  cbm: number | null;
  /** Sea: container / cargo type. Land: truck type. */
  service_type: string | null;
  /** °C, reefer containers only. */
  reefer_temp: number | null;
  /** ig | og, open top containers only. */
  gauge: string | null;
  truck_type: string | null;
  /** Null until quoted. */
  provisional_cost: number | null;
  provisional_profit: number | null;
  actual_cost: number | null;
  actual_profit: number | null;
  notes: string | null;
  status: EnquiryStatus;
  created_by: string;
  created_at: string;
  /** The live order (status transit / delivered / completed / cancelled). */
  order: { id: number; job_no: string | null; status: string } | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  /** Newest first. */
  follow_ups: EnquiryFollowUpItem[];
  /** True when a follow-up task for this enquiry is still outstanding. */
  follow_up_due: boolean;
  /** Stage history, newest first. */
  events: EnquiryEventItem[];
};
