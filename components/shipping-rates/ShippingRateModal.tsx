"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Ship, Building2, Anchor, DollarSign, Tag } from "lucide-react";
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
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-500/20">
            <Ship size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {isEdit ? "Edit Freight Rate" : "Add New Freight Rate"}
            </h3>
            <p className="text-xs text-slate-500">Configure logistics lane pricing and carrier details.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* Location & Port Grid */}
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

          {/* Carrier Input with Quick Suggestions */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700" htmlFor="rate-carrier">
              Shipping Line / Carrier <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              id="rate-carrier"
              type="text"
              placeholder="e.g. MSC, Maersk, CMA CGM..."
              value={form.carrier}
              onChange={(e) => setForm({ ...form, carrier: e.target.value })}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            {/* Quick Carrier Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Popular:</span>
              {commonCarriers.slice(0, 6).map((carrierName) => (
                <button
                  key={carrierName}
                  type="button"
                  onClick={() => setForm({ ...form, carrier: carrierName })}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition cursor-pointer ${
                    form.carrier.toLowerCase() === carrierName.toLowerCase()
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {carrierName}
                </button>
              ))}
            </div>
          </div>

          {/* Mode & Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="rate-mode">
                Transport Mode
              </label>
              <Select id="rate-mode" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                {orderModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {titleCase(mode)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="rate-container">
                Container Specification
              </label>
              <Select id="rate-container" value={form.container} onChange={(e) => setForm({ ...form, container: e.target.value })}>
                {containerTypes.map((c) => (
                  <option key={c} value={c}>
                    {c === "20gp" ? "20FT (20GP)" : "40FT (40HC)"}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Price & Currency Grid */}
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
              <label className="text-xs font-semibold text-slate-700">
                Currency
              </label>
              <div className="grid grid-cols-2 gap-1 h-10 p-1 bg-slate-100 rounded-md border border-slate-200">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, currency: "USD" })}
                  className={`flex items-center justify-center text-xs font-bold rounded transition cursor-pointer ${
                    form.currency === "USD"
                      ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, currency: "QAR" })}
                  className={`flex items-center justify-center text-xs font-bold rounded transition cursor-pointer ${
                    form.currency === "QAR"
                      ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  QAR
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer rounded-xl active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer rounded-xl shadow-sm disabled:opacity-50 active:scale-95"
            >
              {isSaving && <Loader2 size={13} className="animate-spin" />}
              <span>{isEdit ? "Update Freight Rate" : "Publish Rate"}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
