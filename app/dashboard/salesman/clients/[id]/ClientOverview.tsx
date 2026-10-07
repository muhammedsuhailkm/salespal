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
import { statusRequiresContact } from "@/lib/client-contact";
import { ClientSwitcher } from "@/components/clients/ClientSwitcher";

import { buttonVariants } from "@/components/ui/Button";
// Definition of types
type Client = {
  id: number;
  name: string;
  contact_person_name: string;
  contact_no: string;
  contact_person_designation?: string | null;
  cr_no: string | null;
  cr_expiry_date: Date | string | null;
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
  pending: "bg-muted text-foreground/85 ring-border",
  in_process: "bg-info-soft text-info-foreground ring-info/30",
  achieved: "bg-success-soft text-success-foreground ring-success/30",
  unsuccessful: "bg-danger-soft text-danger-foreground ring-danger/30",
};

interface ClientOverviewProps {
  client: Client;
  initialTasks: ClientTask[];
  backLink?: string;
  /** Managers: the client search only offers their salesmen's clients. */
  teamOnly?: boolean;
  /** Orders / enquiries summary and tables, streamed in by the page. */
  history?: React.ReactNode;
  /** Attachments card, rendered under the tasks. */
  documents?: React.ReactNode;
}

export function ClientOverview({ client: initialClient, initialTasks, backLink, teamOnly = false, history, documents }: ClientOverviewProps) {
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
    contact_person_designation: client.contact_person_designation || "",
    mail_id: client.mail_id || "",
    contact_no: client.contact_no,
    cr_no: client.cr_no || "",
    cr_expiry_date: client.cr_expiry_date
      ? new Date(client.cr_expiry_date).toISOString().slice(0, 10)
      : "",
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
          contact_person_designation: editForm.contact_person_designation || null,
          mail_id: editForm.mail_id || null,
          contact_no: editForm.contact_no,
          cr_no: editForm.cr_no || null,
          cr_expiry_date: editForm.cr_expiry_date || null,
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
        contact_person_designation: editForm.contact_person_designation || null,
        mail_id: editForm.mail_id || null,
        contact_no: editForm.contact_no,
        cr_no: editForm.cr_no || null,
        cr_expiry_date: editForm.cr_expiry_date || null,
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            {client.name}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground font-semibold">
            {client.organization?.name || "Independent"}
            {client.contact_person_name && <> • {client.contact_person_name}</>}
            {client.contact_person_designation && <span className="normal-case"> ({client.contact_person_designation})</span>}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <ClientSwitcher
            current={{ id: client.id, name: client.name, status: client.status }}
            basePath={backLink || "/dashboard/salesman/clients"}
            teamOnly={teamOnly}
          />
          <div className="flex items-center gap-2">
          <Link
            href={backLink || "/dashboard/salesman/clients"}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
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
                contact_person_designation: client.contact_person_designation || "",
                mail_id: client.mail_id || "",
                contact_no: client.contact_no,
                cr_no: client.cr_no || "",
                cr_expiry_date: client.cr_expiry_date
                  ? new Date(client.cr_expiry_date).toISOString().slice(0, 10)
                  : "",
                notes: client.notes || "",
                location_coordinates: client.location_coordinates || "",
              });
              setIsEditOpen(true);
            }}
            className={buttonVariants({ size: "sm" })}
          >
            <Edit3 size={14} />
            <span>Edit</span>
          </button>
          </div>
        </div>
      </div>

      {history}

      {/* Detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Info & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Client Information */}
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <h2 className="text-base font-semibold text-foreground mb-5">
              Client Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">
                  Status
                </span>
                <Badge value={client.status} className="mt-1" />
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">
                  Email
                </span>
                <span className="text-sm font-semibold text-foreground break-all">
                  {client.mail_id || "-"}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">
                  Mobile
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {client.contact_no ? formatPhoneNumber(client.contact_no) : "-"}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">
                  Contact person
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {client.contact_person_name || "-"}
                  {client.contact_person_designation && <span className="font-normal text-muted-foreground"> · {client.contact_person_designation}</span>}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">
                  CR No
                </span>
                <span className="text-sm font-semibold text-foreground">{client.cr_no || "-"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">
                  CR Expiry
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    client.cr_expiry_date && new Date(client.cr_expiry_date) < new Date() ? "text-danger-foreground" : "text-foreground"
                  )}
                >
                  {client.cr_expiry_date ? formatDate(client.cr_expiry_date) : "-"}
                  {client.cr_expiry_date && new Date(client.cr_expiry_date) < new Date() && " (expired)"}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">
                  Salesman
                </span>
                <span className="text-sm font-semibold text-foreground">{client.assignedSalesman?.name || "-"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1">
                  Location
                </span>
                <span className="text-sm font-semibold text-foreground break-all">{client.location_coordinates || "-"}</span>
              </div>
            </div>
            {client.notes && (
              <div className="mt-6 border-t border-border pt-5">
                <span className="text-xs font-semibold text-muted-foreground/80 block mb-1.5">
                  Notes
                </span>
                <p className="text-xs text-foreground/70 leading-relaxed bg-subtle p-3 rounded-lg border border-border shadow-sm">
                  {client.notes}
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Client Related Tasks */}
          <div className="rounded-card border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-foreground">
                Tasks ({tasks.length})
              </h2>
              <button
                type="button"
                onClick={() => setIsAddTaskOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary-soft border border-primary/30 rounded-xl hover:bg-primary-soft transition cursor-pointer active:scale-95"
              >
                <Plus size={14} />
                <span>Task</span>
              </button>
            </div>

            {tasks.length > 0 ? (
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <div key={task.id} className="py-3 flex items-center justify-between gap-4 group">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <ListTodo className="text-muted-foreground/80 mt-0.5 flex-shrink-0" size={16} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground break-words">
                          {task.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs font-semibold text-muted-foreground/80">
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
                            "cursor-pointer appearance-none rounded-full py-1 pl-2.5 pr-7 text-xs font-semibold ring-1 outline-none transition focus:ring-2 focus:ring-ring/20",
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
                        className="text-muted-foreground/80 hover:text-danger-foreground transition cursor-pointer focus:outline-none opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-danger-soft flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border border-border border-dashed rounded-xl text-center">
                <p className="text-sm font-semibold text-muted-foreground">No tasks</p>
                <p className="text-xs text-muted-foreground/80 mt-0.5">
                  Link related tasks for follow-ups and shipments to keep track.
                </p>
              </div>
            )}
          </div>

          {documents}
        </div>

        {/* Right Side: Onboarding Checklist */}
        <div className="lg:col-span-1">
          
          <div className="rounded-card border border-border bg-card p-6 shadow-card sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">
                Onboarding Checklist
              </h2>
              <span className="text-xs font-semibold text-foreground/85 bg-muted px-2 py-0.5 rounded-md">
                {checkedCount}/{totalCount}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-6 space-y-1.5">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground/80">
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
                    className="w-full text-left flex items-start gap-3 p-2.5 rounded-xl border border-border hover:border-border hover:bg-subtle/50 transition cursor-pointer text-xs font-semibold focus:outline-none"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isChecked ? (
                        <CheckCircle2 size={16} className="text-success-foreground fill-emerald-50" />
                      ) : (
                        <Circle size={16} className="text-muted-foreground/60" />
                      )}
                    </div>
                    <span className={isChecked ? "line-through text-muted-foreground/80 font-medium" : "text-foreground/85"}>
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
      <Modal onClose={() => setIsEditOpen(false)} open={isEditOpen}>
        <div className="relative">
          <button aria-label="Close"
            onClick={() => setIsEditOpen(false)}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "absolute -top-1.5 -right-1.5")}
          >
            <X size={16} />
          </button>

          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Edit Client Information
            </h3>
          </div>

          <form onSubmit={handleEditClientSubmit} className="space-y-4 pt-2">
            {clientError && (
              <div className="bg-danger-soft border border-danger/30 text-danger-foreground text-xs p-3 rounded-lg font-medium">
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
              label={statusRequiresContact(client.status) ? "Contact Person" : "Contact Person (optional for leads)"}
              id="edit-contact-person"
              value={editForm.contact_person_name}
              onChange={(e) => setEditForm({ ...editForm, contact_person_name: e.target.value })}
              required={statusRequiresContact(client.status)}
            />
            <Input
              label={statusRequiresContact(client.status) ? "Designation" : "Designation (optional for leads)"}
              id="edit-designation"
              value={editForm.contact_person_designation}
              onChange={(e) => setEditForm({ ...editForm, contact_person_designation: e.target.value })}
              placeholder="e.g. Logistics Manager"
              required={statusRequiresContact(client.status)}
            />
            <Input
              label="Email"
              id="edit-email"
              type="email"
              value={editForm.mail_id}
              onChange={(e) => setEditForm({ ...editForm, mail_id: e.target.value })}
            />
            <Input
              label={statusRequiresContact(client.status) ? "Mobile Number" : "Mobile Number (optional for leads)"}
              id="edit-mobile"
              value={editForm.contact_no}
              onChange={(e) => setEditForm({ ...editForm, contact_no: e.target.value })}
              required={statusRequiresContact(client.status)}
            />
            <Input
              label="CR No"
              id="edit-cr-no"
              value={editForm.cr_no}
              onChange={(e) => setEditForm({ ...editForm, cr_no: e.target.value })}
            />
            <Input
              label="CR Expiry Date"
              id="edit-cr-expiry-date"
              type="date"
              value={editForm.cr_expiry_date}
              onChange={(e) => setEditForm({ ...editForm, cr_expiry_date: e.target.value })}
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground/85" htmlFor="edit-notes">
                Notes
              </label>
              <textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 w-full py-2.5"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-border mt-5">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingClient}
                className={buttonVariants({ size: "sm" })}
              >
                {isSavingClient && <Loader2 size={12} className="animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Add Task Modal */}
      <Modal onClose={() => setIsAddTaskOpen(false)} open={isAddTaskOpen}>
        <div className="relative">
          <button aria-label="Close"
            onClick={() => setIsAddTaskOpen(false)}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "absolute -top-1.5 -right-1.5")}
          >
            <X size={16} />
          </button>

          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Create Client Task
            </h3>
          </div>

          <form onSubmit={handleAddTaskSubmit} className="space-y-4 pt-2">
            {taskError && (
              <div className="bg-danger-soft border border-danger/30 text-danger-foreground text-xs p-3 rounded-lg font-medium">
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
            <div className="flex justify-end gap-2.5 pt-3 border-t border-border mt-5">
              <button
                type="button"
                onClick={() => setIsAddTaskOpen(false)}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingTask}
                className={buttonVariants({ size: "sm" })}
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
