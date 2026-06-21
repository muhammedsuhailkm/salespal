import { calculateKpiScore, groupStatusCounts } from "@/lib/kpi";
import { Badge } from "@/components/ui/Badge";

type SalesmanRow = { id: number; name: string; assignedClients: { status: string }[] };

export function SalesmanPerfTable({ salesmen }: { salesmen: SalesmanRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Salesman</th><th className="px-4 py-3">Clients</th><th className="px-4 py-3">Top status</th><th className="px-4 py-3">KPI</th></tr></thead>
        <tbody className="divide-y divide-slate-200">
          {salesmen.map((salesman) => {
            const counts = groupStatusCounts(salesman.assignedClients);
            const topStatus = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "new_lead";
            return <tr key={salesman.id}><td className="px-4 py-3 font-medium text-slate-900">{salesman.name}</td><td className="px-4 py-3">{salesman.assignedClients.length}</td><td className="px-4 py-3"><Badge value={topStatus} /></td><td className="px-4 py-3 font-semibold">{calculateKpiScore(counts)}</td></tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
