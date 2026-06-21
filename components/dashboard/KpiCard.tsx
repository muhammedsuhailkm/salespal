import { Card } from "@/components/ui/Card";

export function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <Card><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>{hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}</Card>;
}
