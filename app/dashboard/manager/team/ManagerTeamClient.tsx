"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { calculateKpiScore, groupStatusCounts } from "@/lib/kpi";
import { Plus, Trash2, X, Loader2, UserPlus, Users } from "lucide-react";
import { createSalesmanAction, removeSalesmanAction } from "@/lib/actions/manager-actions";

type SalesmanRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  assignedClients: { status: string }[];
};

interface ManagerTeamClientProps {
  initialSalesmen: SalesmanRow[];
}

export function ManagerTeamClient({ initialSalesmen }: ManagerTeamClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Loading/Toast/Error states
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);

    try {
      const res = await createSalesmanAction({ name, email, phone });
      if (!res.success) {
        throw new Error(res.error || "Failed to create salesman");
      }

      triggerToast("Salesman added to your team successfully!");
      setName("");
      setEmail("");
      setPhone("");
      setIsAddOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(salesmanId: number, salesmanName: string) {
    if (
      !confirm(
        `Are you sure you want to remove ${salesmanName} from your team? This will disassociate their account from your dashboard.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await removeSalesmanAction(salesmanId);
        if (!res.success) {
          throw new Error(res.error || "Failed to remove salesman");
        }
        triggerToast("Salesman removed from team successfully.");
        router.refresh();
      } catch (err: any) {
        alert(err.message || "An error occurred");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Header Panel */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-slate-500" size={18} />
            <span>My Sales Team ({initialSalesmen.length})</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage, assign, and monitor salesman performance metrics.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm active:scale-95"
        >
          <UserPlus size={14} />
          <span>Add Salesman</span>
        </button>
      </div>

      {/* Salesman Performance Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Salesman</th>
              <th className="px-5 py-3.5">Clients Count</th>
              <th className="px-5 py-3.5">Top Status</th>
              <th className="px-5 py-3.5">KPI Score</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {initialSalesmen.map((salesman) => {
              const counts = groupStatusCounts(salesman.assignedClients);
              const sortedStatuses = Object.entries(counts).sort((a, b) => b[1] - a[1]);
              const topStatus = sortedStatuses[0]?.[0] ?? "lead";
              const kpiScore = calculateKpiScore(counts);

              return (
                <tr
                  key={salesman.id}
                  className="hover:bg-slate-50/50 transition duration-150 group"
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/dashboard/manager/team/${salesman.id}`}
                      className="font-bold text-slate-900 hover:text-indigo-650 hover:underline transition"
                    >
                      {salesman.name}
                    </Link>
                    <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
                      {salesman.email} {salesman.phone ? `• ${salesman.phone}` : ""}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-700">
                    {salesman.assignedClients.length}
                  </td>
                  <td className="px-5 py-4">
                    <Badge value={topStatus} />
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-900">{kpiScore}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleRemove(salesman.id, salesman.name)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition duration-150 cursor-pointer active:scale-95 inline-flex"
                      title="Remove Salesman"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {initialSalesmen.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-xs text-slate-400 italic">
                  No salesmen in your team. Click "Add Salesman" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Salesman Modal */}
      <Modal open={isAddOpen}>
        <div className="relative">
          <button
            onClick={() => setIsAddOpen(false)}
            className="absolute -top-1.5 -right-1.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>

          <div className="mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Create New Salesman</h3>
            <p className="text-xs text-slate-500">
              Add a salesman account. It will automatically associate under your team.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="text-xs"
            />

            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@company.com"
              className="text-xs"
            />

            <Input
              label="Phone Number (Optional)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +97455556666"
              className="text-xs"
            />

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 font-medium">
              Note: The default password for the new account will be{" "}
              <span className="font-bold text-slate-800">salespal123</span>.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
              >
                {isSaving && <Loader2 size={12} className="animate-spin" />}
                <span>Create Salesman</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <Toast message={toastMsg || undefined} />
    </div>
  );
}
