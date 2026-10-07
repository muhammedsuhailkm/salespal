export const taskStatuses = ["pending", "in_process", "achieved", "unsuccessful"] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export type TaskListItem = {
  id: number;
  description: string;
  due_date: string;
  notification: boolean;
  status: TaskStatus | string;
  assignedTo?: { name: string };
  createdBy?: { name: string };
};

/** Values users can pick for a task's type (stored in tasks.category; NULL = general). */
export const taskCategories = ["order_follow_up", "payment_follow_up"] as const;
export type TaskCategory = (typeof taskCategories)[number];

/** What a task is about — derived in SQL from enquiry_id / category (see lib/tasks-list.ts). */
export type TaskKind = "general" | "enquiry_follow_up" | "order_follow_up" | "payment_follow_up";

export const taskKindLabels: Record<TaskKind, string> = {
  general: "General",
  enquiry_follow_up: "Enquiry follow-up",
  order_follow_up: "Order follow-up",
  payment_follow_up: "Payment follow-up",
};
