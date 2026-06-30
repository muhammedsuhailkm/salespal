"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Calendar,
  X,
  Loader2,
  ListTodo
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { cn, formatDate, titleCase } from "@/lib/utils";
import { taskStatuses } from "@/types/task";

type Task = {
  id: number;
  description: string;
  due_date: Date | string;
  status: string;
  assignedTo?: { name: string | null };
  createdBy?: { name: string | null };
  created_by_id?: number;
  isClientTask?: boolean;
  clientId?: number | null;
  clientName?: string | null;
};

interface SalesmanTasksListProps {
  myInProcessTasks: Task[];
  managerAssignedTasks: Task[];
}

const STATUS_SELECT_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 ring-slate-200",
  in_process: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  achieved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  unsuccessful: "bg-red-50 text-red-700 ring-red-200",
};

export function SalesmanTasksList({
  myInProcessTasks,
  managerAssignedTasks
}: SalesmanTasksListProps) {
  const router = useRouter();

  // Local state for instant optimistic updates
  const [localMyTasks, setLocalMyTasks] = useState<Task[]>(myInProcessTasks);
  const [localManagerTasks, setLocalManagerTasks] = useState<Task[]>(managerAssignedTasks);

  // Sync local state when props change
  useEffect(() => {
    setLocalMyTasks(myInProcessTasks);
  }, [myInProcessTasks]);

  useEffect(() => {
    setLocalManagerTasks(managerAssignedTasks);
  }, [managerAssignedTasks]);

  // Type filter: "all" | "general" | "client"
  const [typeFilter, setTypeFilter] = useState<"all" | "general" | "client">("all");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [addTaskForm, setAddTaskForm] = useState({
    description: "",
    due_date: "",
    status: "pending",
    notification: false
  });

  // Action / loading states
  const [isSaving, setIsSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Status priority: pending at top, unsuccessful at bottom
  const STATUS_PRIORITY: Record<string, number> = {
    pending: 0,
    in_process: 1,
    achieved: 2,
    unsuccessful: 3,
  };

  // Combine tasks into a single list
  const combinedTasks = useMemo(() => {
    const list: Array<{ id: string; date: Date; data: Task }> = [];

    localMyTasks.forEach((t) => {
      const prefix = t.isClientTask ? "client-task" : "task";
      list.push({ id: `${prefix}-${t.id}`, date: new Date(t.due_date), data: t });
    });
    localManagerTasks.forEach((t) => {
      const prefix = t.isClientTask ? "client-task" : "task";
      list.push({ id: `${prefix}-${t.id}`, date: new Date(t.due_date), data: t });
    });

    // Apply type filter
    const filtered = list.filter((item) => {
      if (typeFilter === "general") return !item.data.isClientTask;
      if (typeFilter === "client") return !!item.data.isClientTask;
      return true;
    });

    // Sort by status priority first, then by due date within same status
    return filtered.sort((a, b) => {
      const priorityA = STATUS_PRIORITY[a.data.status] ?? 99;
      const priorityB = STATUS_PRIORITY[b.data.status] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.date.getTime() - b.date.getTime();
    });
  }, [localMyTasks, localManagerTasks, typeFilter]);

  // Add task submission
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: addTaskForm.description,
          due_date: addTaskForm.due_date,
          status: addTaskForm.status,
          notification: addTaskForm.notification
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      triggerToast("Task added successfully!");
      setAddTaskForm({
        description: "",
        due_date: "",
        status: "pending",
        notification: false
      });
      setIsAddOpen(false);
      if (data.task) {
        setLocalMyTasks((prev) => [data.task, ...prev]);
      }
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(taskId: number, newStatus: string, isClientTask?: boolean, clientId?: number) {
    setUpdatingTaskId(taskId);

    try {
      const url = isClientTask
        ? `/api/clients/${clientId}/tasks/${taskId}`
        : `/api/tasks/${taskId}`;

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      triggerToast("Task status updated");
      if (data.task) {
        setLocalMyTasks((prev) =>
          prev.map((t) => (t.id === data.task.id ? { ...t, status: data.task.status } : t)),
        );
        setLocalManagerTasks((prev) =>
          prev.map((t) => (t.id === data.task.id ? { ...t, status: data.task.status } : t)),
        );
      }
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      triggerToast(message);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Tasks ({combinedTasks.length})</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
            <span>Created by you: <strong className="text-slate-800 font-semibold">{myInProcessTasks.length}</strong></span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span>Assigned by managers: <strong className="text-slate-800 font-semibold">{managerAssignedTasks.length}</strong></span>
          </div>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm"
        >
          <Plus size={14} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Type filter tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: "all" as const, label: "All Tasks" },
          { key: "general" as const, label: "General" },
          { key: "client" as const, label: "Client Tasks" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTypeFilter(tab.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer",
              typeFilter === tab.key
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Unified Single Vertical List Layout */}
      <div className="max-w-2xl mx-auto space-y-4">
        {combinedTasks.length > 0 ? (
          combinedTasks.map((item) => {
            const task = item.data;
            return (
              <div
                key={item.id}
                className="relative flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                {/* Task Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                      <ListTodo size={10} />
                      <span>Task</span>
                    </span>
                    {task.isClientTask && task.clientName && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-250 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        <span>Client: {task.clientName}</span>
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-slate-400">
                      {task.createdBy?.name ? `Assigned by ${task.createdBy.name}` : "Created by you"}
                    </span>
                  </div>
                  <div className="relative shrink-0">
                    {updatingTaskId === task.id && (
                      <Loader2
                        size={14}
                        className="absolute -left-5 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                      />
                    )}
                    <select
                      value={task.status}
                      onChange={(e) =>
                        handleStatusChange(task.id, e.target.value, task.isClientTask, task.clientId ?? undefined)
                      }
                      disabled={updatingTaskId === task.id}
                      aria-label={`Update status for ${task.description}`}
                      className={cn(
                        "cursor-pointer appearance-none rounded-full py-1 pl-2.5 pr-7 text-xs font-medium ring-1 outline-none transition focus:ring-2 focus:ring-indigo-200 disabled:cursor-wait disabled:opacity-60",
                        STATUS_SELECT_COLORS[task.status] ??
                          STATUS_SELECT_COLORS.pending,
                      )}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 0.5rem center",
                      }}
                    >
                      {taskStatuses.map((status) => (
                        <option key={status} value={status}>
                          {titleCase(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Task Description */}
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {task.description}
                  </p>
                </div>

                {/* Task Footer */}
                <div className="mt-1 flex items-center border-t border-slate-50 pt-2.5 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Calendar size={12} className={(() => {
                      const days = Math.ceil((new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      if (days <= 2) return "text-red-500";
                      if (days <= 7) return "text-amber-500";
                      return "text-emerald-500";
                    })()} />
                    <span className={(() => {
                      const days = Math.ceil((new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      if (days <= 2) return "font-bold text-red-600";
                      if (days <= 7) return "font-bold text-amber-600";
                      return "font-bold text-emerald-600";
                    })()}>Due {formatDate(task.due_date)}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
            No tasks found.
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      <Modal open={isAddOpen}>
        <div className="relative">
          <button
            onClick={() => setIsAddOpen(false)}
            className="absolute -top-1.5 -right-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
          
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Add New Task</h3>
            <p className="text-xs text-slate-500">Create a task. It will automatically assign to you.</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="add-task-desc">
                Task Description
              </label>
              <textarea
                id="add-task-desc"
                required
                value={addTaskForm.description}
                onChange={(e) => setAddTaskForm({ ...addTaskForm, description: e.target.value })}
                placeholder="e.g. Follow up with prospect"
                rows={3}
                className="w-full rounded-md border border-slate-300 bg-white p-3 text-xs outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <Input
              label="Due Date"
              type="date"
              required
              value={addTaskForm.due_date}
              onChange={(e) => setAddTaskForm({ ...addTaskForm, due_date: e.target.value })}
              className="text-xs"
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="add-task-status">
                Task Status
              </label>
              <select
                id="add-task-status"
                value={addTaskForm.status}
                onChange={(e) => setAddTaskForm({ ...addTaskForm, status: e.target.value })}
                className="h-10 px-3 text-xs rounded-md border border-slate-300 bg-white outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-100 cursor-pointer"
              >
                <option value="pending">Pending</option>
                <option value="in_process">In Process</option>
                <option value="achieved">Achieved</option>
                <option value="unsuccessful">Unsuccessful</option>
              </select>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                id="add-task-notif"
                type="checkbox"
                checked={addTaskForm.notification}
                onChange={(e) => setAddTaskForm({ ...addTaskForm, notification: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
              />
              <label className="text-xs font-medium text-slate-700 cursor-pointer select-none" htmlFor="add-task-notif">
                Enable alert/notification
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSaving && <Loader2 size={12} className="animate-spin" />}
                <span>Save Task</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <Toast message={toastMsg || undefined} />
    </div>
  );
}
