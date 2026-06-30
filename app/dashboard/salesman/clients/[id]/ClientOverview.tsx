"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatPhoneNumber, formatDate, cn, titleCase } from "@/lib/utils";
import { 
  ArrowLeft, 
  Edit3, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Loader2, 
  Check, 
  Clock,
  X,
  ListTodo
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";

// Definition of types
type Client = {
  id: number;
  name: string;
  contact_person_name: string;
  contact_no: string;
  mail_id: string | null;
  location_coordinates: string | null;
  status: string;
  notes: string | null;
  checklist_kyc_verified: boolean;
  checklist_agreement_signed: boolean;
  checklist_rate_card_approved: boolean;
  checklist_integration_setup: boolean;
  checklist_dispatch_confirmed: boolean;
  checklist_billing_verified: boolean;
  checklist_portal_created: boolean;
  checklist_first_shipment: boolean;
  organization?: { name: string | null } | null;
  assignedSalesman?: { name: string | null } | null;
};

type ClientTask = {
  id: number;
  description: string;
  due_date: string | Date;
  status: string;
  assignedTo?: { name: string | null } | null;
  createdBy?: { name: string | null } | null;
};

const taskStatuses = ["pending", "in_process", "achieved", "unsuccessful"] as const;

const STATUS_SELECT_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 ring-slate-200",
  in_process: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  achieved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  unsuccessful: "bg-red-50 text-red-700 ring-red-200",
};

interface ClientOverviewProps {
  client: Client;
  initialTasks: ClientTask[];
}

