"use client";

import { useState, useMemo, useTransition, useOptimistic, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { cn, formatDate, formatPhoneNumber } from "@/lib/utils";
import { RotateCcw, Plus, X, Loader2, Search, ChevronDown, MapPin, Navigation } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";

type Client = {
  id: number;
  name: string;
  contact_person_name: string;
  contact_no: string;
  location_coordinates: string | null;
  mail_id: string | null;
  status: string;
  notes: string | null;
  created_at: Date | string;
  organization?: { name: string | null };
};

interface SalesmanClientsListProps {
  initialClients: Client[];
}

export function SalesmanClientsList({
  initialClients,
}: SalesmanClientsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [optimisticClients, setOptimisticClients] = useOptimistic(
    initialClients,
    (state, update: { action: "update" | "add"; client: Client }) => {
      if (update.action === "update") {
        return state.map((c) =>
          c.id === update.client.id ? { ...c, ...update.client } : c,
        );
      }
      if (update.action === "add") {
        return [update.client, ...state];
      }
      return state;
    },
  );

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    name: "",
    contact_person_name: "",
    mail_id: "",
    contact_no: "",
    status: "new_lead",
    notes: "",
    location_coordinates: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    contact_person_name: "",
    mail_id: "",
    contact_no: "",
    status: "",
    notes: "",
    location_coordinates: "",
  });

  // Action states
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilterRange, setDateFilterRange] = useState("all");
  const [customDate, setCustomDate] = useState("");

  // Memoized client filtering logic
  const filteredClients = useMemo(() => {
    return optimisticClients.filter((client) => {
      // 1. Search Query (Client Name)
      if (searchQuery.trim() !== "") {
        if (!client.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== "all" && client.status !== statusFilter) {
        return false;
      }

      // 3. Date Filter
      if (dateFilterRange !== "all") {
        const clientDate = new Date(client.created_at);
        clientDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilterRange === "today") {
          if (clientDate.getTime() !== today.getTime()) return false;
        } else if (dateFilterRange === "yesterday") {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          if (clientDate.getTime() !== yesterday.getTime()) return false;
        } else if (dateFilterRange === "week") {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          if (
            clientDate.getTime() < sevenDaysAgo.getTime() ||
            clientDate.getTime() > today.getTime()
          )
            return false;
        } else if (dateFilterRange === "month") {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (
            clientDate.getTime() < thirtyDaysAgo.getTime() ||
            clientDate.getTime() > today.getTime()
          )
            return false;
        } else if (dateFilterRange === "custom" && customDate) {
          const selectedDate = new Date(customDate);
          selectedDate.setHours(0, 0, 0, 0);
          if (clientDate.getTime() !== selectedDate.getTime()) return false;
        }
      }

      return true;
    });
  }, [
    optimisticClients,
    searchQuery,
    statusFilter,
    dateFilterRange,
    customDate,
  ]);

  function handleReset() {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilterRange("all");
    setCustomDate("");
  }

  // Add client submission
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name,
          contact_person_name: addForm.contact_person_name,
          mail_id: addForm.mail_id || null,
          contact_no: addForm.contact_no,
          status: addForm.status,
          notes: addForm.notes || null,
          location_coordinates: addForm.location_coordinates || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create client");
      }

      triggerToast("Client added successfully!");
      setAddForm({
        name: "",
        contact_person_name: "",
        mail_id: "",
        contact_no: "",
        status: "new_lead",
        notes: "",
        location_coordinates: "",
      });
      setIsAddOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // Open Edit Modal
  function openEditModal(client: Client) {
    setSelectedClient(client);
    setEditForm({
      name: client.name,
      contact_person_name: client.contact_person_name,
      mail_id: client.mail_id || "",
      contact_no: client.contact_no,
      status: client.status,
      notes: client.notes || "",
      location_coordinates: client.location_coordinates || "",
    });
    setErrorMsg(null);
    setIsEditOpen(true);
  }

  // Edit client submission
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) return;
    setErrorMsg(null);
    setIsSaving(true);

    const updatedClient: Client = {
      ...selectedClient,
      name: editForm.name,
      contact_person_name: editForm.contact_person_name,
      mail_id: editForm.mail_id || null,
      contact_no: editForm.contact_no,
      status: editForm.status,
      notes: editForm.notes || null,
      location_coordinates: editForm.location_coordinates || null,
    };

    setIsEditOpen(false);
    setSelectedClient(null);

    startTransition(async () => {
      setOptimisticClients({ action: "update", client: updatedClient });

      try {
        const res = await fetch(`/api/clients/${selectedClient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editForm.name,
            contact_person_name: editForm.contact_person_name,
            mail_id: editForm.mail_id || null,
            contact_no: editForm.contact_no,
            status: editForm.status,
            notes: editForm.notes || null,
            location_coordinates: editForm.location_coordinates || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update client");
        }

        triggerToast("Client details updated!");
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message);
        openEditModal(selectedClient);
      } finally {
        setIsSaving(false);
      }
    });
  }

  const hasActiveFilters =
    searchQuery !== "" || statusFilter !== "all" || dateFilterRange !== "all";

  return (
    <div className="space-y-4">
      {/* Top Header Row with Add Button */}
      <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 shadow-sm flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Leads List</h2>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm"
        >
          <Plus size={14} />
          <span>Add Client</span>
        </button>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search clients by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-1 focus:ring-slate-400/50 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters Selectors Row */}
        <div className="flex flex-wrap items-end gap-4 border-t border-slate-100/70 pt-3.5">
          {/* Status Filter */}
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label
              className="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
              htmlFor="status-filter"
            >
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 text-xs rounded-lg border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/50 outline-none bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="new_lead">New Lead</option>
              <option value="follow_up">Follow Up</option>
              <option value="onboarded">Onboarded</option>
              <option value="lost">Lost</option>
              <option value="target">Target</option>
            </select>
          </div>

          {/* Date Filter Range */}
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label
              className="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
              htmlFor="date-filter"
            >
              Date Added
            </label>
            <select
              id="date-filter"
              value={dateFilterRange}
              onChange={(e) => {
                setDateFilterRange(e.target.value);
                if (e.target.value !== "custom") setCustomDate("");
              }}
              className="h-10 px-3 text-xs rounded-lg border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/50 outline-none bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="custom">Custom Date...</option>
            </select>
          </div>

          {/* Custom Date Input */}
          {dateFilterRange === "custom" && (
            <div className="flex flex-col gap-1.5 min-w-[140px] animate-in fade-in duration-200">
              <label
                className="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                htmlFor="custom-date"
              >
                Select Calendar Date
              </label>
              <input
                id="custom-date"
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="h-10 px-3 text-xs rounded-lg border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/50 outline-none bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
              />
            </div>
          )}

          {/* Reset Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="h-10 px-3 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg flex items-center gap-1.5 transition duration-150 cursor-pointer ml-auto bg-white"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      {filteredClients.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="w-10 px-2 py-3 sm:hidden"></th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 hidden md:table-cell">Company</th>
                <th className="px-4 py-3 hidden sm:table-cell">Date Added</th>
                <th className="px-4 py-3 hidden md:table-cell">Location</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredClients.map((client) => {
                const isExpanded = expandedClientId === client.id;
                return (
                  <Fragment key={client.id}>
                    <tr
                      onClick={() => openEditModal(client)}
                      className="hover:bg-slate-50/60 transition cursor-pointer group"
                    >
                      <td
                        className="w-10 px-2 py-3 text-center sm:hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedClientId(isExpanded ? null : client.id);
                        }}
                      >
                        <div className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 mx-auto",
                          isExpanded
                            ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200"
                            : "bg-slate-100/80 text-slate-500 hover:bg-slate-200 hover:text-slate-700 ring-1 ring-slate-200/50"
                        )}>
                          <ChevronDown
                            size={15}
                            className={cn(
                              "transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 group-hover:text-indigo-600 transition">
                        {client.name}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatPhoneNumber(client.contact_no)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                        {client.organization?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap hidden sm:table-cell">
                        {formatDate(client.created_at)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {client.location_coordinates ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.location_coordinates)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold rounded-lg transition duration-150 shadow hover:shadow-md cursor-pointer border border-indigo-700/20 active:scale-95"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Navigation size={12} className="fill-current" />
                            <span>Navigate</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 flex items-center justify-between gap-2">
                        <Badge value={client.status} />
                        <span className="text-[10px] text-indigo-500 font-semibold opacity-0 group-hover:opacity-100 transition mr-2 hidden sm:inline-block">
                          Edit →
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/30 sm:hidden">
                        <td colSpan={5} className="px-4 py-3 text-xs text-slate-600 space-y-2 border-t border-slate-100/50">
                          <div>
                            <span className="font-semibold text-slate-500">Company:</span>{" "}
                            <span className="text-slate-800">{client.organization?.name ?? "-"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">Date Added:</span>{" "}
                            <span className="text-slate-800">{formatDate(client.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-500">Navigation:</span>{" "}
                            {client.location_coordinates ? (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.location_coordinates)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold rounded-lg transition duration-150 shadow hover:shadow-md cursor-pointer active:scale-95 ml-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Navigation size={12} className="fill-current" />
                                <span>Navigate</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 ml-1">-</span>
                            )}
                          </div>
                          {client.notes && (
                            <div>
                              <span className="font-semibold text-slate-500">Notes:</span>
                              <p className="mt-1 text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/50 leading-relaxed shadow-sm">
                                {client.notes}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 border-dashed text-center">
          <p className="text-sm font-medium text-slate-600">
            No clients match your filter/search criteria.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Try resetting the status, date filters, or search term to show all
            clients.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition duration-150 cursor-pointer shadow"
          >
            <RotateCcw size={14} />
            <span>Clear Filters</span>
          </button>
        </div>
      )}

      {/* Add Client Modal */}
      <Modal open={isAddOpen}>
        <div className="relative">
          <button
            onClick={() => setIsAddOpen(false)}
            className="absolute -top-1.5 -right-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>

          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Add New Client
            </h3>
            <p className="text-xs text-slate-500">
              Create a client card. It will automatically assign to you.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-3.5">
            <Input
              label="Client Name"
              type="text"
              required
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="e.g. Acme Corp"
              className="text-xs"
            />

            <Input
              label="Contact Person"
              type="text"
              required
              value={addForm.contact_person_name}
              onChange={(e) =>
                setAddForm({ ...addForm, contact_person_name: e.target.value })
              }
              placeholder="Full Name"
              className="text-xs"
            />

            <Input
              label="Email"
              type="email"
              value={addForm.mail_id}
              onChange={(e) =>
                setAddForm({ ...addForm, mail_id: e.target.value })
              }
              placeholder="email@example.com"
              className="text-xs"
            />

            <Input
              label="Phone Number"
              type="tel"
              required
              value={addForm.contact_no}
              onChange={(e) =>
                setAddForm({ ...addForm, contact_no: e.target.value })
              }
              placeholder="e.g. +97455556666"
              className="text-xs"
            />

            <Input
              label="Location Coordinates"
              type="text"
              value={addForm.location_coordinates}
              onChange={(e) =>
                setAddForm({ ...addForm, location_coordinates: e.target.value })
              }
              placeholder="e.g. 25.2854, 51.5310"
              className="text-xs"
            />

            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-semibold text-slate-700"
                htmlFor="add-status"
              >
                Status
              </label>
              <select
                id="add-status"
                value={addForm.status}
                onChange={(e) =>
                  setAddForm({ ...addForm, status: e.target.value })
                }
                className="h-10 px-3 text-xs rounded-md border border-slate-300 bg-white outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-100 cursor-pointer"
              >
                <option value="new_lead">New Lead</option>
                <option value="follow_up">Follow Up</option>
                <option value="onboarded">Onboarded</option>
                <option value="lost">Lost</option>
                <option value="target">Target</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-semibold text-slate-700"
                htmlFor="add-notes"
              >
                Notes
              </label>
              <textarea
                id="add-notes"
                value={addForm.notes}
                onChange={(e) =>
                  setAddForm({ ...addForm, notes: e.target.value })
                }
                placeholder="Details of conversations, expectations, etc."
                rows={3}
                className="w-full rounded-md border border-slate-300 bg-white p-3 text-xs outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-100"
              />
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
                <span>Save Client</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Client Modal */}
      <Modal open={isEditOpen}>
        <div className="relative">
          <button
            onClick={() => {
              setIsEditOpen(false);
              setSelectedClient(null);
            }}
            className="absolute -top-1.5 -right-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>

          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Update Client:{" "}
              <span className="text-indigo-600 font-semibold">
                {selectedClient?.name}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Edit this lead's information, status updates, or notes.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="space-y-3.5">
            <Input
              label="Client Name"
              type="text"
              required
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              className="text-xs"
            />

            <Input
              label="Contact Person"
              type="text"
              required
              value={editForm.contact_person_name}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  contact_person_name: e.target.value,
                })
              }
              className="text-xs"
            />

            <Input
              label="Email"
              type="email"
              value={editForm.mail_id}
              onChange={(e) =>
                setEditForm({ ...editForm, mail_id: e.target.value })
              }
              placeholder="No email provided"
              className="text-xs"
            />

            <Input
              label="Phone Number"
              type="tel"
              required
              value={editForm.contact_no}
              onChange={(e) =>
                setEditForm({ ...editForm, contact_no: e.target.value })
              }
              className="text-xs"
            />

            <Input
              label="Location Coordinates"
              type="text"
              value={editForm.location_coordinates}
              onChange={(e) =>
                setEditForm({ ...editForm, location_coordinates: e.target.value })
              }
              placeholder="e.g. 25.2854, 51.5310"
              className="text-xs"
            />

            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-semibold text-slate-700"
                htmlFor="edit-status"
              >
                Status
              </label>
              <select
                id="edit-status"
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
                className="h-10 px-3 text-xs rounded-md border border-slate-300 bg-white outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-100 cursor-pointer"
              >
                <option value="new_lead">New Lead</option>
                <option value="follow_up">Follow Up</option>
                <option value="onboarded">Onboarded</option>
                <option value="lost">Lost</option>
                <option value="target">Target</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-semibold text-slate-700"
                htmlFor="edit-notes"
              >
                Notes
              </label>
              <textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                placeholder="Add summary of conversations, deals, next steps..."
                rows={3}
                className="w-full rounded-md border border-slate-300 bg-white p-3 text-xs outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                  setSelectedClient(null);
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
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <Toast message={toastMsg || undefined} />
    </div>
  );
}
