import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

type Task = { description: string; due_date: Date | string; status: string; assignedTo?: { name: string | null }; createdBy?: { name: string | null } };

function getDueDateColor(dueDate: Date | string) {
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 2) return "font-bold text-red-600";
  if (days <= 7) return "font-bold text-amber-600";
  return "font-bold text-emerald-600";
}

export function TaskCard({ task }: { task: Task }) {
  const dueColor = getDueDateColor(task.due_date);
  return (
    <Card className="flex items-start justify-between gap-4">
      <div>
        <p className="font-medium text-slate-950">{task.description}</p>
        <p className="mt-1 text-sm text-slate-500">
          Assigned to {task.assignedTo?.name ?? "me"} - created by {task.createdBy?.name ?? "system"} -{" "}
          <span className={dueColor}>due {formatDate(task.due_date)}</span>
        </p>
      </div>
      <Badge value={task.status} />
    </Card>
  );
}
