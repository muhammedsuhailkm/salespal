import { Badge } from "@/components/ui/Badge";

type Client = { id: number; name: string; contact_person_name: string; contact_no: string; status: string; organization?: { name: string | null }; assignedSalesman?: { name: string | null } };

export function ClientTable({ clients }: { clients: Client[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Salesman</th><th className="px-4 py-3">Status</th></tr></thead>
        <tbody className="divide-y divide-slate-200">
          {clients.map((client) => <tr key={client.id}><td className="px-4 py-3 font-medium text-slate-900">{client.name}</td><td className="px-4 py-3"><div>{client.contact_person_name}</div><div className="text-xs text-slate-500">{client.contact_no}</div></td><td className="px-4 py-3">{client.organization?.name ?? "-"}</td><td className="px-4 py-3">{client.assignedSalesman?.name ?? "-"}</td><td className="px-4 py-3"><Badge value={client.status} /></td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
