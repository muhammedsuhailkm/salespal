"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { createAccountantAction } from "@/lib/actions/company-actions";

export function AddAccountantModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);

    try {
      const result = await createAccountantAction(form);
      if (!result.success) throw new Error(result.error || "Failed to create accountant");

      triggerToast("Accountant account created — default password: salespal123");
      setForm({ name: "", email: "", phone: "" });
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorMsg(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm"
      >
        <Plus size={14} />
        <span>Add Accountant</span>
      </button>

      <Modal open={open}>
        <div className="relative">
          <button
            onClick={() => setOpen(false)}
            className="absolute -top-1.5 -right-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>

          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Add Accountant</h3>
            <p className="text-xs text-slate-500">Creates a dedicated login with the default password (salespal123).</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
                {errorMsg}
              </div>
            )}

            <Input
              label="Full Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Fatima Accounts"
            />
            <Input
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="accountant@company.com"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Optional"
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSaving && <Loader2 size={12} className="animate-spin" />}
                <span>Create Accountant</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <Toast message={toastMsg || undefined} />
    </>
  );
}
