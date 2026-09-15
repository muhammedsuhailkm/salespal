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
  Anchor,
  ArrowRight,
  ArrowLeftRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Tag,
  Sparkles,
  Layers,
  Building2,
  ShieldCheck,
  AlertCircle,
  Download,
} from "lucide-react";
import { ShippingRateModal } from "@/components/shipping-rates/ShippingRateModal";
import { Toast } from "@/components/ui/Toast";
import { cn, formatAmount, formatDate, titleCase } from "@/lib/utils";
import { orderModes } from "@/types/order";
import { commonCarriers, containerTypes, type ShippingRateListItem } from "@/types/shipping-rate";

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
  air: "bg-sky-50 text-sky-700 border-sky-200/80",
  sea: "bg-teal-50 text-teal-700 border-teal-200/80",
  land: "bg-amber-50 text-amber-700 border-amber-200/80",
};

const CONTAINER_DISPLAY: Record<string, { label: string; sub: string }> = {
  "20gp": { label: "20FT", sub: "Standard Dry (20GP)" },
  "40hc": { label: "40FT", sub: "High Cube (40HC)" },
};

function ModePill({ mode }: { mode: string }) {
  const Icon = MODE_ICON[mode] ?? Ship;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        MODE_COLORS[mode] ?? MODE_COLORS.sea,
      )}
    >
      <Icon size={11} className="stroke-[2.2]" />
      {titleCase(mode)}
    </span>
  );
}

function ContainerPill({ container }: { container: string }) {
  const is20 = container === "20gp";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider tabular-nums",
        is20
          ? "bg-slate-100 text-slate-700 border-slate-200/80"
          : "bg-indigo-50 text-indigo-700 border-indigo-200/80",
      )}
    >
      {is20 ? "20FT" : "40FT"}
    </span>
  );
}

function CarrierBadge({ carrier }: { carrier?: string | null }) {
  if (!carrier) {
    return <span className="text-xs text-slate-400 font-normal italic">—</span>;
  }

  // Consistent subtle styling based on carrier name
  const upper = carrier.toUpperCase();
  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
  if (upper.includes("MSC")) badgeStyle = "bg-amber-50 text-amber-800 border-amber-200/80";
  else if (upper.includes("MAERSK")) badgeStyle = "bg-sky-50 text-sky-800 border-sky-200/80";
  else if (upper.includes("CMA")) badgeStyle = "bg-rose-50 text-rose-800 border-rose-200/80";
  else if (upper.includes("COSCO")) badgeStyle = "bg-blue-50 text-blue-800 border-blue-200/80";
  else if (upper.includes("HAPAG")) badgeStyle = "bg-orange-50 text-orange-800 border-orange-200/80";

  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-xs font-bold tracking-tight", badgeStyle)}>
      <Tag size={10} className="stroke-[2.2] opacity-70" />
      {carrier}
    </span>
  );
}

