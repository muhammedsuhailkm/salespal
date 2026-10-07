"use client";

import { useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedParam, useUrlFilters } from "@/hooks/useUrlFilters";
import type { TasksPage, TaskView } from "@/lib/tasks-list";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Calendar,
  X,
  Loader2,
  ListTodo,
  MessageSquareText,
  Package,
  Search,
  Wallet
} from "lucide-react";
import { enquiryRef } from "@/types/enquiry";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { cn, formatDate, titleCase } from "@/lib/utils";
import { taskKindLabels, taskStatuses, type TaskKind } from "@/types/task";

import { buttonVariants } from "@/components/ui/Button";
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
  /** Set on automatic enquiry follow-up tasks. */
  enquiry?: { id: number; status: string } | null;
  kind?: TaskKind;
};

const VIEWS: { key: TaskView; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mine", label: "My tasks" },
  { key: "enquiry", label: "Enquiry follow-up" },
  { key: "order", label: "Order follow-up" },
  { key: "payment", label: "Payment follow-up" },
  { key: "completed", label: "Completed" },
];

const EMPTY_MESSAGES: Record<TaskView, string> = {
  all: "No tasks yet.",
  mine: "No open tasks you created.",
  enquiry: "No open enquiry follow-ups.",
  order: "No open order follow-ups. Tag a task as “Order follow-up” when you add it.",
  payment: "No open payment follow-ups.",
  completed: "No completed tasks.",
};

const KIND_BADGE: Record<TaskKind, { icon: typeof ListTodo; className: string }> = {
  general: { icon: ListTodo, className: "bg-muted text-muted-foreground" },
  enquiry_follow_up: { icon: MessageSquareText, className: "bg-warning-soft text-warning-foreground" },
  order_follow_up: { icon: Package, className: "bg-info-soft text-info-foreground" },
  payment_follow_up: { icon: Wallet, className: "bg-primary-soft text-primary-soft-foreground" },
};

interface SalesmanTasksListProps {
  /** One server-sorted page of the salesman's tasks (created by them or assigned to them). */
  data: TasksPage;
  currentUserId: number;
}

const STATUS_SELECT_COLORS: Record<string, string> = {
  pending: "bg-muted text-foreground",
  in_process: "bg-info-soft text-info-foreground",
  achieved: "bg-success-soft text-success-foreground",
  unsuccessful: "bg-danger-soft text-danger-foreground",
};

const isOpen = (status: string) => status === "pending" || status === "in_process";

function assignedByLabel(task: Task, currentUserId: number) {
  if (task.enquiry) return "Auto follow-up";
  return task.created_by_id === currentUserId || !task.createdBy?.name ? "You" : (task.createdBy.name ?? "You");
}

function KindBadge({ task }: { task: Task }) {
  const kind = task.kind ?? (task.enquiry ? "enquiry_follow_up" : "general");
  const badge = KIND_BADGE[kind];
  const Icon = badge.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", badge.className)}>
      <Icon size={11} aria-hidden />
      {task.enquiry ? `${taskKindLabels[kind]} · ${enquiryRef(task.enquiry.id)}` : taskKindLabels[kind]}
    </span>
  );
}

/** Red within 2 days (or overdue), amber within a week — only while the task is still open. */
function DueDate({ task, now }: { task: Task; now: number }) {
  const days = Math.ceil((new Date(task.due_date).getTime() - now) / (1000 * 60 * 60 * 24));
  const tone = !isOpen(task.status)
    ? "text-muted-foreground"
    : days <= 2
      ? "font-medium text-danger-foreground"
      : days <= 7
        ? "font-medium text-warning-foreground"
        : "text-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums", tone)}>
      <Calendar size={13} className="shrink-0 opacity-70" aria-hidden />
      {formatDate(task.due_date)}
    </span>
  );
}

