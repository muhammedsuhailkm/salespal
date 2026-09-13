"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { titleCase } from "@/lib/utils";
import { orderModes, orderPaymentModes, type OrderListItem } from "@/types/order";

interface EditOrderModalProps {
  order: OrderListItem;
  open: boolean;
  onClose: () => void;
  onSaved: (updatedOrder: OrderListItem) => void;
}

export function EditOrderModal({ order, open, onClose, onSaved }: EditOrderModalProps) {
  const [form, setForm] = useState({
    mode: order.mode,
    payment_mode: order.payment_mode,
    from: order.from,
    to: order.to,
    description: order.description,
    amount: String(order.amount),
    advance_amount: String(order.advance_amount),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      mode: order.mode,
      payment_mode: order.payment_mode,
      from: order.from,
      to: order.to,
      description: order.description,
      amount: String(order.amount),
      advance_amount: String(order.advance_amount),
    });
    setErrorMsg(null);
  }, [open, order]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (Number(form.advance_amount) > Number(form.amount)) {
      setErrorMsg("Advance amount cannot exceed the order amount.");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount), advance_amount: Number(form.advance_amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order");

      onSaved(data.order);
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
          <h3 className="text-base font-bold text-slate-900">Edit Order</h3>
          <p className="text-xs text-slate-500">Only draft orders can be edited.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg font-medium">{errorMsg}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="edit-order-mode">
                Mode
              </label>
              <Select id="edit-order-mode" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                {orderModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {titleCase(mode)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="edit-order-payment">
                Payment Mode
              </label>
              <Select
                id="edit-order-payment"
                value={form.payment_mode}
                onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
              >
                {orderPaymentModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {titleCase(mode)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="From" required value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
            <Input label="To" required value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              required
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              label="Advance Amount"
              type="number"
              min="0"
              step="0.01"
              value={form.advance_amount}
              onChange={(e) => setForm({ ...form, advance_amount: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700" htmlFor="edit-order-description">
              Description
            </label>
            <textarea
              id="edit-order-description"
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full text-xs rounded-md border border-slate-300 p-2.5 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-100 min-h-[80px]"
            />
          </div>

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
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
