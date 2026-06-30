"use client";

import { useState, useMemo, useTransition, useOptimistic, Fragment, useEffect } from "react";
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
import { RotateCcw, X, ChevronDown, Navigation, User, Search, Building } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { clientStatuses } from "@/types/client";

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
  assigned_salesman_id: number;
  organization?: { name: string | null } | null;
  assignedSalesman?: { name: string | null } | null;
};

type SalesmanItem = {
  id: number;
  name: string;
};

interface ManagerClientsListProps {
  initialClients: Client[];
  salesmen: SalesmanItem[];
}

const rowColors: Record<string, string> = {
  lead: "bg-amber-100/45 hover:bg-amber-100/65",
  contacted: "bg-sky-100/40 hover:bg-sky-100/60",
  follow_up: "bg-indigo-100/40 hover:bg-indigo-100/60",
  proposal_sent: "bg-violet-100/40 hover:bg-violet-100/60",
  negotiation: "bg-orange-100/40 hover:bg-orange-100/60",
  onboarding_in_progress: "bg-cyan-100/40 hover:bg-cyan-100/60",
  onboarded: "bg-emerald-100/50 hover:bg-emerald-100/70",
  active_client: "bg-green-100/40 hover:bg-green-100/60",
  inactive: "bg-slate-100/40 hover:bg-slate-100/60",
  lost: "bg-rose-100/45 hover:bg-rose-100/65",
  cancelled: "bg-red-100/45 hover:bg-red-100/65",
  pending: "bg-slate-100/40 hover:bg-slate-100/60",
  in_process: "bg-cyan-100/40 hover:bg-cyan-100/60",
  achieved: "bg-emerald-100/50 hover:bg-emerald-100/70",
  unsuccessful: "bg-red-100/45 hover:bg-red-100/65",
};

const dropdownItemColors: Record<string, string> = {
  lead: "bg-amber-100/40 hover:bg-amber-100/65 text-amber-900 focus:bg-amber-100/50 focus:text-amber-900 border-l-[3px] border-amber-500",
  contacted: "bg-sky-100/30 hover:bg-sky-100/50 text-sky-900 focus:bg-sky-100/40 focus:text-sky-900 border-l-[3px] border-sky-500",
  follow_up: "bg-indigo-100/30 hover:bg-indigo-100/50 text-indigo-900 focus:bg-indigo-100/40 focus:text-indigo-900 border-l-[3px] border-indigo-500",
  proposal_sent: "bg-violet-100/30 hover:bg-violet-100/50 text-violet-900 focus:bg-violet-100/40 focus:text-violet-900 border-l-[3px] border-violet-500",
  negotiation: "bg-orange-100/30 hover:bg-orange-100/50 text-orange-900 focus:bg-orange-100/40 focus:text-orange-900 border-l-[3px] border-orange-500",
  onboarding_in_progress: "bg-cyan-100/30 hover:bg-cyan-100/50 text-cyan-900 focus:bg-cyan-100/40 focus:text-cyan-900 border-l-[3px] border-cyan-500",
  onboarded: "bg-emerald-100/40 hover:bg-emerald-100/60 text-emerald-900 focus:bg-emerald-100/50 focus:text-emerald-900 border-l-[3px] border-emerald-500",
  active_client: "bg-green-100/30 hover:bg-green-100/50 text-green-900 focus:bg-green-100/40 focus:text-green-900 border-l-[3px] border-green-500",
  inactive: "bg-slate-100/40 hover:bg-slate-100/60 text-slate-900 focus:bg-slate-100/50 focus:text-slate-900 border-l-[3px] border-slate-400",
  lost: "bg-rose-100/40 hover:bg-rose-100/60 text-rose-900 focus:bg-rose-100/50 focus:text-rose-900 border-l-[3px] border-rose-500",
  cancelled: "bg-red-100/40 hover:bg-red-100/60 text-red-900 focus:bg-red-100/50 focus:text-red-900 border-l-[3px] border-red-500",
  pending: "bg-slate-100/40 hover:bg-slate-100/60 text-slate-900 focus:bg-slate-100/50 focus:text-slate-900 border-l-[3px] border-slate-400",
  in_process: "bg-cyan-100/30 hover:bg-cyan-100/50 text-cyan-900 focus:bg-cyan-100/40 focus:text-cyan-900 border-l-[3px] border-cyan-500",
  achieved: "bg-emerald-100/40 hover:bg-emerald-100/60 text-emerald-900 focus:bg-emerald-100/50 focus:text-emerald-900 border-l-[3px] border-emerald-500",
  unsuccessful: "bg-red-100/40 hover:bg-red-100/60 text-red-900 focus:bg-red-100/50 focus:text-red-900 border-l-[3px] border-red-500",
};

