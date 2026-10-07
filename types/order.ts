export const orderModes = ["air", "land", "sea"] as const;
export type OrderMode = (typeof orderModes)[number];

export const orderPaymentModes = ["card", "cash", "credit"] as const;
export type OrderPaymentMode = (typeof orderPaymentModes)[number];

export const orderStatuses = ["transit", "delivered", "completed", "revision_requested", "cancelled"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const orderStatusLabels: Record<OrderStatus, string> = {
  transit: "Transit",
  delivered: "Delivered",
  completed: "Completed",
  revision_requested: "Revision requested",
  cancelled: "Cancelled",
};

export function orderStatusLabel(status: string) {
  return orderStatusLabels[status as OrderStatus] ?? status;
}

/** Orders that no longer count: excluded from totals, receivables and targets. */
export const VOID_ORDER_STATUSES: readonly OrderStatus[] = ["cancelled", "revision_requested"];

/** Orders still in play (not closed out by completion, revision or cancellation). */
export const OPEN_ORDER_STATUSES: readonly OrderStatus[] = ["transit", "delivered"];

export const orderApprovalStatuses = ["pending", "approved", "rejected"] as const;
export type OrderApprovalStatus = (typeof orderApprovalStatuses)[number];

export type OrderListItem = {
  id: number;
  client_id: number;
  mode: OrderMode | string;
  description: string;
  payment_mode: OrderPaymentMode | string;
  amount: number;
  advance_amount: number;
  /** advance_amount + recorded payments — computed on read, never stored. */
  paid_amount: number;
  /** amount - paid_amount — computed on read, never stored. */
  balance: number;
  payments: OrderPaymentItem[];
  from: string;
  to: string;
  status: OrderStatus | string;
  accounts_approval: OrderApprovalStatus | string;
  manager_approval: OrderApprovalStatus | string;
  created_by_id: number;
  enquiry_id?: number | null;
  job_no?: string | null;
  invoice_date?: string | Date | null;
  due_date?: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  client?: { name: string };
  createdBy?: { name: string };
  /** Set when an order was cancelled or sent back for revision. */
  closed_reason?: string | null;
  /** The enquiry it was created from (kept after a revision request). */
  origin_enquiry_id?: number | null;
  /** The source enquiry's figures, for accounts to start from. */
  quote?: { cost: number | null; profit: number | null; actual_cost: number | null; actual_profit: number | null; credit_days: number | null } | null;
};

export const orderPaymentMethods = ["cash", "card", "bank_transfer", "cheque"] as const;

export type OrderPaymentItem = {
  id: number;
  amount: number;
  paid_on: string; // YYYY-MM-DD
  method: string;
  reference: string | null;
  notes: string | null;
  recorded_by: string;
};

export type MonthlyOrderStat = {
  month: string | Date;
  orderCount: number;
  totalAmount: number;
  totalCollected: number;
  totalPending: number;
};
