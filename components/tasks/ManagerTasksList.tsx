"use client";

import { useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { ClientPicker } from "@/components/clients/ClientPicker";
import { useDebouncedParam, useUrlFilters } from "@/hooks/useUrlFilters";
import type { TasksPage } from "@/lib/tasks-list";
import { useRouter } from "next/navigation";
import {
  Plus,
  Calendar,
  X,
  Loader2,
  ListTodo,
  User,
  Building,
  AlertCircle,
  Search,
  Trash2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { cn, formatDate, titleCase } from "@/lib/utils";
import { taskStatuses } from "@/types/task";

import { buttonVariants } from "@/components/ui/Button";
type UnifiedTask = {
  id: number;
  description: string;
  due_date: Date | string;
  status: string;
  assignedTo?: { name: string | null } | null;
  createdBy?: { name: string | null } | null;
  created_by_id?: number;
  isClientTask: boolean;
  clientId?: number | null;
  clientName?: string | null;
};

type SalesmanItem = {
  id: number;
  name: string;
};

interface ManagerTasksListProps {
  /** One server-filtered page of tasks (general + client tasks merged). */
  data: TasksPage;
  salesmen: SalesmanItem[];
}

const STATUS_SELECT_COLORS: Record<string, string> = {
  pending: "bg-muted text-foreground/85 ring-border",
  in_process: "bg-info-soft text-info-foreground ring-info/30",
  achieved: "bg-success-soft text-success-foreground ring-success/30",
  unsuccessful: "bg-danger-soft text-danger-foreground ring-danger/30",
};

export function ManagerTasksList({ data, salesmen }: ManagerTasksListProps) {
  const router = useRouter();

  // Optimistic edits layered over the server page until router.refresh() delivers fresh rows.
  const [localTasks, setLocalTasks] = useState<UnifiedTask[]>(data.rows);
  const [syncedRows, setSyncedRows] = useState(data.rows);
  if (data.rows !== syncedRows) {
    setSyncedRows(data.rows);
    setLocalTasks(data.rows);
  }

  // Filters and search live in the URL and are applied by the server.
  const { get, set, isPending: isNavigating } = useUrlFilters();
  const [searchQuery, setSearchQuery] = useDebouncedParam("q", set, get("q"));
  const statusFilter = get("status", "all");
  const salesmanFilter = get("salesman", "all");
  const typeFilter = (get("type") || "all") as "all" | "general" | "client";
  const [pickedClient, setPickedClient] = useState<{ id: number; name: string } | null>(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [addTaskForm, setAddTaskForm] = useState({
    title: "",
    description: "",
    type: "Call",
    due_date: "",
    assigned_to_id: "",
    client_id: "",
    notification: true, // Default to true (on)
  });

  // Action / loading states
  const [isSaving, setIsSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredTasks = localTasks;

  // Submit task handler
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);

    const isClientLinked = pickedClient !== null;
    const selectedClientId = pickedClient?.id ?? 0;
    const assignedSalesmanId = Number(addTaskForm.assigned_to_id);

    if (isNaN(assignedSalesmanId)) {
      setErrorMsg("Please select a salesman to assign the task.");
      setIsSaving(false);
      return;
    }

    // Format task description: e.g. [Call] Follow up with prospect - note details
    const combinedDesc = `[${addTaskForm.type}] ${addTaskForm.title}${
      addTaskForm.description ? ` — ${addTaskForm.description}` : ""
    }`;

    try {
      const url = isClientLinked
        ? `/api/clients/${selectedClientId}/tasks`
        : `/api/tasks`;

      const bodyData = isClientLinked
        ? {
            description: combinedDesc,
            due_date: addTaskForm.due_date,
            assigned_to_id: assignedSalesmanId,
            status: "pending",
          }
        : {
            description: combinedDesc,
            due_date: addTaskForm.due_date,
            assigned_to_id: assignedSalesmanId,
            status: "pending",
            notification: addTaskForm.notification,
          };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      triggerToast("Task assigned successfully!");
      setAddTaskForm({
        title: "",
        description: "",
        type: "Call",
        due_date: "",
        assigned_to_id: "",
        client_id: "",
        notification: true,
      });
      setPickedClient(null);
      setIsAddOpen(false);

      // Append new task to local view
      if (data.task) {
        const newTask: UnifiedTask = {
          ...data.task,
          isClientTask: isClientLinked,
          clientId: isClientLinked ? selectedClientId : null,
          clientName: isClientLinked ? pickedClient?.name ?? null : null,
          assignedTo: {
            name: salesmen.find((s) => s.id === assignedSalesmanId)?.name || null,
          },
        };
        setLocalTasks((prev) => [newTask, ...prev]);
      }

      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // Update status handler
  async function handleStatusChange(
    taskId: number,
    newStatus: string,
    isClientTask: boolean,
    clientId?: number | null
  ) {
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

      triggerToast("Task status updated!");
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === taskId && t.isClientTask === isClientTask ? { ...t, status: newStatus } : t))
      );
      router.refresh();
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  // Delete task handler
  async function handleDeleteTask(taskId: number, isClientTask: boolean, clientId?: number | null) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    setDeletingTaskId(taskId);

    try {
      const url = isClientTask
        ? `/api/clients/${clientId}/tasks/${taskId}`
        : `/api/tasks/${taskId}`;

      const res = await fetch(url, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete task");
      }

      triggerToast("Task deleted successfully");
      setLocalTasks((prev) => prev.filter((t) => !(t.id === taskId && t.isClientTask === isClientTask)));
      router.refresh();
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setDeletingTaskId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters panel */}
      <div className="bg-card p-5 rounded-card border border-border/80 shadow-card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Task Management
            </h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Monitor, assign, and manage tasks for your salesmen.
            </p>
          </div>
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsAddOpen(true);
            }}
            className={buttonVariants({ size: "sm" })}
          >
            <Plus size={14} />
            <span>Assign Task</span>
          </button>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80" size={14} />
            <input
              type="text"
              placeholder="Search description, salesman, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search tasks"
              className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 w-full h-10 pl-9 pr-4"
            />
          </div>

          {/* Salesman filter */}
          <div>
            <select
              value={salesmanFilter}
              onChange={(e) => set({ salesman: e.target.value })}
              aria-label="Filter by salesman"
              className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 w-full h-10 cursor-pointer"
            >
              <option value="all">All Salesmen</option>
              {salesmen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => set({ status: e.target.value })}
              aria-label="Filter by status"
              className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 w-full h-10 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_process">In Process</option>
              <option value="achieved">Completed / Achieved</option>
              <option value="unsuccessful">Unsuccessful</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="w-full space-y-4">
        {/* Type filter tabs */}
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl w-fit">
          {([
            { key: "all" as const, label: "All Tasks" },
            { key: "general" as const, label: "General" },
            { key: "client" as const, label: "Client Tasks" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => set({ type: tab.key })}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer",
                typeFilter === tab.key
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:text-foreground/85 hover:bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={cn("space-y-4 transition-opacity", isNavigating && "opacity-60")} aria-busy={isNavigating}>
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const isOverdue =
              new Date(task.due_date) < new Date() &&
              ["pending", "in_process"].includes(task.status);
            return (
              <div
                key={`${task.isClientTask ? "client" : "regular"}-${task.id}`}
                className={cn(
                  "relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md",
                  isOverdue ? "border-l-4 border-l-danger border-border" : "border-border"
                )}
              >
                <div className="flex-1 space-y-2.5 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    {/* Task type badge */}
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                      <ListTodo size={10} />
                      <span>{task.isClientTask ? "Client Task" : "General Task"}</span>
                    </span>

                    {/* Client name if present */}
                    {task.isClientTask && task.clientName && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success-foreground">
                        <Building size={10} />
                        <span>Client: {task.clientName}</span>
                      </span>
                    )}

                    {/* Assigned Salesman */}
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-subtle px-2.5 py-0.5 text-xs font-semibold text-foreground/70">
                      <User size={10} />
                      <span>Assigned to: {task.assignedTo?.name || "Unassigned"}</span>
                    </span>
                  </div>

                  {/* Task Description */}
                  <p className="text-sm font-semibold text-foreground break-words leading-relaxed">
                    {task.description}
                  </p>

                  {/* Task Metadata (Due Date & Overdue label) */}
                  <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground/80">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className={isOverdue ? "text-danger-foreground animate-pulse" : "text-muted-foreground/80"} />
                      <span className={cn(isOverdue ? "text-danger-foreground font-semibold" : "text-muted-foreground")}>
                        Due: {formatDate(task.due_date)}
                      </span>
                    </span>
                    {isOverdue && (
                      <span className="inline-flex items-center gap-0.5 text-danger-foreground bg-danger-soft px-1.5 py-0.5 rounded-full text-[9px] font-semibold">
                        <AlertCircle size={9} /> Overdue
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  {/* Status update select */}
                  <div className="relative">
                    {updatingTaskId === task.id && (
                      <Loader2
                        size={14}
                        className="absolute -left-5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground/80"
                      />
                    )}
                    <select
                      value={task.status}
                      onChange={(e) =>
                        handleStatusChange(
                          task.id,
                          e.target.value,
                          task.isClientTask,
                          task.clientId
                        )
                      }
                      disabled={updatingTaskId === task.id}
                      aria-label="Update task status"
                      className={cn(
                        "cursor-pointer appearance-none rounded-full py-1 pl-2.5 pr-7 text-xs font-semibold ring-1 outline-none transition focus:ring-2 focus:ring-ring/20 disabled:opacity-60",
                        STATUS_SELECT_COLORS[task.status] ?? STATUS_SELECT_COLORS.pending
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

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteTask(task.id, task.isClientTask, task.clientId)}
                    disabled={deletingTaskId === task.id}
                    className="text-muted-foreground/80 hover:text-danger-foreground transition p-1.5 rounded-lg hover:bg-danger-soft flex-shrink-0 cursor-pointer"
                    title="Delete task"
                  >
                    {deletingTaskId === task.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center p-12 bg-card rounded-card border border-dashed border-border text-sm text-muted-foreground">
            No tasks found matching current filters.
          </div>
        )}
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} pending={isNavigating} noun="tasks" onPage={(p) => set({ page: p })} />
        </div>
      </div>

      {/* Assign Task Modal */}
      <Modal onClose={() => setIsAddOpen(false)} open={isAddOpen}>
        <div className="relative">
          <button aria-label="Close"
            onClick={() => setIsAddOpen(false)}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "absolute -top-1.5 -right-1.5")}
          >
            <X size={16} />
          </button>

          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">New Task</h3>
            <p className="text-xs text-muted-foreground">Assign a task to a member of your sales team.</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-danger-soft border border-danger/30 rounded-lg text-xs text-danger-foreground font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-4">
            {/* Title / Task Header */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground/85" htmlFor="task-title">
                Title *
              </label>
              <input
                id="task-title"
                type="text"
                required
                value={addTaskForm.title}
                onChange={(e) => setAddTaskForm({ ...addTaskForm, title: e.target.value })}
                placeholder="e.g. Schedule call with decision maker"
                className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 w-full h-10"
              />
            </div>

            {/* Description Textarea */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground/85" htmlFor="task-desc">
                Description
              </label>
              <textarea
                id="task-desc"
                value={addTaskForm.description}
                onChange={(e) => setAddTaskForm({ ...addTaskForm, description: e.target.value })}
                placeholder="Specify task instructions, agenda, or background details..."
                rows={3}
                className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 w-full py-2.5"
              />
            </div>

            {/* Row: Type and Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground/85" htmlFor="task-type">
                  Type
                </label>
                <select
                  id="task-type"
                  value={addTaskForm.type}
                  onChange={(e) => setAddTaskForm({ ...addTaskForm, type: e.target.value })}
                  className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 cursor-pointer"
                >
                  <option value="Call">Call</option>
                  <option value="Email">Email</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Presentation">Presentation</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground/85" htmlFor="task-due">
                  Due Date *
                </label>
                <input
                  id="task-due"
                  type="date"
                  required
                  value={addTaskForm.due_date}
                  onChange={(e) => setAddTaskForm({ ...addTaskForm, due_date: e.target.value })}
                  className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 w-full h-10"
                />
              </div>
            </div>

            {/* Row: Assign To (Salesman) and Client (Optional) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground/85" htmlFor="task-assignee">
                  Assign To *
                </label>
                <select
                  id="task-assignee"
                  required
                  value={addTaskForm.assigned_to_id}
                  onChange={(e) => setAddTaskForm({ ...addTaskForm, assigned_to_id: e.target.value })}
                  className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 cursor-pointer"
                >
                  <option value="">Select salesman...</option>
                  {salesmen.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground/85" htmlFor="task-client">
                  Client (Optional)
                </label>
                <ClientPicker id="task-client" value={pickedClient} onChange={setPickedClient} inputClassName="text-xs" />
              </div>
            </div>

            {/* Notification alert toggle (Default on) */}
            <div className="flex items-center gap-2 py-1.5 border-t border-border">
              <input
                id="task-notif-switch"
                type="checkbox"
                checked={addTaskForm.notification}
                onChange={(e) => setAddTaskForm({ ...addTaskForm, notification: e.target.checked })}
                className="h-4 w-4 text-primary focus:ring-ring/20 border-border-strong rounded cursor-pointer"
              />
              <label className="text-xs font-medium text-foreground/85 cursor-pointer select-none" htmlFor="task-notif-switch">
                Send alert notification to salesman (default is On)
              </label>
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-border">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold border border-border hover:bg-subtle text-foreground/70 rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={buttonVariants({ size: "sm" })}
              >
                {isSaving && <Loader2 size={12} className="animate-spin" />}
                <span>Create Task</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <Toast message={toastMsg || undefined} />
    </div>
  );
}