function StatusSelect({
  task,
  updating,
  onChange,
}: {
  task: Task;
  updating: boolean;
  onChange: (taskId: number, newStatus: string, isClientTask?: boolean, clientId?: number) => void;
}) {
  return (
    <div className="relative inline-flex items-center gap-1.5">
      <select
        value={task.status}
        onChange={(e) => onChange(task.id, e.target.value, task.isClientTask, task.clientId ?? undefined)}
        disabled={updating}
        aria-label={`Update status for ${task.description}`}
        className={cn(
          "cursor-pointer appearance-none rounded-full py-1 pl-2.5 pr-7 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-wait disabled:opacity-60",
          STATUS_SELECT_COLORS[task.status] ?? STATUS_SELECT_COLORS.pending,
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
      {updating && <Loader2 size={14} className="animate-spin text-muted-foreground" aria-label="Saving" />}
    </div>
  );
}

function FollowUpLink({ task }: { task: Task }) {
  if (!(task.enquiry && isOpen(task.status) && task.enquiry.status === "open")) return null;
  return (
    <Link
      href={`/dashboard/salesman/enquiries?followUp=${task.enquiry.id}`}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-control bg-warning px-2.5 py-1.5 text-xs font-medium text-white shadow-xs transition hover:bg-warning/90 dark:text-foreground"
    >
      <MessageSquareText size={12} aria-hidden />
      Follow up
    </Link>
  );
}

export function SalesmanTasksList({ data, currentUserId }: SalesmanTasksListProps) {
  const router = useRouter();
  const { get, set, isPending: isNavigating } = useUrlFilters();
  const typeFilter = (get("type") || "all") as "all" | "general" | "client";
  const view = (get("view") || "all") as TaskView;
  // Fixed per mount so due-date colours are stable across re-renders
  const [now] = useState(() => Date.now());
  const [search, setSearch] = useDebouncedParam("q", set, get("q"));

  // Optimistic edits layered over the server page until router.refresh() delivers fresh rows.
  const [localTasks, setLocalTasks] = useState<Task[]>(data.rows);
  const [syncedRows, setSyncedRows] = useState(data.rows);
  if (data.rows !== syncedRows) {
    setSyncedRows(data.rows);
    setLocalTasks(data.rows);
  }

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [addTaskForm, setAddTaskForm] = useState({
    description: "",
    due_date: "",
    status: "pending",
    category: "",
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

  const combinedTasks = localTasks.map((t) => ({ id: `${t.isClientTask ? "client-task" : "task"}-${t.id}`, data: t }));

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
          category: addTaskForm.category || null,
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
        category: "",
        notification: false
      });
      setIsAddOpen(false);
      if (data.task) {
        setLocalTasks((prev) => [{ ...data.task, isClientTask: false, created_by_id: currentUserId, kind: data.task.category ?? "general" }, ...prev]);
      }
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create task");
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
        setLocalTasks((prev) =>
          prev.map((t) => (t.id === data.task.id && !!t.isClientTask === !!isClientTask ? { ...t, status: data.task.status } : t)),
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
      <div className="flex items-center justify-between bg-card p-4 rounded-card border border-border/80 shadow-card flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">Tasks ({data.total.toLocaleString()})</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground font-medium">
            <span>Created by you: <strong className="text-foreground font-semibold">{data.createdByMe.toLocaleString()}</strong></span>
            <span className="hidden sm:inline text-muted-foreground/60">•</span>
            <span>Assigned by managers: <strong className="text-foreground font-semibold">{data.assignedToMe.toLocaleString()}</strong></span>
          </div>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsAddOpen(true);
          }}
          className={buttonVariants({ size: "sm" })}
        >
          <Plus size={14} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filters: tabs + search + type */}
      <div className="space-y-3">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="Task filters" className="flex w-max gap-1 rounded-xl bg-muted p-1">
            {VIEWS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={view === tab.key}
                onClick={() => set({ view: tab.key })}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  view === tab.key
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground/85"
                )}
              >
                {tab.label}
                <span className={cn("tabular-nums", view === tab.key ? "text-muted-foreground" : "text-muted-foreground/80")}>
                  {data.viewCounts[tab.key].toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, clients or who assigned them..."
              aria-label="Search tasks"
              className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 w-full pl-9 pr-3"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => set({ type: e.target.value })}
            aria-label="Task source"
            className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 sm:w-44 cursor-pointer"
          >
            <option value="all">All sources</option>
            <option value="general">General tasks</option>
            <option value="client">Client tasks</option>
          </select>
        </div>
      </div>

      {/* Tasks: table (md+) / compact rows (phones) */}
      <div className={cn("space-y-1 transition-opacity", isNavigating && "opacity-60")} aria-busy={isNavigating}>
        {combinedTasks.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
            {search ? `No tasks match “${search}”.` : EMPTY_MESSAGES[view] ?? "No tasks found."}
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-card border border-border bg-card shadow-card md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-b border-border bg-subtle text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Task</th>
                    <th scope="col" className="hidden w-[16%] px-4 py-3 font-medium lg:table-cell">Assigned by</th>
                    <th scope="col" className="w-[130px] px-4 py-3 font-medium">Due</th>
                    <th scope="col" className="w-[150px] px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="w-[150px] px-4 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {combinedTasks.map(({ id, data: task }) => (
                    <tr key={id} className="align-top transition-colors hover:bg-subtle">
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <KindBadge task={task} />
                          {task.isClientTask && task.clientName && (
                            <span className="truncate text-xs font-medium text-muted-foreground">· {task.clientName}</span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-foreground" title={task.description}>{task.description}</p>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        <span className="block truncate">{assignedByLabel(task, currentUserId)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <DueDate task={task} now={now} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusSelect task={task} updating={updatingTaskId === task.id} onChange={handleStatusChange} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <FollowUpLink task={task} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card shadow-card md:hidden">
              {combinedTasks.map(({ id, data: task }) => (
                <li key={id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <KindBadge task={task} />
                      {task.isClientTask && task.clientName && <span className="truncate text-xs text-muted-foreground">· {task.clientName}</span>}
                    </div>
                    <StatusSelect task={task} updating={updatingTaskId === task.id} onChange={handleStatusChange} />
                  </div>
                  <p className="text-sm text-foreground">{task.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <DueDate task={task} now={now} />
                      <span aria-hidden>·</span>
                      {assignedByLabel(task, currentUserId)}
                    </span>
                    <FollowUpLink task={task} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} pending={isNavigating} noun="tasks" onPage={(p) => set({ page: p })} />
      </div>

      {/* Add Task Modal */}
      <Modal onClose={() => setIsAddOpen(false)} open={isAddOpen}>
        <div className="relative">
          <button aria-label="Close"
            onClick={() => setIsAddOpen(false)}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "absolute -top-1.5 -right-1.5")}
          >
            <X size={16} />
          </button>
          
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Add New Task</h3>
            <p className="text-xs text-muted-foreground">Create a task. It will automatically assign to you.</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-danger-soft border border-danger/30 rounded-lg text-xs text-danger-foreground font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground/85" htmlFor="add-task-desc">
                Task Description
              </label>
              <textarea
                id="add-task-desc"
                required
                value={addTaskForm.description}
                onChange={(e) => setAddTaskForm({ ...addTaskForm, description: e.target.value })}
                placeholder="e.g. Follow up with prospect"
                rows={3}
                className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 w-full py-2.5"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground/85" htmlFor="add-task-category">
                Task Type
              </label>
              <select
                id="add-task-category"
                value={addTaskForm.category}
                onChange={(e) => setAddTaskForm({ ...addTaskForm, category: e.target.value })}
                className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 cursor-pointer"
              >
                <option value="">General</option>
                <option value="order_follow_up">Order follow-up</option>
                <option value="payment_follow_up">Payment follow-up</option>
              </select>
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
              <label className="text-xs font-semibold text-foreground/85" htmlFor="add-task-status">
                Task Status
              </label>
              <select
                id="add-task-status"
                value={addTaskForm.status}
                onChange={(e) => setAddTaskForm({ ...addTaskForm, status: e.target.value })}
                className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 cursor-pointer"
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
                className="h-4 w-4 text-primary focus:ring-ring/20 border-border-strong rounded cursor-pointer"
              />
              <label className="text-xs font-medium text-foreground/85 cursor-pointer select-none" htmlFor="add-task-notif">
                Enable alert/notification
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
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
