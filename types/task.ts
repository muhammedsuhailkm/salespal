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
