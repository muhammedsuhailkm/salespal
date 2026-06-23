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
import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

type Task = {
  id: number;
  description: string;
  due_date: Date | string;
  status: string;
  assignedTo?: { name: string | null };
  createdBy?: { name: string | null };
  created_by_id?: number;
};

interface SalesmanTasksListProps {
  myInProcessTasks: Task[];
  managerAssignedTasks: Task[];
}

// Utility to convert Date to yyyy-MM-dd string for date input
function toInputDateString(dateValue: Date | string) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Form states
  const [addTaskForm, setAddTaskForm] = useState({
    description: "",
    due_date: "",
    status: "pending",
    notification: false
  });

  const [editTaskForm, setEditTaskForm] = useState({
    description: "",
    due_date: "",
    status: ""
  });

  // Action / loading states
  const [isSaving, setIsSaving] = useState(false);
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
      list.push({ id: `task-${t.id}`, date: new Date(t.due_date), data: t });
    });
    localManagerTasks.forEach((t) => {
      list.push({ id: `task-${t.id}`, date: new Date(t.due_date), data: t });
    });

    // Sort by status priority first, then by due date within same status
    return list.sort((a, b) => {
      const priorityA = STATUS_PRIORITY[a.data.status] ?? 99;
      const priorityB = STATUS_PRIORITY[b.data.status] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.date.getTime() - b.date.getTime();
    });
  }, [localMyTasks, localManagerTasks]);

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

  // Open Task Edit Modal
  function openEditTaskModal(task: Task) {
    setSelectedTask(task);
    setEditTaskForm({
      description: task.description,
      due_date: toInputDateString(task.due_date),
      status: task.status
    });
    setErrorMsg(null);
    setIsEditTaskOpen(true);
  }

  // Edit task submission
  async function handleEditTaskSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTask) return;
    setErrorMsg(null);
    setIsSaving(true);

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editTaskForm.description,
          due_date: editTaskForm.due_date || null,
          status: editTaskForm.status
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update task");
      }

      triggerToast("Task updated successfully!");
      setIsEditTaskOpen(false);
      setSelectedTask(null);
      if (data.task) {
        setLocalMyTasks((prev) => prev.map((t) => (t.id === data.task.id ? data.task : t)));
        setLocalManagerTasks((prev) => prev.map((t) => (t.id === data.task.id ? data.task : t)));
      }
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
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

      {/* Unified Single Vertical List Layout */}
      <div className="max-w-2xl mx-auto space-y-4">
        {combinedTasks.length > 0 ? (
          combinedTasks.map((item) => {
            const task = item.data;
            return (
              <div
                key={item.id}
                onClick={() => openEditTaskModal(task)}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition cursor-pointer flex flex-col gap-2.5 relative group"
              >
                {/* Task Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                      <ListTodo size={10} />
                      <span>Task</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {task.createdBy?.name ? `Assigned by ${task.createdBy.name}` : "Created by you"}
                    </span>
                  </div>
                  <Badge value={task.status} />
                </div>

                {/* Task Description */}
                <div>
                  <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition">
                    {task.description}
                  </p>
                </div>

                {/* Task Footer */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-50 pt-2.5 mt-1">
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
                  <span className="text-[10px] text-indigo-500 font-semibold opacity-0 group-hover:opacity-100 transition">
                    Edit Task →
                  </span>
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

      {/* Edit Task Modal */}
      <Modal open={isEditTaskOpen}>
        <div className="relative">
          <button
            onClick={() => {
              setIsEditTaskOpen(false);
              setSelectedTask(null);
            }}
            className="absolute -top-1.5 -right-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
          
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Update Task Details</h3>
            <p className="text-xs text-slate-500">Edit the description, due date, or status of this task.</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleEditTaskSubmit} className="space-y-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="edit-task-desc">
                Task Description
              </label>
              <textarea
                id="edit-task-desc"
                required
                value={editTaskForm.description}
                onChange={(e) => setEditTaskForm({ ...editTaskForm, description: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-slate-300 bg-white p-3 text-xs outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <Input
              label="Due Date"
              type="date"
              required
              value={editTaskForm.due_date}
              onChange={(e) => setEditTaskForm({ ...editTaskForm, due_date: e.target.value })}
              className="text-xs"
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="edit-task-status">
                Task Status
              </label>
              <select
                id="edit-task-status"
                value={editTaskForm.status}
                onChange={(e) => setEditTaskForm({ ...editTaskForm, status: e.target.value })}
                className="h-10 px-3 text-xs rounded-md border border-slate-300 bg-white outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-100 cursor-pointer"
              >
                <option value="pending">Pending</option>
                <option value="in_process">In Process</option>
                <option value="achieved">Achieved</option>
                <option value="unsuccessful">Unsuccessful</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsEditTaskOpen(false);
                  setSelectedTask(null);
                }}
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
                <span>Save Task Changes</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <Toast message={toastMsg || undefined} />
    </div>
  );
}
