"use client";

import { useState, useMemo, Fragment } from "react";
import { Badge } from "@/components/ui/Badge";
import { cn, formatDate, formatPhoneNumber } from "@/lib/utils";
import { RotateCcw, Search, ChevronDown, Navigation, Building, User, Mail, Calendar, X } from "lucide-react";

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
};

const rowColors: Record<string, string> = {
  lead: "bg-amber-100/40 hover:bg-amber-100/60 text-amber-950",
  contacted: "bg-sky-100/35 hover:bg-sky-100/55 text-sky-950",
  follow_up: "bg-indigo-100/35 hover:bg-indigo-100/55 text-indigo-950",
  proposal_sent: "bg-violet-100/35 hover:bg-violet-100/55 text-violet-950",
  negotiation: "bg-orange-100/35 hover:bg-orange-100/55 text-orange-950",
  onboarding_in_progress: "bg-cyan-100/35 hover:bg-cyan-100/55 text-cyan-950",
  onboarded: "bg-emerald-100/45 hover:bg-emerald-100/65 text-emerald-950",
  active_client: "bg-green-100/35 hover:bg-green-100/55 text-green-950",
  inactive: "bg-slate-100/35 hover:bg-slate-100/55 text-slate-950",
  lost: "bg-rose-100/40 hover:bg-rose-100/60 text-rose-950",
  cancelled: "bg-red-100/40 hover:bg-red-100/60 text-red-950",
  pending: "bg-slate-100/35 hover:bg-slate-100/55 text-slate-950",
  in_process: "bg-cyan-100/35 hover:bg-cyan-100/55 text-cyan-950",
  achieved: "bg-emerald-100/45 hover:bg-emerald-100/65 text-emerald-950",
  unsuccessful: "bg-red-100/40 hover:bg-red-100/60 text-red-950",
};