export function ManagerClientsList({
  initialClients,
  salesmen,
}: ManagerClientsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [optimisticClients, setOptimisticClients] = useOptimistic(
    initialClients,
    (state, update: { action: "update"; client: Client }) => {
      if (update.action === "update") {
        return state.map((c) =>
          c.id === update.client.id ? { ...c, ...update.client } : c
        );
      }
      return state;
    }
  );

  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [salesmanFilter, setSalesmanFilter] = useState("all");
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

      // 3. Salesman Filter
      if (salesmanFilter !== "all" && client.assigned_salesman_id !== Number(salesmanFilter)) {
        return false;
      }

      // 4. Date Filter
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
    salesmanFilter,
    dateFilterRange,
    customDate,
  ]);

  function handleReset() {
    setSearchQuery("");
    setStatusFilter("all");
    setSalesmanFilter("all");
    setDateFilterRange("all");
    setCustomDate("");
  }

  async function handleStatusChange(clientId: number, newStatus: string) {
    const clientToUpdate = optimisticClients.find((c) => c.id === clientId);
    if (!clientToUpdate) return;

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
        triggerToast(`Status updated to ${newStatus.replace('_', ' ')}!`);
        router.refresh();
      } catch (err: any) {
        triggerToast(`Error: ${err.message}`);
        router.refresh();
      }
    });
  }

  const hasActiveFilters =
    searchQuery !== "" || statusFilter !== "all" || salesmanFilter !== "all" || dateFilterRange !== "all";

  return (
    <div className="space-y-4">
      {/* Top Header Row */}
      <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 shadow-sm flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Organization Clients ({filteredClients.length})
          </h2>
        </div>
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
          {/* Salesman Filter */}
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label
              className="text-[10px] font-bold text-slate-500 uppercase tracking-wider"
              htmlFor="salesman-filter"
            >
              Salesman
            </label>
            <select
              id="salesman-filter"
              value={salesmanFilter}
              onChange={(e) => setSalesmanFilter(e.target.value)}
              className="h-10 px-3 text-xs rounded-lg border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/50 outline-none bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
            >
              <option value="all">All Salesmen</option>
              {salesmen.map((s) => (
                <option key={s.id} value={s.id.toString()}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

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
                <th className="px-4 py-3 hidden lg:table-cell">Salesman</th>
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
                      className={cn(
                        "transition group border-b border-slate-100",
                        rowColors[client.status] ?? "bg-white hover:bg-slate-50/60"
                      )}
                    >
                      <td
                        className="w-10 px-2 py-3 text-center sm:hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedClientId(isExpanded ? null : client.id);
                        }}
                      >
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 mx-auto",
                            isExpanded
                              ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200"
                              : "bg-slate-100/80 text-slate-500 hover:bg-slate-200 hover:text-slate-700 ring-1 ring-slate-200/50"
                          )}
                        >
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
                          href={`/dashboard/manager/clients/${client.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-slate-900 hover:text-indigo-600 transition"
                        >
                          {client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatPhoneNumber(client.contact_no)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell font-medium">
                        {client.organization?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden lg:table-cell font-semibold">
                        {client.assignedSalesman?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap hidden sm:table-cell">
                        {formatDate(client.created_at)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {client.location_coordinates ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              client.location_coordinates
                            )}`}
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
                      <td className="px-4 py-3 relative">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="focus:outline-none transition active:scale-95 cursor-pointer inline-flex items-center gap-1 group"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Badge value={client.status} />
                              <ChevronDown
                                size={12}
                                className="text-slate-400 group-hover:text-slate-600 transition"
                              />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-48 bg-white border border-slate-200/80 shadow-2xl rounded-xl p-1 z-50 animate-in fade-in slide-in-from-top-2 max-h-[300px] overflow-y-auto"
                            align="end"
                            side="bottom"
                            sideOffset={6}
                            collisionPadding={8}
                          >
                            {clientStatuses.map((st) => (
                              <DropdownMenuItem
                                key={st}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(client.id, st);
                                }}
                                className={cn(
                                  "px-3 py-2 text-xs font-bold transition flex items-center gap-2 cursor-pointer outline-none rounded-lg my-0.5 mx-1",
                                  dropdownItemColors[st] ?? "text-slate-700 focus:bg-slate-50",
                                  client.status === st
                                    ? "ring-2 ring-indigo-500/40 ring-offset-1 font-extrabold"
                                    : ""
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full shrink-0",
                                    st === "onboarded" || st === "active_client"
                                      ? "bg-emerald-500"
                                      : st === "lost" || st === "cancelled"
                                      ? "bg-red-500"
                                      : st === "lead" || st === "contacted"
                                      ? "bg-amber-500"
                                      : "bg-blue-500"
                                  )}
                                />
                                {st
                                  .split("_")
                                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                  .join(" ")}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className={cn("sm:hidden", rowColors[client.status] ?? "bg-slate-50/30")}>
                        <td
                          colSpan={6}
                          className="px-4 py-3 text-xs text-slate-600 space-y-2 border-t border-slate-100/50"
                        >
                          <div>
                            <span className="font-semibold text-slate-500">Company:</span>{" "}
                            <span className="text-slate-800 font-medium">
                              {client.organization?.name ?? "-"}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">Salesman:</span>{" "}
                            <span className="text-slate-800 font-semibold">
                              {client.assignedSalesman?.name ?? "-"}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">Date Added:</span>{" "}
                            <span className="text-slate-800 font-medium">
                              {formatDate(client.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-500">Navigation:</span>{" "}
                            {client.location_coordinates ? (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  client.location_coordinates
                                )}`}
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
            Try resetting the status, salesman, date filters, or search term to show all clients.
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

      <Toast message={toastMsg || undefined} />
    </div>
  );
}
