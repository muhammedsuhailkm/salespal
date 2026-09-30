export { orderModes as enquiryModes, orderPaymentModes as enquiryPaymentModes } from "@/types/order";

/** Placeholder list — replace with the final terms when provided. */
export const enquiryTerms = ["FCL", "LCL"] as const;

export type EnquiryStatus = "open" | "order_created" | "completed";

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
  term: string;
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
};
