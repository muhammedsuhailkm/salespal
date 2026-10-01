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

export type EnquiryStatus = "open" | "order_created" | "completed" | "cancelled";

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
  job_ref: string | null;
  incoterm: string | null;
  payment_mode: string;
  credit_days: number | null;
  clearance: boolean;
  provisional_cost: number;
  provisional_profit: number;
  actual_cost: number | null;
  actual_profit: number | null;
  notes: string | null;
  status: EnquiryStatus;
  created_by: string;
  created_at: string;
  order: { id: number; job_no: string | null } | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  /** Newest first. */
  follow_ups: EnquiryFollowUpItem[];
  /** True when a follow-up task for this enquiry is still outstanding. */
  follow_up_due: boolean;
};
