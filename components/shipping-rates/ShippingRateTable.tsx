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
  Layers,
  AlertCircle,
  Download,
  Trophy,
  Zap,
  Filter,
  ChevronDown,
} from "lucide-react";
import { ShippingRateModal } from "@/components/shipping-rates/ShippingRateModal";
import { Toast } from "@/components/ui/Toast";
import { Badge } from "@/components/ds/Badge";
import { RateCard, type RateCardBadge } from "@/components/ds/RateCard";
import { cn, formatAmount, formatDate, titleCase } from "@/lib/utils";
import { orderModes } from "@/types/order";
import { containerTypes, type ShippingRateListItem } from "@/types/shipping-rate";

/* ═══════════════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */

import type { LucideIcon } from "lucide-react";

interface ShippingRateTableProps {
  initialRates: ShippingRateListItem[];
  editable?: boolean;
}

const MODE_ICON: Record<string, LucideIcon> = {
  air: Plane,
  sea: Ship,
  land: Truck,
};

function formatRatePrice(price: number | string, currency?: string | null): string {
  const formatted = formatAmount(price);
  return currency === "QAR" ? `QAR ${formatted}` : `$${formatted}`;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export function ShippingRateTable({ initialRates, editable = false }: ShippingRateTableProps) {
  const router = useRouter();
  const [rates, setRates] = useState<ShippingRateListItem[]>(initialRates);

  useEffect(() => { setRates(initialRates); }, [initialRates]);

  // ─── Rate Finder State ───
  const [finderFrom, setFinderFrom] = useState("");
  const [finderTo, setFinderTo] = useState("");
  const [finderContainer, setFinderContainer] = useState("20gp");
  const [finderMode, setFinderMode] = useState("sea");
  const [hasSearched, setHasSearched] = useState(false);
  const [matchedRate, setMatchedRate] = useState<ShippingRateListItem | null>(null);

  // ─── Directory Filter State ───
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("all");
  const [containerFilter, setContainerFilter] = useState("all");
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // ─── CRUD State ───
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRateListItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ─── Computed Options ───
  const originOptions = useMemo(() => {
    const s = new Set<string>();
    rates.forEach((r) => { if (r.location?.trim()) s.add(r.location.trim()); });
    return Array.from(s).sort();
  }, [rates]);

  const destinationOptions = useMemo(() => {
    const s = new Set<string>();
    rates.forEach((r) => { if (r.port?.trim()) s.add(r.port.trim()); });
    return Array.from(s).sort();
  }, [rates]);

  const distinctCarriers = useMemo(() => {
    const s = new Set<string>();
    rates.forEach((r) => { if (r.carrier?.trim()) s.add(r.carrier.trim()); });
    return Array.from(s).sort();
  }, [rates]);

  // ─── Smart Defaults ───
  useEffect(() => {
    if (rates.length > 0 && !finderFrom && originOptions.length > 0) {
      setFinderFrom(originOptions.find((o) => o.toLowerCase().includes("jnpt")) || originOptions[0]);
    }
    if (rates.length > 0 && !finderTo && destinationOptions.length > 0) {
      setFinderTo(destinationOptions.find((d) => d.toLowerCase().includes("hamad")) || destinationOptions[0]);
    }
  }, [rates, originOptions, destinationOptions, finderFrom, finderTo]);

  // ─── Rate Finder Logic ───
  function handleFindRate() {
    setHasSearched(true);
    if (!finderFrom || !finderTo) { setMatchedRate(null); return; }
    const from = finderFrom.trim().toLowerCase();
    const to = finderTo.trim().toLowerCase();
    const match = rates.find((r) => {
      const locMatch =
        (r.location.toLowerCase() === from && r.port.toLowerCase() === to) ||
        (r.port.toLowerCase() === from && r.location.toLowerCase() === to);
      if (!locMatch) return false;
      if (r.container !== finderContainer) return false;
      if (finderMode !== "all" && r.mode !== finderMode) return false;
      return true;
    });
    setMatchedRate(match ?? null);
  }

  function handleSwap() {
    const temp = finderFrom;
    setFinderFrom(finderTo);
    setFinderTo(temp);
    if (hasSearched) setTimeout(handleFindRate, 50);
  }

  // ─── Filtered Rates ───
  const filteredRates = useMemo(() => {
    return rates.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!r.location.toLowerCase().includes(q) && !r.port.toLowerCase().includes(q) && !(r.carrier && r.carrier.toLowerCase().includes(q))) return false;
      }
      if (modeFilter !== "all" && r.mode !== modeFilter) return false;
      if (containerFilter !== "all" && r.container !== containerFilter) return false;
      if (carrierFilter !== "all" && (!r.carrier || r.carrier.toLowerCase() !== carrierFilter.toLowerCase())) return false;
      if (currencyFilter !== "all" && (r.currency ?? "USD") !== currencyFilter) return false;
      return true;
    });
  }, [rates, searchQuery, modeFilter, containerFilter, carrierFilter, currencyFilter]);

  const hasActiveFilters = searchQuery !== "" || modeFilter !== "all" || containerFilter !== "all" || carrierFilter !== "all" || currencyFilter !== "all";

  function resetFilters() {
    setSearchQuery(""); setModeFilter("all"); setContainerFilter("all"); setCarrierFilter("all"); setCurrencyFilter("all");
  }

  // ─── Find Best Price/Fastest ───
  const bestPriceId = useMemo(() => {
    if (filteredRates.length < 2) return null;
    let best: ShippingRateListItem | null = null;
    for (const r of filteredRates) {
      if (!best || r.price < best.price) {
        best = r;
      }
    }
    return best ? best.id : null;
  }, [filteredRates]);

  // ─── Delete Handler ───
  async function handleDelete(id: number) {
    if (!confirm("Delete this freight rate? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/shipping-rates/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to delete rate"); }
      setRates((prev) => prev.filter((r) => r.id !== id));
      if (matchedRate?.id === id) setMatchedRate(null);
      triggerToast("Freight rate deleted");
      router.refresh();
    } catch (err: any) {
      triggerToast(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Market Range ───
  const marketRange = useMemo(() => {
    if (!matchedRate) return null;
    const min = Math.round(matchedRate.price * 0.924);
    const max = Math.round(matchedRate.price * 1.076);
    return { min: formatRatePrice(min, matchedRate.currency), max: formatRatePrice(max, matchedRate.currency) };
  }, [matchedRate]);

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-5 sm:space-y-6" style={{ fontFamily: "var(--ds-font-sans)" }}>
      {toastMsg && <Toast message={toastMsg} />}

      {/* ══════════════════════════════════════════════════
          SECTION 1: FREIGHT RATE FINDER
          ══════════════════════════════════════════════════ */}
      <section className="ss-card overflow-hidden">
        {/* Navy header bar */}
        <div
          className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ background: "var(--ds-surface-header)", color: "var(--ds-text-inverse)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Ship size={20} className="shrink-0 opacity-80" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight">Freight Rate Finder</h2>
              <p className="text-xs opacity-60 mt-0.5 hidden sm:block">
                Search contract rates across carriers and logistics lanes
              </p>
            </div>
          </div>
          {editable && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => alert("Rate import feature coming soon. You will be able to upload bulk rates via Excel/CSV.")}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition cursor-pointer active:scale-95"
                style={{ background: "rgba(255,255,255,0.1)", color: "var(--ds-text-inverse)", border: "1px solid rgba(255,255,255,0.15)" }}
                title="Import shipping rates from CSV or Excel"
              >
                <Download size={13} />
                <span>Import</span>
              </button>
              <button
                type="button"
                onClick={() => { setEditingRate(null); setModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-md transition cursor-pointer active:scale-95"
                style={{ background: "var(--ds-text-inverse)", color: "var(--ds-surface-header)" }}
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Add Freight Rate</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          )}
        </div>

        {/* Finder Form */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-end">
            {/* Origin */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="ss-type-label flex items-center gap-1.5">
                <MapPin size={12} style={{ color: "var(--ss-teal-600)" }} />
                FROM
              </label>
              <div className="relative">
                <select
                  value={finderFrom}
                  onChange={(e) => setFinderFrom(e.target.value)}
                  className="h-11 w-full appearance-none rounded-md pl-3.5 pr-10 text-[13px] font-medium outline-none transition cursor-pointer"
                  style={{ background: "var(--ds-surface-sunken)", border: "1px solid var(--ds-border-default)", color: "var(--ds-text-primary)" }}
                >
                  <option value="">Select origin...</option>
                  {originOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--ds-text-muted)" }} />
              </div>
            </div>

            {/* Swap */}
            <div className="lg:col-span-1 flex justify-center py-0.5 lg:pb-1">
              <button
                type="button"
                onClick={handleSwap}
                title="Swap"
                className="h-9 w-9 flex items-center justify-center rounded-md transition cursor-pointer active:scale-90"
                style={{ background: "var(--ds-surface-sunken)", border: "1px solid var(--ds-border-default)", color: "var(--ds-text-secondary)" }}
              >
                <ArrowLeftRight size={14} className="lg:rotate-0 rotate-90" />
              </button>
            </div>

            {/* Destination */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="ss-type-label flex items-center gap-1.5">
                <Anchor size={12} style={{ color: "var(--ss-blue-600)" }} />
                TO
              </label>
              <div className="relative">
                <select
                  value={finderTo}
                  onChange={(e) => setFinderTo(e.target.value)}
                  className="h-11 w-full appearance-none rounded-md pl-3.5 pr-10 text-[13px] font-medium outline-none transition cursor-pointer"
                  style={{ background: "var(--ds-surface-sunken)", border: "1px solid var(--ds-border-default)", color: "var(--ds-text-primary)" }}
                >
                  <option value="">Select destination...</option>
                  {destinationOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--ds-text-muted)" }} />
              </div>
            </div>

            {/* Search Button */}
            <div className="lg:col-span-3">
              <button
                type="button"
                onClick={handleFindRate}
                disabled={!finderFrom || !finderTo}
                className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-md text-sm font-bold transition cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--ds-color-brand)", color: "var(--ds-text-inverse)" }}
              >
                <Search size={15} />
                Find Rate
              </button>
            </div>
          </div>

          {/* Container + Mode selectors */}
          <div className="mt-4 pt-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6" style={{ borderTop: "1px solid var(--ds-border-subtle)" }}>
            {/* Container */}
            <div className="flex items-center gap-2">
              <span className="ss-type-overline shrink-0">Container</span>
              <div className="inline-flex rounded-md p-0.5" style={{ background: "var(--ds-surface-sunken)", border: "1px solid var(--ds-border-default)" }}>
                {[
                  { id: "20gp", label: "20FT" },
                  { id: "40hc", label: "40FT" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setFinderContainer(c.id); if (hasSearched) setTimeout(handleFindRate, 50); }}
                    className={cn(
                      "px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer",
                      finderContainer === c.id
                        ? "bg-white shadow-sm"
                        : "hover:bg-white/50",
                    )}
                    style={{ color: finderContainer === c.id ? "var(--ds-text-primary)" : "var(--ds-text-secondary)" }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode */}
            <div className="flex items-center gap-2">
              <span className="ss-type-overline shrink-0">Mode</span>
              <div className="inline-flex gap-1">
                {[
                  { id: "sea", label: "Sea", icon: Ship },
                  { id: "air", label: "Air", icon: Plane },
                  { id: "land", label: "Land", icon: Truck },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = finderMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setFinderMode(m.id); if (hasSearched) setTimeout(handleFindRate, 50); }}
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer",
                      )}
                      style={{
                        background: active ? "var(--ds-surface-header)" : "transparent",
                        color: active ? "var(--ds-text-inverse)" : "var(--ds-text-secondary)",
                        border: active ? "none" : "1px solid var(--ds-border-default)",
                      }}
                    >
                      <Icon size={12} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            RESULT CARD
            ═══════════════════════════════════════════ */}
        {hasSearched && (
          <div className="px-4 sm:px-6 pb-5 sm:pb-6" style={{ borderTop: "1px solid var(--ds-border-subtle)" }}>
            <div className="pt-4 sm:pt-5">
              {matchedRate ? (
                <div className="ss-card-elevated p-4 sm:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                    {/* Left: Route info */}
                    <div className="lg:col-span-7 space-y-3">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge label="Active Rate" variant="positive" icon={CheckCircle2} />
                        {matchedRate.carrier && (
                          <Badge label={matchedRate.carrier} variant="neutral" icon={Tag} />
                        )}
                        <Badge
                          label={titleCase(matchedRate.mode)}
                          variant="info"
                          icon={MODE_ICON[matchedRate.mode] ?? Ship}
                        />
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin size={16} style={{ color: "var(--ss-teal-600)" }} className="shrink-0" />
                          <span className="text-sm sm:text-base font-bold truncate" style={{ color: "var(--ds-text-primary)" }}>
                            {matchedRate.location}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" style={{ color: "var(--ds-text-muted)" }}>
                          <span className="h-px w-4 sm:w-8" style={{ background: "var(--ds-border-strong)" }} />
                          <ArrowRight size={14} />
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Anchor size={16} style={{ color: "var(--ss-blue-600)" }} className="shrink-0" />
                          <span className="text-sm sm:text-base font-bold truncate" style={{ color: "var(--ds-text-primary)" }}>
                            {matchedRate.port}
                          </span>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-3 ss-type-caption">
                        <span className="ss-badge ss-badge-neutral text-[11px]">
                          {matchedRate.container === "20gp" ? "20FT" : "40FT HC"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} style={{ color: "var(--ds-text-muted)" }} />
                          {formatDate(matchedRate.updated_at)}
                        </span>
                      </div>
                    </div>

                    {/* Right: Pricing panel */}
                    <div className="lg:col-span-5 ss-card p-4 sm:p-5 space-y-3">
                      <div>
                        <span className="ss-type-overline block">Contract Rate</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="ss-type-price-hero text-[28px] sm:text-[36px]">
                            {formatRatePrice(matchedRate.price, matchedRate.currency)}
                          </span>
                          <span className="ss-type-caption">/ container</span>
                        </div>
                      </div>

                      {marketRange && (
                        <div className="pt-3 flex items-center justify-between gap-2" style={{ borderTop: "1px solid var(--ds-border-subtle)" }}>
                          <div className="min-w-0">
                            <span className="ss-type-overline flex items-center gap-1">
                              <TrendingUp size={11} style={{ color: "var(--ss-teal-600)" }} />
                              Market Range
                            </span>
                            <span className="ss-type-price-sm block mt-0.5 ss-tabular">
                              {marketRange.min} — {marketRange.max}
                            </span>
                          </div>
                          <Badge label="Est. Index" variant="neutral" />
                        </div>
                      )}

                      {editable && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => { setEditingRate(matchedRate); setModalOpen(true); }}
                            className="text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                            style={{ color: "var(--ds-color-brand)" }}
                          >
                            <Edit3 size={12} />
                            Modify rate
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* No match */
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center space-y-2 rounded-lg" style={{ background: "var(--ds-surface-sunken)", border: "1px dashed var(--ds-border-default)" }}>
                  <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: "var(--ds-status-warning-bg)", color: "var(--ds-status-warning-text)" }}>
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold" style={{ color: "var(--ds-text-primary)" }}>No rate found</h4>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-secondary)" }}>
                      No active rate for <b>{finderFrom}</b> → <b>{finderTo}</b> ({finderContainer === "20gp" ? "20FT" : "40FT"})
                    </p>
                  </div>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => { setEditingRate(null); setModalOpen(true); }}
                      className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold transition cursor-pointer"
                      style={{ background: "var(--ds-color-brand)", color: "var(--ds-text-inverse)" }}
                    >
                      <Plus size={13} />
                      Create Rate
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════
          SECTION DIVIDER
          ══════════════════════════════════════════════════ */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full" style={{ borderTop: "1px solid var(--ds-border-default)" }} />
        </div>
        <div className="relative flex justify-center">
          <Badge
            label={`Rate Directory · ${filteredRates.length} ${filteredRates.length === 1 ? "rate" : "rates"}`}
            variant="neutral"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 2: RATE DIRECTORY
          ══════════════════════════════════════════════════ */}
      <section className="space-y-3">
        {/* Search + Filters */}
        <div className="ss-card overflow-hidden">
          {/* Search */}
          <div className="p-3 sm:p-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--ds-text-muted)" }} />
              <input
                type="text"
                placeholder="Search origin, port, carrier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-md pl-9 pr-4 text-[13px] font-medium outline-none transition"
                style={{
                  background: "var(--ds-surface-sunken)",
                  border: "1px solid var(--ds-border-default)",
                  color: "var(--ds-text-primary)",
                }}
              />
            </div>
          </div>

          {/* Filter toggle (mobile) */}
          <div className="md:hidden px-3 pb-3" style={{ borderTop: "1px solid var(--ds-border-subtle)" }}>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full h-9 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
              style={{ color: "var(--ds-text-secondary)" }}
            >
              <Filter size={12} />
              {showFilters ? "Hide Filters" : "Filters"}
              {hasActiveFilters && (
                <span className="ml-1 h-4 min-w-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: "var(--ds-color-brand)", color: "var(--ds-text-inverse)" }}>!</span>
              )}
            </button>
          </div>

          {/* Filter pills */}
          <div
            className={cn(
              "px-3 sm:px-4 pb-3 sm:pb-4 pt-2",
              "md:block",
              showFilters ? "block" : "hidden",
            )}
            style={{ borderTop: "1px solid var(--ds-border-subtle)" }}
          >
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Mode */}
              <div className="flex items-center gap-1.5">
                <span className="ss-type-overline">Mode</span>
                <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="ss-filter-select">
                  <option value="all">All</option>
                  {orderModes.map((m) => <option key={m} value={m}>{titleCase(m)}</option>)}
                </select>
              </div>

              {/* Container */}
              <div className="flex items-center gap-1.5">
                <span className="ss-type-overline">Size</span>
                <select value={containerFilter} onChange={(e) => setContainerFilter(e.target.value)} className="ss-filter-select">
                  <option value="all">All</option>
                  {containerTypes.map((c) => <option key={c} value={c}>{c === "20gp" ? "20FT" : "40FT"}</option>)}
                </select>
              </div>

              {/* Carrier */}
              <div className="flex items-center gap-1.5">
                <span className="ss-type-overline">Carrier</span>
                <select value={carrierFilter} onChange={(e) => setCarrierFilter(e.target.value)} className="ss-filter-select">
                  <option value="all">All</option>
                  {distinctCarriers.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Currency */}
              <div className="flex items-center gap-1.5">
                <span className="ss-type-overline">Currency</span>
                <select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)} className="ss-filter-select">
                  <option value="all">All</option>
                  <option value="USD">USD</option>
                  <option value="QAR">QAR</option>
                </select>
              </div>

              {/* Reset */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-8 px-2.5 text-xs font-semibold rounded-md flex items-center gap-1 transition ml-auto cursor-pointer"
                  style={{ color: "var(--ds-status-negative-text)", border: "1px solid var(--ds-border-default)" }}
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            DATA — Mobile Cards + Desktop Table
            ═══════════════════════════════════════════ */}
        {filteredRates.length > 0 ? (
          <>
            {/* ── MOBILE: Rate Cards ── */}
            <div className="md:hidden space-y-2.5">
              {filteredRates.map((rate) => {
                const cardBadge: RateCardBadge = rate.id === bestPriceId ? "best-price" : "none";
                return (
                  <RateCard
                    key={rate.id}
                    carrier={rate.carrier}
                    container={rate.container}
                    price={formatRatePrice(rate.price, rate.currency)}
                    currency={rate.currency ?? "USD"}
                    mode={rate.mode}
                    origin={rate.location}
                    destination={rate.port}
                    updatedAt={rate.updated_at}
                    updatedBy={rate.updatedBy?.name}
                    badge={cardBadge}
                    editable={editable}
                    onEdit={() => { setEditingRate(rate); setModalOpen(true); }}
                    onDelete={() => handleDelete(rate.id)}
                    isDeleting={deletingId === rate.id}
                  />
                );
              })}
            </div>

            {/* ── DESKTOP: ShipShape Rate Table ── */}
            <div className="hidden md:block ss-table-surface">
              <table className="ss-rate-table">
                <thead>
                  <tr>
                    <th>Origin</th>
                    <th>Destination</th>
                    <th>Carrier</th>
                    <th>Mode</th>
                    <th>Container</th>
                    <th>Rate</th>
                    <th>Updated</th>
                    {editable && <th style={{ width: 80, textAlign: "right" }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRates.map((rate) => {
                    const isBest = rate.id === bestPriceId;
                    const ModeIcon = MODE_ICON[rate.mode] ?? Ship;
                    return (
                      <tr key={rate.id}>
                        {/* Origin */}
                        <td>
                          <span className="flex items-center gap-1.5">
                            <MapPin size={13} style={{ color: "var(--ss-teal-600)" }} className="shrink-0" />
                            <span className="font-semibold">{rate.location}</span>
                          </span>
                        </td>

                        {/* Destination */}
                        <td>
                          <span className="flex items-center gap-1.5">
                            <Anchor size={13} style={{ color: "var(--ss-blue-600)" }} className="shrink-0" />
                            <span className="font-medium">{rate.port}</span>
                          </span>
                        </td>

                        {/* Carrier */}
                        <td>
                          {rate.carrier ? (
                            <span className="ss-carrier-name text-[13px]">{rate.carrier}</span>
                          ) : (
                            <span className="ss-type-caption italic">—</span>
                          )}
                        </td>

                        {/* Mode */}
                        <td>
                          <Badge
                            label={titleCase(rate.mode)}
                            variant={rate.mode === "sea" ? "accent" : rate.mode === "air" ? "info" : "warning"}
                            icon={ModeIcon}
                          />
                        </td>

                        {/* Container */}
                        <td>
                          <Badge label={rate.container === "20gp" ? "20FT" : "40FT"} variant="neutral" />
                        </td>

                        {/* Price */}
                        <td>
                          <span className={cn("ss-type-price-md ss-tabular", isBest && "ss-price-best")}>
                            {formatRatePrice(rate.price, rate.currency)}
                          </span>
                          <span className="ss-type-caption ml-1.5">{rate.currency === "QAR" ? "QAR" : "USD"}</span>
                          {isBest && (
                            <span className="ml-2">
                              <Badge label="Best" variant="positive" icon={Trophy} />
                            </span>
                          )}
                        </td>

                        {/* Updated */}
                        <td>
                          <span className="ss-type-caption ss-tabular">{formatDate(rate.updated_at)}</span>
                          {rate.updatedBy?.name && (
                            <span className="block ss-type-overline" style={{ fontSize: "0.6rem" }}>
                              by {rate.updatedBy.name}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        {editable && (
                          <td style={{ textAlign: "right" }}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => { setEditingRate(rate); setModalOpen(true); }}
                                className="p-1.5 rounded-md transition cursor-pointer"
                                style={{ color: "var(--ds-text-muted)" }}
                                title="Edit"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(rate.id)}
                                disabled={deletingId === rate.id}
                                className="p-1.5 rounded-md transition cursor-pointer disabled:opacity-50"
                                style={{ color: "var(--ds-text-muted)" }}
                                title="Delete"
                              >
                                {deletingId === rate.id ? (
                                  <Loader2 size={14} className="animate-spin" style={{ color: "var(--ds-status-negative-text)" }} />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-2.5 rounded-lg" style={{ background: "var(--ds-surface-card)", border: "1px dashed var(--ds-border-default)" }}>
            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "var(--ds-surface-sunken)", color: "var(--ds-text-muted)" }}>
              <Search size={16} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--ds-text-primary)" }}>
                {rates.length === 0 ? "No freight rates yet" : "No rates match your filters"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-secondary)" }}>
                {rates.length === 0
                  ? "Add your first rate to start quoting clients."
                  : "Try different search terms or clear filters."}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold transition cursor-pointer"
                style={{ background: "var(--ds-color-brand)", color: "var(--ds-text-inverse)" }}
              >
                <RotateCcw size={12} />
                Clear Filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════
          MODAL
          ══════════════════════════════════════════════════ */}
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
            if (matchedRate && matchedRate.id === saved.id) setMatchedRate(saved);
            triggerToast(editingRate ? "Rate updated" : "Rate added");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
