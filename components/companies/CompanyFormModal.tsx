"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { createCompanyAction, updateCompanyAction } from "@/lib/actions/company-actions";

export type CompanyFormValues = {
  id?: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
};

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10";
const labelClass = "text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1";

/** Create a company (no `company`) or edit an existing one. */
export function CompanyFormModal({
  open,
  company,
  onClose,
  onCreated,
}: {
  open: boolean;
  company?: CompanyFormValues | null;
  onClose: () => void;
  /** Called after a new company is created, e.g. to open its document upload. */
  onCreated?: (orgId: number, name: string) => void;
}) {
  return (
    <Modal open={open}>
      {/* Mounted per open so the fields start from the company being edited. */}
      {open && <CompanyForm key={company?.id ?? "new"} company={company} onClose={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

function CompanyForm({
  company,
  onClose,
  onCreated,
}: {
  company?: CompanyFormValues | null;
  onClose: () => void;
  onCreated?: (orgId: number, name: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(company?.name ?? "");
  const [address, setAddress] = useState(company?.address ?? "");
  const [phone, setPhone] = useState(company?.phone ?? "");
  const [email, setEmail] = useState(company?.email ?? "");
  const [error, setError] = useState("");
  const isEdit = Boolean(company?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }
    setError("");

    startTransition(async () => {
      const values = { name, address, phone, email };
      const res = isEdit ? await updateCompanyAction(company!.id!, values) : await createCompanyAction(values);
      if (!res.success) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
      onClose();
      const orgId = "orgId" in res ? Number(res.orgId) : 0;
      if (!isEdit && orgId) onCreated?.(orgId, name.trim());
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-labelledby="company-form-title">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 id="company-form-title" className="text-base font-bold text-blue-900">
            {isEdit ? `Edit ${company!.name}` : "New Company"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="company-name" className={labelClass}>
              Company Name
            </label>
            <input
              id="company-name"
              type="text"
              required
              autoFocus
              placeholder="e.g. Gulf Freight LLC"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="company-address" className={labelClass}>
              Address (Optional)
            </label>
            <textarea
              id="company-address"
              rows={2}
              placeholder="Building, street, city"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="company-phone" className={labelClass}>
                Phone (Optional)
              </label>
              <input
                id="company-phone"
                type="tel"
                placeholder="e.g. +968 2400 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="company-email" className={labelClass}>
                Email (Optional)
              </label>
              <input
                id="company-email"
                type="email"
                placeholder="e.g. accounts@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {!isEdit && (
            <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 font-medium">
              You can attach documents like the CR copy and export license right after creating the company.
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer bg-blue-950 hover:bg-blue-900 text-white disabled:opacity-60"
          >
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Company"}
          </button>
        </div>
    </form>
  );
}
