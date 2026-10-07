"use client";

import { clientStatusLabels, clientStatuses } from "@/types/client";

import { useState, Fragment } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedParam, useUrlFilters } from "@/hooks/useUrlFilters";
import { Badge } from "@/components/ui/Badge";
import { cn, formatDate, formatPhoneNumber } from "@/lib/utils";
import { RotateCcw, Search, ChevronDown, Navigation, Building, User, Mail, Calendar, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
type Client = {
  id: number;
  name: string;
  contact_person_name: string;
  contact_no: string;
  cr_no: string | null;
  cr_expiry_date: Date | string | null;
  location_coordinates: string | null;
  mail_id: string | null;
  status: string;
  notes: string | null;
  created_at: Date | string;
  org_id: number;
  assigned_salesman_id: number;
  organization?: { name: string | null } | null;
  assignedSalesman?: { name: string | null } | null;
};

type Company = {
  id: number;
  name: string;
};

type Manager = {
  id: number;
  name: string;
};

type ManagerSalesman = {
  manager_id: number;
  salesman_id: number;
  org_id: number;
};


/** Server-paginated client table: filters and search are URL params applied by the server. */
export function ClientTable({
  clients,
  total,
  page,
  pageSize,
  companies = [],
  managers = [],
  managerSalesmen = [],
}: {
  clients: Client[];
  total: number;
  page: number;
  pageSize: number;
  companies?: Company[];
  managers?: Manager[];
  managerSalesmen?: ManagerSalesman[];
}) {
  const { get, set, reset, isPending } = useUrlFilters();
  const statusFilter = get("status", "all");
  const companyFilter = get("company", "all");
  const managerFilter = get("manager", "all");
  const dateFilterRange = get("date", "all");
  const customDate = get("day");
  const [searchQuery, setSearchQuery] = useDebouncedParam("q", set, get("q"));
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const filteredClients = clients;

  function handleReset() {
    setSearchQuery("");
    reset();
  }

  const hasActiveFilters =
    searchQuery !== "" || statusFilter !== "all" || companyFilter !== "all" || managerFilter !== "all" || dateFilterRange !== "all";

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col gap-4 bg-card p-4 rounded-card border border-border/80 shadow-card">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/80">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by name, contact person, email or CR no..."
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
          {/* Company Filter */}
          <div className="flex flex-col gap-1.5 min-w-[150px]">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Building size={11} /> Company
            </label>
            <select
              value={companyFilter}
              onChange={(e) => set({ company: e.target.value })}
              className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 cursor-pointer"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Manager Filter */}
          {managers.length > 0 && (
            <div className="flex flex-col gap-1.5 min-w-[150px]">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <User size={11} /> Manager
              </label>
              <select
                value={managerFilter}
                onChange={(e) => set({ manager: e.target.value })}
                className="w-full rounded-control border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-ring focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 h-10 cursor-pointer"
              >
                <option value="all">All Managers</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-xs font-semibold text-muted-foreground">
              Status
            </label>
            <select
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
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar size={11} /> Date Added
            </label>
            <select
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
              <label className="text-xs font-semibold text-muted-foreground">
                Select Calendar Date
              </label>
              <input
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
        <div className={cn("space-y-1 transition-opacity", isPending && "opacity-60")} aria-busy={isPending}>
        <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-subtle text-xs text-muted-foreground font-medium">
              <tr>
                <th className="w-10 px-2 py-3"></th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 hidden md:table-cell">Company</th>
                <th className="px-4 py-3 hidden md:table-cell">Salesman</th>
                <th className="px-4 py-3 hidden sm:table-cell">CR No</th>
                <th className="px-4 py-3 hidden sm:table-cell">CR Expiry</th>
                <th className="px-4 py-3 hidden sm:table-cell">Date Added</th>
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
                        className="w-10 px-2 py-3 text-center cursor-pointer"
                        onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                      >
                        <div className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 mx-auto",
                          isExpanded
                            ? "bg-primary-soft text-primary ring-1 ring-primary/30"
                            : "bg-muted/85 text-muted-foreground hover:bg-muted hover:text-foreground/85 ring-1 ring-border/40"
                        )}>
                          <ChevronDown
                            size={14}
                            className={cn("transition-transform duration-200", isExpanded && "rotate-180")}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {client.name}
                        {client.contact_person_name && (
                          <span className="block text-[10px] text-muted-foreground/80 font-medium mt-0.5">
                            Attn: {client.contact_person_name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatPhoneNumber(client.contact_no)}
                        {client.mail_id && (
                          <span className="block text-[10px] text-muted-foreground/80 font-medium mt-0.5 truncate max-w-[180px]">
                            {client.mail_id}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground/85 hidden md:table-cell font-medium">
                        {client.organization?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-foreground/85 hidden md:table-cell font-medium">
                        {client.assignedSalesman?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-foreground/85 hidden sm:table-cell font-medium whitespace-nowrap">
                        {client.cr_no ?? "-"}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 whitespace-nowrap hidden sm:table-cell",
                          client.cr_expiry_date && new Date(client.cr_expiry_date) < new Date()
                            ? "text-danger-foreground font-semibold"
                            : "text-muted-foreground"
                        )}
                      >
                        {client.cr_expiry_date ? formatDate(client.cr_expiry_date) : "-"}
                        {client.cr_expiry_date && new Date(client.cr_expiry_date) < new Date() ? " (expired)" : ""}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                        {formatDate(client.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={client.status} />
                      </td>
                    </tr>
                    {isExpanded && (() => {
                      // The manager the salesman works under for this client's company.
                      const relation =
                        managerSalesmen.find((ms) => ms.salesman_id === client.assigned_salesman_id && ms.org_id === client.org_id) ??
                        managerSalesmen.find((ms) => ms.salesman_id === client.assigned_salesman_id);
                      const managerName = relation
                        ? (managers.find((m) => m.id === relation.manager_id)?.name ?? "None")
                        : "None";

                      return (
                        <tr className={cn("bg-card hover:bg-subtle/70")}>
                          <td colSpan={9} className="px-6 py-4 text-xs text-foreground/85 space-y-3.5 border-t border-border/50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="space-y-1">
                                <span className="font-semibold text-muted-foreground/80 text-xs block">CR No</span>
                                <span className="text-foreground text-xs font-semibold">{client.cr_no ?? "-"}</span>
                              </div>
                              <div className="space-y-1">
                                <span className="font-semibold text-muted-foreground/80 text-xs block">CR Expiry</span>
                                <span className="text-foreground text-xs font-semibold">
                                  {client.cr_expiry_date ? formatDate(client.cr_expiry_date) : "-"}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="font-semibold text-muted-foreground/80 text-xs block">Assigned Company</span>
                                <span className="text-foreground text-xs font-semibold flex items-center gap-1">
                                  <Building size={13} className="text-muted-foreground/80" /> {client.organization?.name ?? "None"}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="font-semibold text-muted-foreground/80 text-xs block">Assigned Manager</span>
                                <span className="text-foreground text-xs font-semibold flex items-center gap-1">
                                  <User size={13} className="text-muted-foreground/80" /> {managerName}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="font-semibold text-muted-foreground/80 text-xs block">Assigned Salesman</span>
                                <span className="text-foreground text-xs font-semibold flex items-center gap-1">
                                  <User size={13} className="text-muted-foreground/80" /> {client.assignedSalesman?.name ?? "None"}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="font-semibold text-muted-foreground/80 text-xs block">Coordinates / Navigation</span>
                                {client.location_coordinates ? (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.location_coordinates)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                                  >
                                    <Navigation size={11} />
                                    <span>Open Google Maps</span>
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground/80">-</span>
                                )}
                              </div>
                            </div>
                          {client.notes && (
                            <div className="space-y-1">
                              <span className="font-semibold text-muted-foreground/80 text-xs block">Client Notes</span>
                              <p className="text-foreground/85 bg-card/70 p-3 rounded-xl border border-border/50 leading-relaxed shadow-sm font-medium">
                                {client.notes}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })()}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} pending={isPending} noun="clients" onPage={(p) => set({ page: p })} />
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-card border border-border border-dashed text-center">
          <p className="text-sm font-medium text-foreground/70">
            No clients match your filter/search criteria.
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1">
            Try resetting the company, status, date filters, or search term to show all clients.
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
    </div>
  );
}