export function ShippingRateTable({ initialRates, editable = false }: ShippingRateTableProps) {
  const router = useRouter();
  const [rates, setRates] = useState<ShippingRateListItem[]>(initialRates);

  // Synchronize on props change
  useEffect(() => {
    setRates(initialRates);
  }, [initialRates]);

  // ─── Rate Finder State ───
  const [finderFrom, setFinderFrom] = useState<string>("");
  const [finderTo, setFinderTo] = useState<string>("");
  const [finderContainer, setFinderContainer] = useState<string>("20gp");
  const [finderMode, setFinderMode] = useState<string>("sea");
  const [hasSearched, setHasSearched] = useState(false);
  const [matchedRate, setMatchedRate] = useState<ShippingRateListItem | null>(null);

  // ─── Table Directory Filter State ───
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("all");
  const [containerFilter, setContainerFilter] = useState("all");
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");

  // ─── CRUD Modal & Action State ───
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRateListItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Extract distinct locations and ports for Rate Finder dropdowns
  const originOptions = useMemo(() => {
    const list = new Set<string>();
    rates.forEach((r) => {
      if (r.location?.trim()) list.add(r.location.trim());
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [rates]);

  const destinationOptions = useMemo(() => {
    const list = new Set<string>();
    rates.forEach((r) => {
      if (r.port?.trim()) list.add(r.port.trim());
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [rates]);

  const distinctCarriers = useMemo(() => {
    const list = new Set<string>();
    rates.forEach((r) => {
      if (r.carrier?.trim()) list.add(r.carrier.trim());
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [rates]);

  // Set intelligent defaults for finder if options exist and not set
  useEffect(() => {
    if (rates.length > 0 && !finderFrom && originOptions.length > 0) {
      // Find standard entry or first
      const defaultOrigin = originOptions.find((o) => o.toLowerCase().includes("jnpt")) || originOptions[0];
      setFinderFrom(defaultOrigin);
    }
    if (rates.length > 0 && !finderTo && destinationOptions.length > 0) {
      const defaultDest = destinationOptions.find((d) => d.toLowerCase().includes("hamad")) || destinationOptions[0];
      setFinderTo(defaultDest);
    }
  }, [rates, originOptions, destinationOptions, finderFrom, finderTo]);

  // Execute Rate Finder Search
  function handleFindRate() {
    setHasSearched(true);
    if (!finderFrom || !finderTo) {
      setMatchedRate(null);
      return;
    }

    const fromNorm = finderFrom.trim().toLowerCase();
    const toNorm = finderTo.trim().toLowerCase();

    // Look for matching rate in memory:
    // Primary: location === FROM && port === TO
    // Fallback: port === FROM && location === TO (reversed entry resilience)
    const match = rates.find((r) => {
      const locMatch =
        (r.location.toLowerCase() === fromNorm && r.port.toLowerCase() === toNorm) ||
        (r.port.toLowerCase() === fromNorm && r.location.toLowerCase() === toNorm);
      if (!locMatch) return false;

      if (r.container !== finderContainer) return false;
      if (finderMode !== "all" && r.mode !== finderMode) return false;
      return true;
    });

    setMatchedRate(match ?? null);
  }

  // Swap Origin and Destination
  function handleSwapLocations() {
    const temp = finderFrom;
    setFinderFrom(finderTo);
    setFinderTo(temp);
    if (hasSearched) {
      // Re-trigger search after swapping
      setTimeout(() => handleFindRate(), 50);
    }
  }

  // Filtered rates for the directory table
  const filteredRates = useMemo(() => {
    return rates.filter((rate) => {
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matches =
          rate.location.toLowerCase().includes(query) ||
          rate.port.toLowerCase().includes(query) ||
          (rate.carrier && rate.carrier.toLowerCase().includes(query));
        if (!matches) return false;
      }
      if (modeFilter !== "all" && rate.mode !== modeFilter) return false;
      if (containerFilter !== "all" && rate.container !== containerFilter) return false;
      if (carrierFilter !== "all") {
        if (!rate.carrier || rate.carrier.toLowerCase() !== carrierFilter.toLowerCase()) return false;
      }
      if (currencyFilter !== "all") {
        const rateCur = rate.currency ?? "USD";
        if (rateCur !== currencyFilter) return false;
      }
      return true;
    });
  }, [rates, searchQuery, modeFilter, containerFilter, carrierFilter, currencyFilter]);

  const hasActiveTableFilters =
    searchQuery !== "" ||
    modeFilter !== "all" ||
    containerFilter !== "all" ||
    carrierFilter !== "all" ||
    currencyFilter !== "all";

  function handleResetTableFilters() {
    setSearchQuery("");
    setModeFilter("all");
    setContainerFilter("all");
    setCarrierFilter("all");
    setCurrencyFilter("all");
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this freight rate? This cannot be undone.")) return;
    setDeletingId(id);

    try {
      const res = await fetch(`/api/shipping-rates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete rate");
      }
      setRates((prev) => prev.filter((r) => r.id !== id));
      if (matchedRate?.id === id) {
        setMatchedRate(null);
      }
      triggerToast("Freight rate deleted successfully");
      router.refresh();
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setDeletingId(null);
    }
  }

function formatRatePrice(price: number | string, currency?: string | null) {
  const formatted = formatAmount(price);
  if (currency === "QAR") {
    return `QAR ${formatted}`;
  }
  return `$${formatted}`;
}

  // Calculate market range for display ($5,410.50 -> $5,000 - $5,821 or QAR)
  const marketRange = useMemo(() => {
    if (!matchedRate) return null;
    const price = matchedRate.price;
    const min = Math.round(price * 0.924);
    const max = Math.round(price * 1.076);
    return {
      minFormatted: formatRatePrice(min, matchedRate.currency),
      maxFormatted: formatRatePrice(max, matchedRate.currency),
    };
  }, [matchedRate]);

  // ─── Mobile filter toggle ───
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  return (
    <div className="space-y-5 sm:space-y-8 font-sans">
      {toastMsg && <Toast message={toastMsg} />}

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1: HERO FREIGHT RATE FINDER
          ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition">
        {/* Subtle top accent gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-indigo-600 to-sky-500" />

        <div className="p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm shrink-0">
                <Ship size={20} className="stroke-[1.75] sm:hidden" />
                <Ship size={22} className="stroke-[1.75] hidden sm:block" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 tracking-tight">Freight Rate Finder</h2>
                  <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-teal-700 border border-teal-200/60">
                    Live Rate Card
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 hidden sm:block">
                  Instant contract rates, carrier specs, and market benchmarks across verified logistics lanes.
                </p>
              </div>
            </div>

            {editable && (
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => alert("Rate import feature coming soon. You will be able to upload bulk rates via Excel/CSV.")}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs active:scale-95"
                  title="Import shipping rates from CSV or Excel"
                >
                  <Download size={14} className="text-slate-500" />
                  <span>Import</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingRate(null);
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm active:scale-95 shrink-0"
                >
                  <Plus size={15} />
                  <span className="hidden xs:inline">Add Freight Rate</span>
                  <span className="xs:hidden">Add</span>
                </button>
              </div>
            )}
          </div>

          {/* Rate Finder Search Panel — Mobile-first stacked layout */}
          <div className="pt-4 sm:pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-end">
              {/* Origin (FROM) */}
              <div className="lg:col-span-4 space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <MapPin size={12} className="text-teal-600" />
                  <span>FROM (Origin)</span>
                </label>
                <div className="relative">
                  <select
                    value={finderFrom}
                    onChange={(e) => setFinderFrom(e.target.value)}
                    className="h-11 sm:h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3.5 sm:pl-4 pr-10 text-[13px] sm:text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-100 cursor-pointer"
                  >
                    <option value="">Select origin...</option>
                    {originOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                    <MapPin size={16} />
                  </div>
                </div>
              </div>

              {/* Swap Button — horizontal on desktop, between fields on mobile */}
              <div className="lg:col-span-1 flex justify-center py-0.5 lg:pb-1">
                <button
                  type="button"
                  onClick={handleSwapLocations}
                  title="Swap Origin and Destination"
                  className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition cursor-pointer shadow-2xs active:scale-90"
                >
                  {/* Rotate 90° on mobile to show vertical swap */}
                  <ArrowLeftRight size={15} className="lg:rotate-0 rotate-90" />
                </button>
              </div>

              {/* Destination (TO) */}
              <div className="lg:col-span-4 space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Anchor size={12} className="text-indigo-600" />
                  <span>TO (Destination)</span>
                </label>
                <div className="relative">
                  <select
                    value={finderTo}
                    onChange={(e) => setFinderTo(e.target.value)}
                    className="h-11 sm:h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3.5 sm:pl-4 pr-10 text-[13px] sm:text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-100 cursor-pointer"
                  >
                    <option value="">Select destination...</option>
                    {destinationOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                    <Anchor size={16} />
                  </div>
                </div>
              </div>

              {/* Find Button */}
              <div className="lg:col-span-3">
                <button
                  type="button"
                  onClick={handleFindRate}
                  disabled={!finderFrom || !finderTo}
                  className="h-11 sm:h-12 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-bold shadow-sm transition active:scale-98 cursor-pointer"
                >
                  <Search size={16} />
                  <span>Find Rate</span>
                </button>
              </div>
            </div>

            {/* Sub-selectors: Container Type & Transport Mode — horizontal scroll on mobile */}
            <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                {/* Container Type Selectors */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                    Container:
                  </span>
                  <div className="inline-flex rounded-xl bg-slate-100 p-0.5 sm:p-1 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => {
                        setFinderContainer("20gp");
                        if (hasSearched) setTimeout(() => handleFindRate(), 50);
                      }}
                      className={cn(
                        "px-3 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap",
                        finderContainer === "20gp"
                          ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                          : "text-slate-600 hover:text-slate-900",
                      )}
                    >
                      20FT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFinderContainer("40hc");
                        if (hasSearched) setTimeout(() => handleFindRate(), 50);
                      }}
                      className={cn(
                        "px-3 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap",
                        finderContainer === "40hc"
                          ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                          : "text-slate-600 hover:text-slate-900",
                      )}
                    >
                      40FT
                    </button>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Mode:</span>
                  <div className="inline-flex gap-1 sm:gap-1.5">
                    {[
                      { id: "sea", label: "Sea", fullLabel: "Sea Freight", icon: Ship },
                      { id: "air", label: "Air", fullLabel: "Air Freight", icon: Plane },
                      { id: "land", label: "Land", fullLabel: "Land Freight", icon: Truck },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isActive = finderMode === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFinderMode(item.id);
                            if (hasSearched) setTimeout(() => handleFindRate(), 50);
                          }}
                          className={cn(
                            "inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold border transition cursor-pointer whitespace-nowrap",
                            isActive
                              ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                          )}
                        >
                          <Icon size={12} />
                          <span className="sm:hidden">{item.label}</span>
                          <span className="hidden sm:inline">{item.fullLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              RESULT CARD — Mobile-optimized stacked layout
              ═══════════════════════════════════════════════════════════ */}
          {hasSearched && (
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-100 animate-in fade-in duration-200">
              {matchedRate ? (
                <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-4 sm:p-6 md:p-7 shadow-xs">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center">
                    {/* Primary Rate Showcase */}
                    <div className="lg:col-span-7 space-y-3 sm:space-y-4">
                      {/* Status & Carrier Tag */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                        <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] sm:text-xs font-bold">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>Active Rate</span>
                        </span>
                        {matchedRate.carrier && (
                          <CarrierBadge carrier={matchedRate.carrier} />
                        )}
                        <ModePill mode={matchedRate.mode} />
                      </div>

                      {/* Route visualization — stacks vertically on very small screens */}
                      <div className="flex flex-col xs:flex-row items-start xs:items-center gap-1.5 sm:gap-3 text-slate-900">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <MapPin size={16} className="text-teal-600 shrink-0 sm:w-[18px] sm:h-[18px]" />
                          <span className="text-sm sm:text-base md:text-lg font-extrabold tracking-tight truncate">
                            {matchedRate.location}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 px-1 shrink-0">
                          <span className="h-0.5 w-4 sm:w-6 md:w-10 bg-slate-300 rounded" />
                          <Ship size={13} className="text-slate-500 sm:w-[15px] sm:h-[15px]" />
                          <ArrowRight size={14} className="text-slate-400 sm:w-4 sm:h-4" />
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <Anchor size={16} className="text-indigo-600 shrink-0 sm:w-[18px] sm:h-[18px]" />
                          <span className="text-sm sm:text-base md:text-lg font-extrabold tracking-tight truncate">
                            {matchedRate.port}
                          </span>
                        </div>
                      </div>

                      {/* Container & Metadata — compact on mobile */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-slate-500 pt-1">
                        <span className="font-semibold text-slate-700 bg-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md border border-slate-200 text-[11px] sm:text-xs">
                          {CONTAINER_DISPLAY[matchedRate.container]?.label ?? matchedRate.container.toUpperCase()}
                          <span className="text-slate-400 ml-1 hidden sm:inline">({CONTAINER_DISPLAY[matchedRate.container]?.sub ?? "Standard"})</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock size={11} className="text-slate-400" />
                          {formatDate(matchedRate.updated_at)}
                        </span>
                      </div>
                    </div>

                    {/* Pricing & Benchmark Panel */}
                    <div className="lg:col-span-5 flex flex-col justify-center rounded-xl bg-white border border-slate-200 p-4 sm:p-5 md:p-6 shadow-2xs space-y-3 sm:space-y-4">
                      <div>
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Contract Freight Rate
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                            {formatRatePrice(matchedRate.price, matchedRate.currency)}
                          </span>
                          <span className="text-[11px] sm:text-xs font-semibold text-slate-500">/ container</span>
                        </div>
                      </div>

                      {/* Market Range Benchmark */}
                      {marketRange && (
                        <div className="pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                              <TrendingUp size={11} className="text-teal-600" />
                              Market Range
                            </span>
                            <span className="text-[11px] sm:text-xs font-bold text-slate-700 tabular-nums block truncate">
                              {marketRange.minFormatted} — {marketRange.maxFormatted}
                            </span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-slate-400 bg-slate-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-slate-100 shrink-0">
                            Est. Index
                          </span>
                        </div>
                      )}

                      {/* Edit CTA if editable */}
                      {editable && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRate(matchedRate);
                              setModalOpen(true);
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 transition cursor-pointer"
                          >
                            <Edit3 size={12} />
                            <span>Modify this rate</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* No match found */
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-[13px] sm:text-sm font-bold text-slate-900">No rate found for this lane</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 max-w-md">
                      No rate for <span className="font-semibold text-slate-700">{finderFrom}</span> → <span className="font-semibold text-slate-700">{finderTo}</span> ({finderContainer === "20gp" ? "20FT" : "40FT"}).
                    </p>
                  </div>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRate(null);
                        setModalOpen(true);
                      }}
                      className="mt-1.5 inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-sm"
                    >
                      <Plus size={14} />
                      <span>Create Rate</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2: FREIGHT RATES DIRECTORY
          ══════════════════════════════════════════════════════════════ */}
      {/* Section Separator */}
      <div className="relative py-2 sm:py-3">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 sm:px-4 py-1 text-[11px] sm:text-xs font-bold text-slate-600 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Rate Directory
            <span className="text-slate-400 font-semibold">·</span>
            <span className="text-slate-400 font-semibold tabular-nums">{filteredRates.length} {filteredRates.length === 1 ? "rate" : "rates"}</span>
          </span>
        </div>
      </div>

      <section className="space-y-3 sm:space-y-4">

        {/* Filter Toolbar — Collapsible on mobile */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Search bar — always visible */}
          <div className="p-3 sm:p-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={15} />
              </div>
              <input
                type="text"
                placeholder="Search origin, port, carrier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 sm:pl-10 pr-4 text-[13px] sm:text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          {/* Mobile filter toggle */}
          <div className="md:hidden border-t border-slate-100 px-3 pb-3">
            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="w-full h-9 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider hover:text-slate-900 transition cursor-pointer"
            >
              <Layers size={12} />
              <span>{showMobileFilters ? "Hide Filters" : "Show Filters"}</span>
              {hasActiveTableFilters && (
                <span className="ml-1 h-4 w-4 rounded-full bg-teal-500 text-white text-[9px] font-bold flex items-center justify-center">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Filter Pills — visible on desktop, toggleable on mobile */}
          <div className={cn(
            "border-t border-slate-100 px-3 sm:px-4 pb-3 sm:pb-4 pt-2.5 sm:pt-3",
            "md:block",
            showMobileFilters ? "block" : "hidden",
          )}>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Mode Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mode:</span>
                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold rounded-md border border-slate-200 bg-slate-50 text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition"
                >
                  <option value="all">All</option>
                  {orderModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {titleCase(mode)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Container Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Size:</span>
                <select
                  value={containerFilter}
                  onChange={(e) => setContainerFilter(e.target.value)}
                  className="h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold rounded-md border border-slate-200 bg-slate-50 text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition"
                >
                  <option value="all">All</option>
                  {containerTypes.map((c) => (
                    <option key={c} value={c}>
                      {c === "20gp" ? "20FT" : "40FT"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Carrier Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Carrier:</span>
                <select
                  value={carrierFilter}
                  onChange={(e) => setCarrierFilter(e.target.value)}
                  className="h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold rounded-md border border-slate-200 bg-slate-50 text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition"
                >
                  <option value="all">All</option>
                  {distinctCarriers.map((carrier) => (
                    <option key={carrier} value={carrier}>
                      {carrier}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Currency:</span>
                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold rounded-md border border-slate-200 bg-slate-50 text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition"
                >
                  <option value="all">All</option>
                  <option value="USD">USD</option>
                  <option value="QAR">QAR</option>
                </select>
              </div>

              {/* Reset Button */}
              {hasActiveTableFilters && (
                <button
                  type="button"
                  onClick={handleResetTableFilters}
                  className="h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-md flex items-center gap-1 sm:gap-1.5 transition ml-auto cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            DATA DISPLAY — Mobile Cards + Desktop Table
            ═══════════════════════════════════════════════════════════ */}
        {filteredRates.length > 0 ? (
          <>
            {/* ─── MOBILE CARD LAYOUT (below md breakpoint) ─── */}
            <div className="md:hidden space-y-2.5">
              {filteredRates.map((rate) => (
                <div
                  key={rate.id}
                  className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all active:scale-[0.99]"
                >
                  {/* Card top — Route + Price */}
                  <div className="p-3.5">
                    {/* Route */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <MapPin size={13} className="text-teal-600 shrink-0" />
                        <span className="text-[13px] font-bold text-slate-900 truncate">{rate.location}</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-slate-300 shrink-0 px-0.5">
                        <span className="h-[1.5px] w-3 bg-slate-300 rounded" />
                        <ArrowRight size={12} className="text-slate-400" />
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                        <span className="text-[13px] font-bold text-slate-900 truncate text-right">{rate.port}</span>
                        <Anchor size={13} className="text-indigo-600 shrink-0" />
                      </div>
                    </div>

                    {/* Price row */}
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                        {formatRatePrice(rate.price, rate.currency)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <ModePill mode={rate.mode} />
                        <ContainerPill container={rate.container} />
                      </div>
                    </div>
                  </div>

                  {/* Card bottom — Metadata bar */}
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-50/70 border-t border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      {rate.carrier ? (
                        <CarrierBadge carrier={rate.carrier} />
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No carrier</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Clock size={11} className="text-slate-400" />
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium tabular-nums">
                        {formatDate(rate.updated_at)}
                      </span>
                    </div>
                  </div>

                  {/* Edit/Delete actions for editable mode */}
                  {editable && (
                    <div className="flex border-t border-slate-100 divide-x divide-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRate(rate);
                          setModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rate.id)}
                        disabled={deletingId === rate.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === rate.id ? (
                          <Loader2 size={13} className="animate-spin text-red-600" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ─── DESKTOP TABLE LAYOUT (md and above) ─── */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-2xs">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="px-4 py-3.5">Origin (Location)</th>
                    <th className="px-4 py-3.5">Destination (Port)</th>
                    <th className="px-4 py-3.5">Carrier</th>
                    <th className="px-4 py-3.5">Mode</th>
                    <th className="px-4 py-3.5">Container</th>
                    <th className="px-4 py-3.5">Freight Rate</th>
                    <th className="px-4 py-3.5">Last Updated</th>
                    {editable && <th className="px-4 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Location */}
                      <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-teal-600 shrink-0" />
                          {rate.location}
                        </span>
                      </td>

                      {/* Port */}
                      <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Anchor size={14} className="text-indigo-600 shrink-0" />
                          {rate.port}
                        </span>
                      </td>

                      {/* Carrier */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <CarrierBadge carrier={rate.carrier} />
                      </td>

                      {/* Mode */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <ModePill mode={rate.mode} />
                      </td>

                      {/* Container */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <ContainerPill container={rate.container} />
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3.5 font-extrabold text-slate-900 tabular-nums whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{formatRatePrice(rate.price, rate.currency)}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                            {rate.currency === "QAR" ? "QAR" : "USD"}
                          </span>
                        </span>
                      </td>

                      {/* Last Updated */}
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                        {formatDate(rate.updated_at)}
                        {rate.updatedBy?.name && (
                          <span className="block text-[10px] text-slate-400 font-medium">by {rate.updatedBy.name}</span>
                        )}
                      </td>

                      {/* Actions */}
                      {editable && (
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRate(rate);
                                setModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
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
                              {deletingId === rate.id ? (
                                <Loader2 size={14} className="animate-spin text-red-600" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-white rounded-xl border border-dashed border-slate-200 text-center space-y-2.5 sm:space-y-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Search size={16} />
            </div>
            <div>
              <p className="text-[13px] sm:text-sm font-bold text-slate-800">
                {rates.length === 0 ? "No freight rates recorded yet" : "No freight rates match your filters"}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                {rates.length === 0
                  ? "Publish your first contract shipping lane rate to quote clients."
                  : "Try clearing filters or adjusting search terms."}
              </p>
            </div>
            {hasActiveTableFilters && (
              <button
                type="button"
                onClick={handleResetTableFilters}
                className="mt-1.5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer shadow-sm"
              >
                <RotateCcw size={13} />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════
          EDIT / ADD MODAL
          ══════════════════════════════════════════════════════════════ */}
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
            // Also update matching rate if finder active
            if (matchedRate && matchedRate.id === saved.id) {
              setMatchedRate(saved);
            }
            triggerToast(editingRate ? "Freight rate updated successfully!" : "Freight rate added successfully!");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
