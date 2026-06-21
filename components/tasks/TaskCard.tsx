import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

type Task = { description: string; due_date: Date | string; status: string; assignedTo?: { name: string | null }; createdBy?: { name: string | null } };

export function TaskCard({ task }: { task: Task }) {
  return <Card className="flex items-start justify-between gap-4"><div><p className="font-medium text-slate-950">{task.description}</p><p className="mt-1 text-sm text-slate-500">Assigned to {task.assignedTo?.name ?? "me"} - created by {task.createdBy?.name ?? "system"} - due {formatDate(task.due_date)}</p></div><Badge value={task.status} /></Card>;
}
