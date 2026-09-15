"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Ship, Tag } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { titleCase } from "@/lib/utils";
import { orderModes } from "@/types/order";
import { commonCarriers, containerTypes, type ShippingRateListItem } from "@/types/shipping-rate";

interface ShippingRateModalProps {
  rate?: ShippingRateListItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: (rate: ShippingRateListItem) => void;
}

const emptyForm = {
  location: "",
  port: "",
  carrier: "",
  currency: "USD",
  mode: orderModes[0] as string,
  container: containerTypes[0] as string,
  price: "",
};

export function ShippingRateModal({ rate, open, onClose, onSaved }: ShippingRateModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isEdit = !!rate;

  useEffect(() => {
    if (!open) return;
    setForm(
      rate
        ? {
            location: rate.location,
            port: rate.port,
            carrier: rate.carrier ?? "",
            currency: (rate.currency as string) || "USD",
            mode: rate.mode,
            container: rate.container,
            price: String(rate.price),
          }
        : emptyForm,
    );
    setErrorMsg(null);
  }, [open, rate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);

    try {
      const url = isEdit ? `/api/shipping-rates/${rate!.id}` : "/api/shipping-rates";
      const payload = {
        ...form,
        carrier: form.carrier.trim() || null,
        currency: form.currency === "QAR" ? "QAR" : "USD",
        price: Number(form.price),
      };

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save rate");

      onSaved(data.rate);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal open={open}>
      <div className="relative" style={{ fontFamily: "var(--ds-font-sans)" }}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 p-1.5 rounded-md transition cursor-pointer"
          style={{ color: "var(--ds-text-muted)" }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: "var(--ds-surface-header)", color: "var(--ds-text-inverse)" }}
          >
            <Ship size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--ds-text-primary)", letterSpacing: "-0.02em" }}>
              {isEdit ? "Edit Freight Rate" : "Add New Freight Rate"}
            </h3>
            <p className="text-xs" style={{ color: "var(--ds-text-secondary)" }}>
              Configure logistics lane pricing and carrier details.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error */}
          {errorMsg && (
            <div
              className="text-xs p-3 rounded-lg font-medium"
              style={{
                background: "var(--ds-status-negative-bg)",
                border: "1px solid var(--ds-status-negative-border)",
                color: "var(--ds-status-negative-text)",
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Location & Port */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Input
                label="Origin / Location"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. JNPT (Nhava Sheva) or China"
              />
            </div>
            <div>
              <Input
                label="Destination / Port"
                required
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
                placeholder="e.g. Hamad Port or Shanghai"
              />
            </div>
          </div>

          {/* Carrier */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold" style={{ color: "var(--ds-text-primary)" }} htmlFor="rate-carrier">
              Shipping Line / Carrier <span style={{ color: "var(--ds-text-muted)" }} className="font-normal">(Optional)</span>
            </label>
            <input
              id="rate-carrier"
              type="text"
              placeholder="e.g. MSC, Maersk, CMA CGM..."
              value={form.carrier}
              onChange={(e) => setForm({ ...form, carrier: e.target.value })}
              className="h-10 w-full rounded-md px-3 text-sm outline-none transition"
              style={{
                border: "1px solid var(--ds-border-default)",
                background: "var(--ds-surface-card)",
                color: "var(--ds-text-primary)",
              }}
            />
            {/* Quick carrier chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="ss-type-overline mr-1">Popular:</span>
              {commonCarriers.slice(0, 6).map((carrierName) => (
                <button
                  key={carrierName}
                  type="button"
                  onClick={() => setForm({ ...form, carrier: carrierName })}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded-md transition cursor-pointer"
                  style={{
                    background: form.carrier.toLowerCase() === carrierName.toLowerCase()
                      ? "var(--ds-surface-header)"
                      : "var(--ds-surface-sunken)",
                    color: form.carrier.toLowerCase() === carrierName.toLowerCase()
                      ? "var(--ds-text-inverse)"
                      : "var(--ds-text-secondary)",
                    border: `1px solid ${form.carrier.toLowerCase() === carrierName.toLowerCase() ? "var(--ds-surface-header)" : "var(--ds-border-default)"}`,
                  }}
                >
                  {carrierName}
                </button>
              ))}
            </div>
          </div>

          {/* Mode & Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: "var(--ds-text-primary)" }} htmlFor="rate-mode">
                Transport Mode
              </label>
              <Select id="rate-mode" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                {orderModes.map((mode) => (
                  <option key={mode} value={mode}>{titleCase(mode)}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: "var(--ds-text-primary)" }} htmlFor="rate-container">
                Container Specification
              </label>
              <Select id="rate-container" value={form.container} onChange={(e) => setForm({ ...form, container: e.target.value })}>
                {containerTypes.map((c) => (
                  <option key={c} value={c}>{c === "20gp" ? "20FT (20GP)" : "40FT (40HC)"}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Price & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                label={`Freight Rate Price (${form.currency === "QAR" ? "QAR" : "USD $"})`}
                type="number"
                required
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: "var(--ds-text-primary)" }}>Currency</label>
              <div
                className="grid grid-cols-2 gap-1 h-10 p-1 rounded-md"
                style={{ background: "var(--ds-surface-sunken)", border: "1px solid var(--ds-border-default)" }}
              >
                <button
                  type="button"
                  onClick={() => setForm({ ...form, currency: "USD" })}
                  className="flex items-center justify-center text-xs font-bold rounded transition cursor-pointer"
                  style={{
                    background: form.currency === "USD" ? "var(--ds-surface-card)" : "transparent",
                    color: form.currency === "USD" ? "var(--ds-text-primary)" : "var(--ds-text-secondary)",
                    boxShadow: form.currency === "USD" ? "var(--ds-shadow-xs)" : "none",
                  }}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, currency: "QAR" })}
                  className="flex items-center justify-center text-xs font-bold rounded transition cursor-pointer"
                  style={{
                    background: form.currency === "QAR" ? "var(--ds-surface-card)" : "transparent",
                    color: form.currency === "QAR" ? "var(--ds-text-primary)" : "var(--ds-text-secondary)",
                    boxShadow: form.currency === "QAR" ? "var(--ds-shadow-xs)" : "none",
                  }}
                >
                  QAR
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 mt-6" style={{ borderTop: "1px solid var(--ds-border-subtle)" }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-md transition cursor-pointer active:scale-95"
              style={{
                background: "var(--ds-surface-card)",
                color: "var(--ds-text-secondary)",
                border: "1px solid var(--ds-border-default)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-md transition cursor-pointer shadow-sm disabled:opacity-50 active:scale-95"
              style={{
                background: "var(--ds-color-brand)",
                color: "var(--ds-text-inverse)",
              }}
            >
              {isSaving && <Loader2 size={13} className="animate-spin" />}
              <span>{isEdit ? "Update Rate" : "Publish Rate"}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
