import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

type TaskItem = { id: number; description: string; due_date: Date | string; status: string; assignedTo?: { name: string | null } };

// Status priority: pending -> in_process -> achieved -> unsuccessful
const STATUS_PRIORITY: Record<string, number> = {
  pending: 0,
  in_process: 1,
  achieved: 2,
  unsuccessful: 3,
};

function getDueDateColor(dueDate: Date | string) {
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 2) return { text: "font-bold text-red-600", icon: "text-red-500" };
  if (days <= 7) return { text: "font-bold text-amber-600", icon: "text-amber-500" };
  return { text: "font-bold text-emerald-600", icon: "text-emerald-500" };
}

export function TaskOverview({ tasks }: { tasks: TaskItem[] }) {
  // Sort tasks by status priority, then by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 99;
    const pb = STATUS_PRIORITY[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  // Display top 5 tasks on the dashboard overview
  const displayedTasks = sortedTasks.slice(0, 5);

  return (
    <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {displayedTasks.map((task) => {
        const colors = getDueDateColor(task.due_date);
        return (
          <div className="flex items-center justify-between gap-4 p-4" key={task.id}>
            <div>
              <p className="text-sm font-medium text-slate-900">{task.description}</p>
              <p className="mt-1 text-xs text-slate-500">
                {task.assignedTo?.name ?? "Unassigned"} - <span className={colors.text}>due {formatDate(task.due_date)}</span>
              </p>
            </div>
            <Badge value={task.status} />
          </div>
        );
      })}
    </div>
  );
}
