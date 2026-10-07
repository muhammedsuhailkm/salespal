"use client";

import { CompanySelect, defaultCompanyId, type CompanyOption } from "@/components/clients/CompanySelect";
import { useState, useTransition, useOptimistic, Fragment, useEffect, useRef, useCallback } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedParam, useUrlFilters } from "@/hooks/useUrlFilters";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate, formatPhoneNumber } from "@/lib/utils";
import { RotateCcw, Plus, X, Loader2, Search, ChevronDown, MapPin, Navigation } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { clientStatusLabel, clientStatusLabels, clientStatuses } from "@/types/client";
import { clientStatusDotClass } from "@/components/clients/client-status-ui";
import { ContactDetailsDialog, type ContactPromptTarget } from "@/components/clients/ContactDetailsDialog";
import { missingContactFields, statusRequiresContact } from "@/lib/client-contact";

import { buttonVariants } from "@/components/ui/Button";
type Client = {
  id: number;
  name: string;
  contact_person_name: string;
  contact_no: string;
  contact_person_designation?: string | null;
  cr_no: string | null;
  cr_expiry_date: Date | string | null;
  location_coordinates: string | null;
  mail_id: string | null;
  status: string;
  notes: string | null;
  created_at: Date | string;
  organization?: { name: string | null };
};


const dropdownItemColors: Record<string, string> = {
  lead: "bg-warning-soft/40 hover:bg-warning-soft/65 text-warning-foreground focus:bg-warning-soft/50 focus:text-warning-foreground border-l-[3px] border-warning",
  contacted: "bg-info-soft/30 hover:bg-info-soft/50 text-info-foreground focus:bg-info-soft/40 focus:text-info-foreground border-l-[3px] border-info",
  follow_up: "bg-primary-soft/30 hover:bg-primary-soft/50 text-primary focus:bg-primary-soft/40 focus:text-primary border-l-[3px] border-primary",
  enquiry: "bg-primary-soft/30 hover:bg-primary-soft/50 text-primary focus:bg-primary-soft/40 focus:text-primary border-l-[3px] border-primary",
  onboarded: "bg-success-soft/40 hover:bg-success-soft/60 text-success-foreground focus:bg-success-soft/50 focus:text-success-foreground border-l-[3px] border-success",
  dormant: "bg-muted/40 hover:bg-muted/60 text-foreground focus:bg-muted/50 focus:text-foreground border-l-[3px] border-border-strong",
  lost: "bg-danger-soft/40 hover:bg-danger-soft/60 text-danger-foreground focus:bg-danger-soft/50 focus:text-danger-foreground border-l-[3px] border-danger",
  blacklisted: "bg-muted/60 hover:bg-muted/80 text-foreground focus:bg-muted/70 focus:text-foreground border-l-[3px] border-foreground",
  pending: "bg-muted/40 hover:bg-muted/60 text-foreground focus:bg-muted/50 focus:text-foreground border-l-[3px] border-border-strong",
  in_process: "bg-info-soft/30 hover:bg-info-soft/50 text-info-foreground focus:bg-info-soft/40 focus:text-info-foreground border-l-[3px] border-info",
  achieved: "bg-success-soft/40 hover:bg-success-soft/60 text-success-foreground focus:bg-success-soft/50 focus:text-success-foreground border-l-[3px] border-success",
  unsuccessful: "bg-danger-soft/40 hover:bg-danger-soft/60 text-danger-foreground focus:bg-danger-soft/50 focus:text-danger-foreground border-l-[3px] border-danger",
};

interface SalesmanClientsListProps {
  /** One server-filtered page of the salesman's clients. */
  initialClients: Client[];
  total: number;
  page: number;
  pageSize: number;
  /** Companies the salesman works for. */
  companies: CompanyOption[];
}

