import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

type TaskItem = { id: number; description: string; due_date: Date | string; status: string; assignedTo?: { name: string | null } };

export function TaskOverview({ tasks }: { tasks: TaskItem[] }) {
  return <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">{tasks.map((task) => <div className="flex items-center justify-between gap-4 p-4" key={task.id}><div><p className="text-sm font-medium text-slate-900">{task.description}</p><p className="mt-1 text-xs text-slate-500">{task.assignedTo?.name ?? "Unassigned"} - due {formatDate(task.due_date)}</p></div><Badge value={task.status} /></div>)}</div>;
}