export function ClientOverview({ client: initialClient, initialTasks }: ClientOverviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active state copies
  const [client, setClient] = useState<Client>(initialClient);
  const [tasks, setTasks] = useState<ClientTask[]>(initialTasks);

  // Toast message
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  // Client edit form state
  const [editForm, setEditForm] = useState({
    name: client.name,
    contact_person_name: client.contact_person_name,
    mail_id: client.mail_id || "",
    contact_no: client.contact_no,
    notes: client.notes || "",
    location_coordinates: client.location_coordinates || "",
  });

  // Task creation form state
  const [taskForm, setTaskForm] = useState({
    description: "",
    due_date: "",
  });

  // Saving states
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  // Sync state if props change
  useEffect(() => {
    setClient(initialClient);
    setTasks(initialTasks);
  }, [initialClient, initialTasks]);

  // Onboarding checklist config
  const checklistItems = [
    { key: "checklist_kyc_verified" as const, label: "KYC Documents Verified" },
    { key: "checklist_agreement_signed" as const, label: "Business Agreement Signed" },
    { key: "checklist_rate_card_approved" as const, label: "Rate Card Approved" },
    { key: "checklist_integration_setup" as const, label: "Integration Setup Completed" },
    { key: "checklist_dispatch_confirmed" as const, label: "Dispatch Location Confirmed" },
    { key: "checklist_billing_verified" as const, label: "Billing & Credit Setup Verified" },
    { key: "checklist_portal_created" as const, label: "Customer Portal Account Created" },
    { key: "checklist_first_shipment" as const, label: "First Shipment Scheduled" },
  ];

  const checkedCount = checklistItems.filter((item) => client[item.key]).length;
  const totalCount = checklistItems.length;
  const progressPercent = Math.round((checkedCount / totalCount) * 100);

  // Toggle checklist status handler
  async function handleToggleChecklist(key: keyof Client) {
    const currentValue = client[key] as boolean;
    const newValue = !currentValue;

    // Optimistic Update
    setClient((prev) => ({ ...prev, [key]: newValue }));

    try {
      const res = await fetch(`/api/clients/${client.id}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: newValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update checklist item");
      }
      triggerToast("Checklist item updated!");
      router.refresh();
    } catch (err: any) {
      // Revert optimistic update
      setClient((prev) => ({ ...prev, [key]: currentValue }));
      triggerToast(`Error: ${err.message}`);
    }
  }

  // Edit client handler
  async function handleEditClientSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingClient(true);
    setClientError(null);

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          contact_person_name: editForm.contact_person_name,
          mail_id: editForm.mail_id || null,
          contact_no: editForm.contact_no,
          notes: editForm.notes || null,
          location_coordinates: editForm.location_coordinates || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update client details");
      }

      setClient((prev) => ({
        ...prev,
        name: editForm.name,
        contact_person_name: editForm.contact_person_name,
        mail_id: editForm.mail_id || null,
        contact_no: editForm.contact_no,
        notes: editForm.notes || null,
        location_coordinates: editForm.location_coordinates || null,
      }));

      setIsEditOpen(false);
      triggerToast("Client information updated successfully!");
      router.refresh();
    } catch (err: any) {
      setClientError(err.message);
    } finally {
      setIsSavingClient(false);
    }
  }

  // Create client task handler
  async function handleAddTaskSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingTask(true);
    setTaskError(null);

    try {
      const res = await fetch(`/api/clients/${client.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: taskForm.description,
          due_date: taskForm.due_date,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      // Add to local state
      setTasks((prev) => [...prev, data.task]);
      setIsAddTaskOpen(false);
      setTaskForm({ description: "", due_date: "" });
      triggerToast("Task added successfully!");
      router.refresh();
    } catch (err: any) {
      setTaskError(err.message);
    } finally {
      setIsSavingTask(false);
    }
  }

  // Universal task status handler
  async function handleStatusChange(taskId: number, newStatus: string) {
    const originalTask = tasks.find((t) => t.id === taskId);
    if (!originalTask) return;
    const currentStatus = originalTask.status;

    // Optimistic Update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/clients/${client.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update task status");
      }
      triggerToast("Task status updated!");
      router.refresh();
    } catch (err: any) {
      // Revert optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus } : t))
      );
      triggerToast(`Error: ${err.message}`);
    }
  }

  // Delete task handler
  async function handleDeleteTask(taskId: number) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    const previousTasks = [...tasks];
    // Optimistic Update
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      const res = await fetch(`/api/clients/${client.id}/tasks/${taskId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete task");
      }
      triggerToast("Task deleted successfully!");
      router.refresh();
    } catch (err: any) {
      // Revert
      setTasks(previousTasks);
      triggerToast(`Error: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && <Toast message={toastMsg} />}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {client.name}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 font-semibold uppercase tracking-wider">
            {client.organization?.name || "Independent"} • {client.contact_person_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/salesman/clients"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditForm({
                name: client.name,
                contact_person_name: client.contact_person_name,
                mail_id: client.mail_id || "",
                contact_no: client.contact_no,
                notes: client.notes || "",
                location_coordinates: client.location_coordinates || "",
              });
              setIsEditOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-700/20 rounded-xl transition cursor-pointer shadow-md hover:shadow-lg active:scale-95"
          >
            <Edit3 size={14} />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Info & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Client Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-5">
              Client Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Status
                </span>
                <Badge value={client.status} className="mt-1" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Email
                </span>
                <span className="text-sm font-semibold text-slate-800 break-all">
                  {client.mail_id || "-"}
                </span>
              </div>
              <div className="md:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Mobile
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {formatPhoneNumber(client.contact_no)}
                </span>
              </div>
            </div>
            {client.notes && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Notes
                </span>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm">
                  {client.notes}
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Client Related Tasks */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900">
                Tasks ({tasks.length})
              </h2>
              <button
                type="button"
                onClick={() => setIsAddTaskOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/50 rounded-xl hover:bg-indigo-100 transition cursor-pointer active:scale-95"
              >
                <Plus size={14} />
                <span>Task</span>
              </button>
            </div>

            {tasks.length > 0 ? (
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <div key={task.id} className="py-3 flex items-center justify-between gap-4 group">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <ListTodo className="text-slate-400 mt-0.5 flex-shrink-0" size={16} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 break-words">
                          {task.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {formatDate(task.due_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className={cn(
                            "cursor-pointer appearance-none rounded-full py-1 pl-2.5 pr-7 text-[10px] font-bold uppercase tracking-wider ring-1 outline-none transition focus:ring-2 focus:ring-indigo-200",
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
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-400 hover:text-red-600 transition cursor-pointer focus:outline-none opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border border-slate-200 border-dashed rounded-xl text-center">
                <p className="text-sm font-semibold text-slate-500">No tasks</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Link related tasks for follow-ups and shipments to keep track.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Onboarding Checklist */}
        <div className="lg:col-span-1">
          
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Onboarding Checklist
              </h2>
              <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                {checkedCount}/{totalCount}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-6 space-y-1.5">
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-3.5">
              {checklistItems.map((item) => {
                const isChecked = client[item.key] as boolean;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleToggleChecklist(item.key)}
                    className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition cursor-pointer text-xs font-semibold focus:outline-none"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isChecked ? (
                        <CheckCircle2 size={16} className="text-emerald-600 fill-emerald-50" />
                      ) : (
                        <Circle size={16} className="text-slate-300" />
                      )}
                    </div>
                    <span className={isChecked ? "line-through text-slate-400 font-medium" : "text-slate-700"}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Edit Client Modal */}
      <Modal open={isEditOpen}>
        <div className="relative">
          <button
            onClick={() => setIsEditOpen(false)}
            className="absolute -top-1.5 -right-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>

          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Edit Client Information
            </h3>
          </div>

          <form onSubmit={handleEditClientSubmit} className="space-y-4 pt-2">
            {clientError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg font-medium">
                {clientError}
              </div>
            )}
            <Input
              label="Client Name"
              id="edit-name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
            <Input
              label="Contact Person"
              id="edit-contact-person"
              value={editForm.contact_person_name}
              onChange={(e) => setEditForm({ ...editForm, contact_person_name: e.target.value })}
              required
            />
            <Input
              label="Email"
              id="edit-email"
              type="email"
              value={editForm.mail_id}
              onChange={(e) => setEditForm({ ...editForm, mail_id: e.target.value })}
            />
            <Input
              label="Mobile Number"
              id="edit-mobile"
              value={editForm.contact_no}
              onChange={(e) => setEditForm({ ...editForm, contact_no: e.target.value })}
              required
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="edit-notes">
                Notes
              </label>
              <textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full text-xs rounded-md border border-slate-300 p-2.5 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-100 min-h-[80px]"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 mt-5">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer rounded-lg active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingClient}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer rounded-lg shadow disabled:opacity-50 active:scale-95"
              >
                {isSavingClient && <Loader2 size={12} className="animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Add Task Modal */}
      <Modal open={isAddTaskOpen}>
        <div className="relative">
          <button
            onClick={() => setIsAddTaskOpen(false)}
            className="absolute -top-1.5 -right-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>

          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Create Client Task
            </h3>
          </div>

          <form onSubmit={handleAddTaskSubmit} className="space-y-4 pt-2">
            {taskError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg font-medium">
                {taskError}
              </div>
            )}
            <Input
              label="Task Description"
              id="task-description"
              placeholder="e.g. Call client for shipping rates approval"
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              required
            />
            <Input
              label="Due Date"
              id="task-due-date"
              type="date"
              value={taskForm.due_date}
              onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
              required
            />
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 mt-5">
              <button
                type="button"
                onClick={() => setIsAddTaskOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer rounded-lg active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingTask}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer rounded-lg shadow disabled:opacity-50 active:scale-95"
              >
                {isSavingTask && <Loader2 size={12} className="animate-spin" />}
                <span>Create Task</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
