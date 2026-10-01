import { Building } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

/** Chips naming the companies whose data the accountant is looking at. */
export function AccountantCompanyChips({ companies }: { companies: { id: number; name: string }[] }) {
  if (companies.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {companies.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
        >
          <Building size={12} className="text-slate-400" aria-hidden />
          {c.name}
        </span>
      ))}
    </div>
  );
}

export function NoAssignedCompanies() {
  return (
    <EmptyState
      icon={Building}
      title="No companies assigned yet"
      message="Ask the owner to assign you to a company. Enquiries, orders and payments appear here once you are assigned."
    />
  );
}
