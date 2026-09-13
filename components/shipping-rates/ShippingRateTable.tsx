"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ship,
  Plane,
  Truck,
  Search,
  RotateCcw,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  MapPin,
} from "lucide-react";
import { ShippingRateModal } from "@/components/shipping-rates/ShippingRateModal";
import { Toast } from "@/components/ui/Toast";
import { cn, formatAmount, formatDate, titleCase } from "@/lib/utils";
import { orderModes } from "@/types/order";
import { containerTypes, type ShippingRateListItem } from "@/types/shipping-rate";

interface ShippingRateTableProps {
  initialRates: ShippingRateListItem[];
  editable?: boolean;
}

const MODE_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  air: Plane,
  sea: Ship,
  land: Truck,
};

const MODE_COLORS: Record<string, string> = {
  air: "bg-sky-50 text-sky-700 border-sky-200",
  sea: "bg-indigo-50 text-indigo-700 border-indigo-200",
  land: "bg-amber-50 text-amber-700 border-amber-200",
};

const CONTAINER_COLORS: Record<string, string> = {
  "20gp": "bg-slate-100 text-slate-700 border-slate-200",
  "40hc": "bg-violet-50 text-violet-700 border-violet-200",
};

function ModePill({ mode }: { mode: string }) {
  const Icon = MODE_ICON[mode] ?? Ship;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        MODE_COLORS[mode] ?? MODE_COLORS.sea,
      )}
    >
      <Icon size={10} />
      {titleCase(mode)}
    </span>
  );
}

function ContainerPill({ container }: { container: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        CONTAINER_COLORS[container] ?? CONTAINER_COLORS["20gp"],
      )}
    >
      {container.toUpperCase()}
    </span>
  );
}

export function ShippingRateTable({ initialRates, editable = false }: ShippingRateTableProps) {
  const router = useRouter();
  const [rates, setRates] = useState<ShippingRateListItem[]>(initialRates);
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("all");
  const [containerFilter, setContainerFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRateListItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setRates(initialRates);
  }, [initialRates]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredRates = useMemo(() => {
    return rates.filter((rate) => {
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matches = rate.location.toLowerCase().includes(query) || rate.port.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (modeFilter !== "all" && rate.mode !== modeFilter) return false;
      if (containerFilter !== "all" && rate.container !== containerFilter) return false;
      return true;
    });
  }, [rates, searchQuery, modeFilter, containerFilter]);

  const hasActiveFilters = searchQuery !== "" || modeFilter !== "all" || containerFilter !== "all";

  function handleReset() {
    setSearchQuery("");
    setModeFilter("all");
    setContainerFilter("all");
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this shipping rate? This cannot be undone.")) return;
    setDeletingId(id);

    try {
      const res = await fetch(`/api/shipping-rates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete rate");
      }
      setRates((prev) => prev.filter((r) => r.id !== id));
      triggerToast("Shipping rate deleted");
      router.refresh();
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {toastMsg && <Toast message={toastMsg} />}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-500/20">
            <Ship size={17} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Shipping Rate Card</h2>
            <p className="text-[11px] text-slate-500">{filteredRates.length} of {rates.length} lanes</p>
          </div>
        </div>

        {editable && (
          <button
            type="button"
            onClick={() => {
              setEditingRate(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm active:scale-95"
          >
            <Plus size={14} />
            <span>Add Rate</span>
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by location or port..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-1 focus:ring-slate-400/50 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-end gap-4 border-t border-slate-100/70 pt-3.5">
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mode</label>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="h-10 px-3 text-xs rounded-lg border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/50 outline-none bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
            >
              <option value="all">All Modes</option>
              {orderModes.map((mode) => (
                <option key={mode} value={mode}>
                  {titleCase(mode)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Container</label>
            <select
              value={containerFilter}
              onChange={(e) => setContainerFilter(e.target.value)}
              className="h-10 px-3 text-xs rounded-lg border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/50 outline-none bg-slate-50 text-slate-700 font-medium transition cursor-pointer"
            >
              <option value="all">All Containers</option>
              {containerTypes.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

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

      {/* Table */}
      {filteredRates.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Port</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Container</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3 hidden md:table-cell">Last Updated</th>
                {editable && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRates.map((rate) => (
                <tr key={rate.id} className="bg-white hover:bg-slate-50/60 transition">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      {rate.location}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{rate.port}</td>
                  <td className="px-4 py-3">
                    <ModePill mode={rate.mode} />
                  </td>
                  <td className="px-4 py-3">
                    <ContainerPill container={rate.container} />
                  </td>
                  <td className="px-4 py-3 font-extrabold text-slate-900 whitespace-nowrap">{formatAmount(rate.price)}</td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell whitespace-nowrap">
                    {formatDate(rate.updated_at)}
                    {rate.updatedBy?.name && (
                      <span className="block text-[10px] text-slate-400 font-medium mt-0.5">by {rate.updatedBy.name}</span>
                    )}
                  </td>
                  {editable && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRate(rate);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="Edit rate"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rate.id)}
                          disabled={deletingId === rate.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
                          title="Delete rate"
                        >
                          {deletingId === rate.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-200 text-center">
          <p className="text-sm font-medium text-slate-600">
            {rates.length === 0 ? "No shipping rates have been added yet." : "No rates match your filters."}
          </p>
          {rates.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition duration-150 cursor-pointer shadow"
            >
              <RotateCcw size={14} />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      )}

      {editable && (
        <ShippingRateModal
          rate={editingRate}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={(saved) => {
            setRates((prev) => {
              const exists = prev.some((r) => r.id === saved.id);
              return exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...prev];
            });
            triggerToast(editingRate ? "Rate updated successfully!" : "Rate added successfully!");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