export function ClientTable({
  clients,
  companies = [],
  managers = [],
  managerSalesmen = [],
}: {
  clients: Client[];
  companies?: Company[];
  managers?: Manager[];
  managerSalesmen?: ManagerSalesman[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [dateFilterRange, setDateFilterRange] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);

  // Memoized client filtering logic
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // 1. Search Query (Client Name, contact, or email)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesName = client.name.toLowerCase().includes(query);
        const matchesContactPerson = client.contact_person_name.toLowerCase().includes(query);
        const matchesEmail = client.mail_id?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesContactPerson && !matchesEmail) {
          return false;
        }
      }

      // 2. Company/Org Filter
      if (companyFilter !== "all" && client.org_id !== Number(companyFilter)) {
        return false;
      }

      // 3. Manager Filter
      if (managerFilter !== "all") {
        const assignedSalesmanIds = managerSalesmen
          .filter((ms) => ms.manager_id === Number(managerFilter))
          .map((ms) => ms.salesman_id);
        if (!assignedSalesmanIds.includes(client.assigned_salesman_id)) {
          return false;
        }
      }

      // 4. Status Filter
      if (statusFilter !== "all" && client.status !== statusFilter) {
        return false;
      }

      // 5. Date Filter
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
          if (clientDate.getTime() < sevenDaysAgo.getTime() || clientDate.getTime() > today.getTime()) return false;
        } else if (dateFilterRange === "month") {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (clientDate.getTime() < thirtyDaysAgo.getTime() || clientDate.getTime() > today.getTime()) return false;
        } else if (dateFilterRange === "custom" && customDate) {
          const selectedDate = new Date(customDate);
          selectedDate.setHours(0, 0, 0, 0);
          if (clientDate.getTime() !== selectedDate.getTime()) return false;
        }
      }

      return true;
    });
  }, [clients, searchQuery, companyFilter, managerFilter, managerSalesmen, statusFilter, dateFilterRange, customDate]);

  function handleReset() {
    setSearchQuery("");
    setStatusFilter("all");
    setCompanyFilter("all");
    setManagerFilter("all");
    setDateFilterRange("all");
    setCustomDate("");
  }

  const hasActiveFilters =
    searchQuery !== "" || statusFilter !== "all" || companyFilter !== "all" || managerFilter !== "all" || dateFilterRange !== "all";

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search clients by name, contact person, or email..."
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
          {/* Company Filter */}
          <div className="flex flex-col gap-1.5 min-w-[150px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Building size={11} /> Company
            </label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="h-10 px-3 text-xs rounded-lg border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/50 outline-none bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <User size={11} /> Manager
              </label>
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="h-10 px-3 text-xs rounded-lg border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/50 outline-none bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
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
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 text-xs rounded-lg border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/50 outline-none bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="lead">Lead</option>
              <option value="contacted">Contacted</option>
              <option value="follow_up">Follow Up</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="negotiation">Negotiation</option>
              <option value="onboarding_in_progress">Onboarding In Progress</option>
              <option value="onboarded">Onboarded</option>
              <option value="active_client">Active Client</option>
              <option value="inactive">Inactive</option>
              <option value="lost">Lost</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date Filter Range */}
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={11} /> Date Added
            </label>
            <select
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Select Calendar Date
              </label>
              <input
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
                <th className="w-10 px-2 py-3"></th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 hidden md:table-cell">Company</th>
                <th className="px-4 py-3 hidden md:table-cell">Salesman</th>
                <th className="px-4 py-3 hidden sm:table-cell">Date Added</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredClients.map((client) => {
                const isExpanded = expandedClientId === client.id;
                return (
                  <Fragment key={client.id}>
                    <tr
                      className={cn("transition group border-b border-slate-100", rowColors[client.status] ?? "bg-white hover:bg-slate-50/60")}
                    >
                      <td
                        className="w-10 px-2 py-3 text-center cursor-pointer"
                        onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                      >
                        <div className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 mx-auto",
                          isExpanded
                            ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200"
                            : "bg-slate-100/85 text-slate-500 hover:bg-slate-200 hover:text-slate-700 ring-1 ring-slate-200/40"
                        )}>
                          <ChevronDown
                            size={14}
                            className={cn("transition-transform duration-200", isExpanded && "rotate-180")}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {client.name}
                        {client.contact_person_name && (
                          <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
                            Attn: {client.contact_person_name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-950">
                        {formatPhoneNumber(client.contact_no)}
                        {client.mail_id && (
                          <span className="block text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[180px]">
                            {client.mail_id}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 hidden md:table-cell font-medium">
                        {client.organization?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 hidden md:table-cell font-medium">
                        {client.assignedSalesman?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap hidden sm:table-cell">
                        {formatDate(client.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={client.status} />
                      </td>
                    </tr>
                    {isExpanded && (() => {
                      const relation = managerSalesmen.find((ms) => ms.salesman_id === client.assigned_salesman_id);
                      const managerName = relation
                        ? (managers.find((m) => m.id === relation.manager_id)?.name ?? "None")
                        : "None";

                      return (
                        <tr className={cn(rowColors[client.status] ?? "bg-slate-50/20")}>
                          <td colSpan={7} className="px-6 py-4 text-xs text-slate-700 space-y-3.5 border-t border-slate-100/50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block">Assigned Company</span>
                                <span className="text-slate-800 text-xs font-semibold flex items-center gap-1">
                                  <Building size={13} className="text-slate-400" /> {client.organization?.name ?? "None"}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block">Assigned Manager</span>
                                <span className="text-slate-800 text-xs font-semibold flex items-center gap-1">
                                  <User size={13} className="text-slate-400" /> {managerName}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block">Assigned Salesman</span>
                                <span className="text-slate-800 text-xs font-semibold flex items-center gap-1">
                                  <User size={13} className="text-slate-400" /> {client.assignedSalesman?.name ?? "None"}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block">Coordinates / Navigation</span>
                                {client.location_coordinates ? (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.location_coordinates)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-700 text-[10px] font-bold rounded-lg transition duration-150 shadow shadow-indigo-200 cursor-pointer border border-indigo-700/20 active:scale-95"
                                  >
                                    <Navigation size={11} className="fill-current" />
                                    <span>Open Google Maps</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </div>
                            </div>
                          {client.notes && (
                            <div className="space-y-1">
                              <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block">Client Notes</span>
                              <p className="text-slate-700 bg-white/70 p-3 rounded-xl border border-slate-200/50 leading-relaxed shadow-sm font-medium">
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
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 border-dashed text-center">
          <p className="text-sm font-medium text-slate-600">
            No clients match your filter/search criteria.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Try resetting the company, status, date filters, or search term to show all clients.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition duration-150 cursor-pointer shadow"
          >
            <RotateCcw size={14} />
            <span>Clear Filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
