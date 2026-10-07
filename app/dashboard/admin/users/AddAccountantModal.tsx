"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { createAccountantAction } from "@/lib/actions/company-actions";

import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
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
        className={buttonVariants({ size: "sm" })}
      >
        <Plus size={14} />
        <span>Add Accountant</span>
      </button>

      <Modal onClose={() => setOpen(false)} open={open}>
        <div className="relative">
          <button aria-label="Close"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "absolute -top-1.5 -right-1.5")}
          >
            <X size={16} />
          </button>

          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Add Accountant</h3>
            <p className="text-xs text-muted-foreground">Creates a dedicated login with the default password (salespal123).</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {errorMsg && (
              <div className="p-2.5 bg-danger-soft border border-danger/30 rounded-lg text-xs text-danger-foreground font-medium">
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

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold border border-border hover:bg-subtle text-foreground/70 rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={buttonVariants({ size: "sm" })}
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
