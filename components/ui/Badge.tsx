import { cn, titleCase } from "@/lib/utils";

const colors: Record<string, string> = {
  onboarded: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  follow_up: "bg-blue-50 text-blue-700 ring-blue-200",
  new_lead: "bg-amber-50 text-amber-800 ring-amber-200",
  lost: "bg-red-50 text-red-700 ring-red-200",
  target: "bg-violet-50 text-violet-700 ring-violet-200",
  pending: "bg-slate-100 text-slate-700 ring-slate-200",
  in_process: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  achieved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  unsuccessful: "bg-red-50 text-red-700 ring-red-200",
};

export function Badge({ value, className }: { value: string; className?: string }) {
  return <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1", colors[value] ?? colors.pending, className)}>{titleCase(value)}</span>;
}
