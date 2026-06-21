import { Badge } from "@/components/ui/Badge";
import { formatDate, formatPhoneNumber } from "@/lib/utils";

type Client = {
  id: number;
  name: string;
  contact_person_name: string;
  contact_no: string;
  status: string;
  created_at: Date | string;
  organization?: { name: string | null };
  assignedSalesman?: { name: string | null };
};

export function ClientTable({ clients }: { clients: Client[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Salesman</th>
            <th className="px-4 py-3">Date Added</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {clients.map((client) => (
            <tr key={client.id}>
              <td className="px-4 py-3 font-medium text-slate-900">{client.name}</td>
              <td className="px-4 py-3 font-semibold text-slate-900">{formatPhoneNumber(client.contact_no)}</td>
              <td className="px-4 py-3">{client.organization?.name ?? "-"}</td>
              <td className="px-4 py-3">{client.assignedSalesman?.name ?? "-"}</td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(client.created_at)}</td>
              <td className="px-4 py-3">
                <Badge value={client.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
