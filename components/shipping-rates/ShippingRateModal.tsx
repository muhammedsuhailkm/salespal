"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { titleCase } from "@/lib/utils";
import { orderModes } from "@/types/order";
import { containerTypes, type ShippingRateListItem } from "@/types/shipping-rate";

interface ShippingRateModalProps {
  rate?: ShippingRateListItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: (rate: ShippingRateListItem) => void;
}

const emptyForm = { location: "", port: "", mode: orderModes[0] as string, container: containerTypes[0] as string, price: "" };

export function ShippingRateModal({ rate, open, onClose, onSaved }: ShippingRateModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isEdit = !!rate;

  useEffect(() => {
    if (!open) return;
    setForm(
      rate
        ? { location: rate.location, port: rate.port, mode: rate.mode, container: rate.container, price: String(rate.price) }
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
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
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
          onClick={onClose}
          className="absolute -top-1.5 -right-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">{isEdit ? "Edit Shipping Rate" : "Add Shipping Rate"}</h3>
          <p className="text-xs text-slate-500">Rates are shown to salesmen for quoting clients.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg font-medium">{errorMsg}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Location"
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Doha, Qatar"
            />
            <Input
              label="Port"
              required
              value={form.port}
              onChange={(e) => setForm({ ...form, port: e.target.value })}
              placeholder="e.g. Hamad Port"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="rate-mode">
                Mode
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
                Container
              </label>
              <Select id="rate-container" value={form.container} onChange={(e) => setForm({ ...form, container: e.target.value })}>
                {containerTypes.map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <Input
            label="Price"
            type="number"
            required
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="0.00"
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer rounded-lg active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer rounded-lg shadow disabled:opacity-50 active:scale-95"
            >
              {isSaving && <Loader2 size={12} className="animate-spin" />}
              <span>{isEdit ? "Save Changes" : "Add Rate"}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
