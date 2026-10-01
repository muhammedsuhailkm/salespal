export type TargetState = "active" | "upcoming" | "achieved" | "missed" | "replaced";

export type SalesmanTargetView = {
  id: number;
  amount: number;
  /** Sum of the salesman's non-cancelled order amounts created inside the period. */
  achieved: number;
  /** achieved / amount as a percentage (uncapped). */
  percent: number;
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  state: TargetState;
  set_by: string;
  created_at: string;
};

export type SalesmanTargetRow = {
  id: number;
  name: string;
  email: string;
  clientCount: number;
  /** Actual profit summed over completed enquiries (order fully paid). */
  completedProfit: { profit: number; count: number };
  /** Target whose period covers today, if any. */
  current: SalesmanTargetView | null;
  /** All targets, newest first — includes the current one. */
  history: SalesmanTargetView[];
};
