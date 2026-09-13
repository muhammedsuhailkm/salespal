"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { orderModes, orderPaymentModes } from "@/types/order";
import { titleCase } from "@/lib/utils";

export function OrderForm() {
  const router = useRouter();
  const { clients, loading: clientsLoading } = useClients();

  const [form, setForm] = useState({
    client_id: "",
    mode: orderModes[0] as string,
    payment_mode: orderPaymentModes[0] as string,
    description: "",
    from: "",
    to: "",
    amount: "",
    advance_amount: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (form.advance_amount && Number(form.advance_amount) > Number(form.amount)) {
      setErrorMsg("Advance amount cannot exceed the order amount.");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: Number(form.client_id),
          mode: form.mode,
          payment_mode: form.payment_mode,
          description: form.description,
          from: form.from,
          to: form.to,
          amount: Number(form.amount),
          advance_amount: Number(form.advance_amount || 0),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      router.push(`/dashboard/salesman/orders/${data.order.id}`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {errorMsg && (
        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700" htmlFor="order-client">
          Client
        </label>
        <Select
          id="order-client"
          required
          value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: e.target.value })}
          disabled={clientsLoading}
          className="w-full"
        >
          <option value="">{clientsLoading ? "Loading clients..." : "Select client..."}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700" htmlFor="order-mode">
            Mode
          </label>
          <Select id="order-mode" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="w-full">
            {orderModes.map((mode) => (
              <option key={mode} value={mode}>
                {titleCase(mode)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700" htmlFor="order-payment-mode">
            Payment Mode
          </label>
          <Select
            id="order-payment-mode"
            value={form.payment_mode}
            onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
            className="w-full"
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
        <Input
          label="From"
          required
          value={form.from}
          onChange={(e) => setForm({ ...form, from: e.target.value })}
          placeholder="Origin location"
        />
        <Input
          label="To"
          required
          value={form.to}
          onChange={(e) => setForm({ ...form, to: e.target.value })}
          placeholder="Destination location"
        />
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
          placeholder="0.00"
        />
        <Input
          label="Advance Amount"
          type="number"
          min="0"
          step="0.01"
          value={form.advance_amount}
          onChange={(e) => setForm({ ...form, advance_amount: e.target.value })}
          placeholder="0.00"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-700" htmlFor="order-description">
          Description
        </label>
        <textarea
          id="order-description"
          required
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Shipment details, cargo type, special instructions..."
          className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-100"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => router.push("/dashboard/salesman/orders")}
          disabled={isSaving}
          className="px-4 py-2 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>
        <Button type="submit" disabled={isSaving} className="h-auto gap-1.5 py-2">
          {isSaving && <Loader2 size={12} className="animate-spin" />}
          <span>Create Order</span>
        </Button>
      </div>
    </form>
  );
}
