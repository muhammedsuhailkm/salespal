import { cn, titleCase } from "@/lib/utils";

const colors: Record<string, string> = {
  lead: "bg-amber-50 text-amber-800 ring-amber-200",
  contacted: "bg-sky-50 text-sky-700 ring-sky-200",
  follow_up: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  proposal_sent: "bg-violet-50 text-violet-700 ring-violet-200",
  negotiation: "bg-orange-50 text-orange-700 ring-orange-200",
  onboarding_in_progress: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  onboarded: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  active_client: "bg-green-50 text-green-700 ring-green-200",
  inactive: "bg-slate-100 text-slate-700 ring-slate-200",
  lost: "bg-rose-50 text-rose-700 ring-rose-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
  pending: "bg-slate-100 text-slate-700 ring-slate-200",
  in_process: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  achieved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  unsuccessful: "bg-red-50 text-red-700 ring-red-200",
};

export function Badge({ value, className }: { value: string; className?: string }) {
  return <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1", colors[value] ?? colors.pending, className)}>{titleCase(value)}</span>;
}
