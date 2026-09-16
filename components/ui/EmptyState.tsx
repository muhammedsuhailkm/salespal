import type { LucideIcon } from "lucide-react";

export function EmptyState({
  title,
  message,
  icon: Icon,
}: {
  title: string;
  message?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      {Icon && (
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <Icon size={18} className="text-slate-400" />
        </div>
      )}
      <h3 className="font-medium text-slate-950">{title}</h3>
      {message ? <p className="mt-1 text-sm text-slate-500">{message}</p> : null}
    </div>
  );
}
