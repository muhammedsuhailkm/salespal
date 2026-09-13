export const orderModes = ["air", "land", "sea"] as const;
export type OrderMode = (typeof orderModes)[number];

export const orderPaymentModes = ["card", "cash", "credit"] as const;
export type OrderPaymentMode = (typeof orderPaymentModes)[number];

export const orderStatuses = ["draft", "cancelled", "completed"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

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
  /** Always computed as amount - advance_amount wherever an order is read — never stored. */
  balance: number;
  from: string;
  to: string;
  status: OrderStatus | string;
  accounts_approval: OrderApprovalStatus | string;
  manager_approval: OrderApprovalStatus | string;
  created_by_id: number;
  created_at: string | Date;
  updated_at: string | Date;
  client?: { name: string };
  createdBy?: { name: string };
};

export type MonthlyOrderStat = {
  month: string | Date;
  orderCount: number;
  totalAmount: number;
  totalCollected: number;
  totalPending: number;
};