export function SalesmanClientsList({ initialClients, total, page, pageSize, companies }: SalesmanClientsListProps) {
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
  // Status change past Lead on a client with no contact details asks for them first
  const [contactPrompt, setContactPrompt] = useState<ContactPromptTarget | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    name: "",
    contact_person_name: "",
    contact_person_designation: "",
    mail_id: "",
    contact_no: "",
    cr_no: "",
    cr_expiry_date: "",
    status: "lead",
    notes: "",
    location_coordinates: "",
    org_id: defaultCompanyId(companies),
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
  // Search and filters live in the URL and are applied by the server (paged 50 at a time).
  const { get, set, reset, isPending: isNavigating } = useUrlFilters();
  const [searchQuery, setSearchQuery] = useDebouncedParam("q", set, get("q"));
  const statusFilter = get("status", "all");
  const dateFilterRange = get("date", "all");
  const customDate = get("day");

  // Memoized client filtering logic
  const filteredClients = optimisticClients;

  function handleReset() {
    setSearchQuery("");
    reset();
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
          contact_person_designation: addForm.contact_person_designation || null,
          mail_id: addForm.mail_id || null,
          contact_no: addForm.contact_no,
          cr_no: addForm.cr_no || null,
          cr_expiry_date: addForm.cr_expiry_date || null,
          status: addForm.status,
          notes: addForm.notes || null,
          location_coordinates: addForm.location_coordinates || null,
          org_id: addForm.org_id ? Number(addForm.org_id) : undefined,
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
        contact_person_designation: "",
        mail_id: "",
        contact_no: "",
        cr_no: "",
        cr_expiry_date: "",
        status: "lead",
        notes: "",
        location_coordinates: "",
        org_id: defaultCompanyId(companies),
      });
      setIsAddOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(clientId: number, newStatus: string) {
    const clientToUpdate = optimisticClients.find((c) => c.id === clientId);
    if (!clientToUpdate) return;

    if (statusRequiresContact(newStatus) && missingContactFields(clientToUpdate).length > 0) {
      setContactPrompt({ client: clientToUpdate, status: newStatus });
      return;
    }

    const updatedClient = { ...clientToUpdate, status: newStatus };

    startTransition(async () => {
      setOptimisticClients({ action: "update", client: updatedClient });
      try {
        const res = await fetch(`/api/clients/${clientId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update status");
        }
        triggerToast(`Status updated to ${clientStatusLabel(newStatus)}!`);
        router.refresh();
      } catch (err: any) {
        triggerToast(`Error: ${err.message}`);
        router.refresh();
      }
    });
  }



  const hasActiveFilters =
    searchQuery !== "" || statusFilter !== "all" || dateFilterRange !== "all";

  return (
    <div className="space-y-4">
      {/* Count + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground"><span className="font-semibold tabular-nums text-foreground">{total.toLocaleString()}</span> {total === 1 ? "client" : "clients"}</p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setIsAddOpen(true);
          }}
          className={buttonVariants({ size: "sm" })}
        >
          <Plus size={14} />
          <span>Add Client</span>
        </button>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col gap-4 bg-card p-4 rounded-card border border-border/80 shadow-card">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/80">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search clients by name or CR no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 w-full pl-10 pr-10"
          />
          {searchQuery && (
            <button aria-label="Close"
              onClick={() => setSearchQuery("")}
              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "absolute right-3 top-1/2")}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters Selectors Row */}
        <div className="flex flex-wrap items-end gap-4 border-t border-border/70 pt-3.5">
          {/* Status Filter */}
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label
              className="text-xs font-semibold text-muted-foreground"
              htmlFor="status-filter"
            >
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => set({ status: e.target.value })}
              className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {clientStatuses.map((st) => (
                <option key={st} value={st}>{clientStatusLabels[st]}</option>
              ))}
            </select>
          </div>

          {/* Date Filter Range */}
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label
              className="text-xs font-semibold text-muted-foreground"
              htmlFor="date-filter"
            >
              Date Added
            </label>
            <select
              id="date-filter"
              value={dateFilterRange}
              onChange={(e) => set({ date: e.target.value, day: e.target.value === "custom" ? customDate : null })}
              className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 cursor-pointer"
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
            <div className="flex flex-col gap-1.5 min-w-[140px] animate-page-in">
              <label
                className="text-xs font-semibold text-muted-foreground"
                htmlFor="custom-date"
              >
                Select Calendar Date
              </label>
              <input
                id="custom-date"
                type="date"
                value={customDate}
                onChange={(e) => set({ date: "custom", day: e.target.value })}
                className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10"
              />
            </div>
          )}

          {/* Reset Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "ml-auto")}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      {filteredClients.length > 0 ? (
        <div className={cn("space-y-1 transition-opacity", isNavigating && "opacity-60")} aria-busy={isNavigating}>
        <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-subtle text-xs text-muted-foreground font-medium">
              <tr>
                <th className="w-10 px-2 py-3 sm:hidden"></th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 hidden md:table-cell">CR No</th>
                <th className="px-4 py-3 hidden lg:table-cell">CR Expiry</th>
                <th className="px-4 py-3 hidden md:table-cell">Company</th>
                <th className="px-4 py-3 hidden sm:table-cell">Date Added</th>
                <th className="px-4 py-3 hidden md:table-cell">Location</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredClients.map((client) => {
                const isExpanded = expandedClientId === client.id;
                return (
                  <Fragment key={client.id}>
                    <tr
                      className={cn("transition group border-b border-border", "bg-card hover:bg-subtle/70")}
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
                            ? "bg-primary-soft text-primary ring-1 ring-primary/30"
                            : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground/85 ring-1 ring-border/50"
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
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/salesman/clients/${client.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-foreground hover:text-primary transition"
                        >
                          {client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatPhoneNumber(client.contact_no)}
                      </td>
                      <td className="px-4 py-3 text-foreground/85 hidden md:table-cell font-medium">
                        {client.cr_no ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                        {client.cr_expiry_date ? formatDate(client.cr_expiry_date) : "-"}
                      </td>
                      <td className="px-4 py-3 text-foreground/70 hidden md:table-cell">
                        {client.organization?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                        {formatDate(client.created_at)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {client.location_coordinates ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.location_coordinates)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "secondary", size: "sm" })}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Navigation size={12} />
                            <span>Navigate</span>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground/80">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 relative">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="focus:outline-none transition active:scale-95 cursor-pointer inline-flex items-center gap-1 group"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Badge value={client.status} />
                              <ChevronDown size={12} className="text-muted-foreground/80 group-hover:text-foreground/70 transition" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            className="w-48 bg-card border border-border/80 shadow-2xl rounded-card p-1 z-50 animate-pop-in max-h-[300px] overflow-y-auto" 
                            align="end"
                            side="bottom"
                            sideOffset={6}
                            collisionPadding={8}
                          >
                            {client.status === "blacklisted" && (
                              <p className="px-3 py-2 text-xs text-muted-foreground">Only a manager can take a client off the black list.</p>
                            )}
                            {client.status !== "blacklisted" && clientStatuses.filter((st) => st !== "blacklisted").map((st) => (
                              <DropdownMenuItem
                                key={st}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(client.id, st);
                                }}
                                className={cn(
                                  "px-3 py-2 text-xs font-semibold transition flex items-center gap-2 cursor-pointer outline-none rounded-lg my-0.5 mx-1",
                                  dropdownItemColors[st] ?? "text-foreground/85 focus:bg-subtle",
                                  client.status === st ? "ring-2 ring-primary/40 ring-offset-1 font-semibold" : ""
                                )}
                              >
                                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0",
                                  clientStatusDotClass(st)
                                )} />
                                {clientStatusLabels[st]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className={cn("sm:hidden", "bg-card hover:bg-subtle/70")}>
                        <td colSpan={5} className="px-4 py-3 text-xs text-foreground/70 space-y-2 border-t border-border/50">
                          <div>
                            <span className="font-semibold text-muted-foreground">CR No:</span>{" "}
                            <span className="text-foreground">{client.cr_no ?? "-"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-muted-foreground">CR Expiry:</span>{" "}
                            <span className="text-foreground">
                              {client.cr_expiry_date ? formatDate(client.cr_expiry_date) : "-"}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-muted-foreground">Company:</span>{" "}
                            <span className="text-foreground">{client.organization?.name ?? "-"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-muted-foreground">Date Added:</span>{" "}
                            <span className="text-foreground">{formatDate(client.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-muted-foreground">Navigation:</span>{" "}
                            {client.location_coordinates ? (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.location_coordinates)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "ml-1")}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Navigation size={12} />
                                <span>Navigate</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground/80 ml-1">-</span>
                            )}
                          </div>
                          {client.notes && (
                            <div>
                              <span className="font-semibold text-muted-foreground">Notes:</span>
                              <p className="mt-1 text-foreground/85 bg-card p-2.5 rounded-card border border-border/50 leading-relaxed shadow-card">
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
        <Pagination page={page} pageSize={pageSize} total={total} pending={isNavigating} noun="clients" onPage={(p) => set({ page: p })} />
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-card border border-border border-dashed text-center">
          <p className="text-sm font-medium text-foreground/70">
            No clients match your filter/search criteria.
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1">
            Try resetting the status, date filters, or search term to show all
            clients.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className={cn(buttonVariants({ size: "sm" }), "mt-4")}
          >
            <RotateCcw size={14} />
            <span>Clear Filters</span>
          </button>
        </div>
      )}

      {/* Add Client Modal */}
      <Modal onClose={() => setIsAddOpen(false)} open={isAddOpen}>
        <div className="relative">
          <button aria-label="Close"
            onClick={() => setIsAddOpen(false)}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "absolute -top-1.5 -right-1.5")}
          >
            <X size={16} />
          </button>

          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Add New Client
            </h3>
            <p className="text-xs text-muted-foreground">
              Create a client card. It will automatically assign to you.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-danger-soft border border-danger/30 rounded-lg text-xs text-danger-foreground font-medium">
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
              label={statusRequiresContact(addForm.status) ? "Contact Person" : "Contact Person (optional for leads)"}
              type="text"
              required={statusRequiresContact(addForm.status)}
              value={addForm.contact_person_name}
              onChange={(e) =>
                setAddForm({ ...addForm, contact_person_name: e.target.value })
              }
              placeholder="Full Name"
              className="text-xs"
            />

            <Input
              label={statusRequiresContact(addForm.status) ? "Designation" : "Designation (optional for leads)"}
              type="text"
              required={statusRequiresContact(addForm.status)}
              value={addForm.contact_person_designation}
              onChange={(e) => setAddForm({ ...addForm, contact_person_designation: e.target.value })}
              placeholder="e.g. Logistics Manager"
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
              label={statusRequiresContact(addForm.status) ? "Phone Number" : "Phone Number (optional for leads)"}
              type="tel"
              required={statusRequiresContact(addForm.status)}
              value={addForm.contact_no}
              onChange={(e) =>
                setAddForm({ ...addForm, contact_no: e.target.value })
              }
              placeholder="e.g. +97455556666"
              className="text-xs"
            />

            <Input
              label="CR No"
              type="text"
              value={addForm.cr_no}
              onChange={(e) => setAddForm({ ...addForm, cr_no: e.target.value })}
              placeholder="Commercial registration number"
              className="text-xs"
            />

            <Input
              label="CR Expiry Date"
              type="date"
              value={addForm.cr_expiry_date}
              onChange={(e) => setAddForm({ ...addForm, cr_expiry_date: e.target.value })}
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
                className="text-xs font-semibold text-foreground/85"
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
                className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 cursor-pointer"
              >
                {clientStatuses.filter((st) => st !== "blacklisted").map((st) => (
                  <option key={st} value={st}>{clientStatusLabels[st]}</option>
                ))}
              </select>
            </div>

            <CompanySelect id="add-company" companies={companies} value={addForm.org_id} onChange={(org_id) => setAddForm({ ...addForm, org_id })} />

            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-semibold text-foreground/85"
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
                className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 w-full py-2.5"
              />
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
                <span>Save Client</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>



      <ContactDetailsDialog
        target={contactPrompt}
        onClose={() => setContactPrompt(null)}
        onSaved={(status) => {
          setContactPrompt(null);
          triggerToast(`Status updated to ${clientStatusLabel(status)}!`);
          router.refresh();
        }}
      />

      <Toast message={toastMsg || undefined} />
    </div>
  );
}
