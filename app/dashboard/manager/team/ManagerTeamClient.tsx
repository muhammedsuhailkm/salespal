"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { Building2, Plus, Trash2, X, Loader2, UserPlus, Users } from "lucide-react";
import { createSalesmanAction, removeSalesmanAction, setSalesmanCompaniesAction } from "@/lib/actions/manager-actions";
import { CompanyCheckboxes } from "@/components/salesmen/CompanyCheckboxes";
import { SalesmenTargetsClient } from "@/components/salesmen/SalesmenTargetsClient";
import { PerformanceReportButton } from "@/components/reports/PerformanceReportButton";
import type { SalesmanTargetRow } from "@/types/salesman-target";

import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
interface ManagerTeamClientProps {
  /** KPI score per salesman id, computed on the server from client status counts. */
  kpiScores: Record<number, number>;
  teamSize: number;
  targets: SalesmanTargetRow[];
  /** Companies this manager runs. */
  companies: { id: number; name: string }[];
  /** Salesman id → the manager's companies they work for. */
  salesmanCompanies: Record<number, number[]>;
}

export function ManagerTeamClient({ kpiScores, teamSize, targets, companies, salesmanCompanies }: ManagerTeamClientProps) {
  const multiCompany = companies.length > 1;
  const companyNames = (ids: number[] = []) => companies.filter((c) => ids.includes(c.id)).map((c) => c.name).join(", ");
  // New salesmen start with every company ticked; the manager unticks the ones they shouldn't have.
  const [newCompanies, setNewCompanies] = useState<number[]>(() => companies.map((c) => c.id));
  // Editing one salesman's companies
  const [editing, setEditing] = useState<{ id: number; name: string; orgIds: number[] } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
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
      if (multiCompany && newCompanies.length === 0) throw new Error("Pick at least one company for the salesman");
      const res = await createSalesmanAction({ name, email, phone, orgIds: multiCompany ? newCompanies : undefined });
      if (!res.success) {
        throw new Error(res.error || "Failed to create salesman");
      }

      triggerToast("Salesman added to your team successfully!");
      setName("");
      setEmail("");
      setPhone("");
      setNewCompanies(companies.map((c) => c.id));
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

  function saveCompanies() {
    if (!editing) return;
    if (editing.orgIds.length === 0) {
      setEditError("Pick at least one company. To take them off your team, use Remove instead.");
      return;
    }
    setEditError(null);
    startTransition(async () => {
      const res = await setSalesmanCompaniesAction(editing.id, editing.orgIds);
      if (!res.success) {
        setEditError(res.error || "Failed to update companies");
        return;
      }
      triggerToast(`${editing.name} now works for ${companyNames(editing.orgIds)}`);
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Header Panel */}
      <div className="flex items-center justify-between bg-card p-5 rounded-card border border-border/80 shadow-card flex-wrap gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Users className="text-muted-foreground" size={18} />
            <span>My Sales Team ({teamSize})</span>
          </h2>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            Manage your salesmen, set their targets and track progress.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsAddOpen(true);
          }}
          className={buttonVariants({ size: "sm" })}
        >
          <UserPlus size={14} />
          <span>Add Salesman</span>
        </button>
      </div>

      {/* Salesmen: performance + targets */}
      <SalesmenTargetsClient
        salesmen={targets}
        canAssign
        kpiScores={kpiScores}
        salesmanHref={(id) => `/dashboard/manager/team/${id}`}
        renderActions={(row) => (
          <>
            <PerformanceReportButton salesmanId={row.id} salesmanName={row.name} compact />
            {multiCompany && (
              <button
                onClick={() => {
                  setEditError(null);
                  setEditing({ id: row.id, name: row.name, orgIds: salesmanCompanies[row.id] ?? [] });
                }}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50 cursor-pointer"
                title={`Companies: ${companyNames(salesmanCompanies[row.id]) || "none"}`}
                aria-label={`Companies for ${row.name}: ${companyNames(salesmanCompanies[row.id]) || "none"}`}
              >
                <Building2 size={14} />
                <span className="tabular-nums">{(salesmanCompanies[row.id] ?? []).length}/{companies.length}</span>
              </button>
            )}
            <button
              onClick={() => handleRemove(row.id, row.name)}
              disabled={isPending}
              className="p-1.5 text-muted-foreground/80 hover:text-danger-foreground hover:bg-danger-soft rounded-lg transition duration-150 cursor-pointer active:scale-95 inline-flex disabled:opacity-50"
              title="Remove Salesman"
              aria-label={`Remove ${row.name}`}
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      />

      {/* Add Salesman Modal */}
      <Modal onClose={() => setIsAddOpen(false)} open={isAddOpen}>
        <div className="relative">
          <button aria-label="Close"
            onClick={() => setIsAddOpen(false)}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "absolute -top-1.5 -right-1.5")}
          >
            <X size={16} />
          </button>

          <div className="mb-4 border-b border-border pb-3">
            <h3 className="text-base font-semibold text-foreground">Create New Salesman</h3>
            <p className="text-xs text-muted-foreground">
              Add a salesman account to your team{multiCompany ? " for the companies you choose" : ""}.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-danger-soft border border-danger/30 rounded-lg text-xs text-danger-foreground font-medium">
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

            {multiCompany && <CompanyCheckboxes companies={companies} value={newCompanies} onChange={setNewCompanies} />}

            <div className="p-3 bg-subtle rounded-xl border border-border text-[11px] text-muted-foreground font-medium">
              Note: The default password for the new account will be{" "}
              <span className="font-semibold text-foreground">salespal123</span>.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold border border-border hover:bg-subtle text-foreground/70 rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={buttonVariants({ size: "sm" })}
              >
                {isSaving && <Loader2 size={12} className="animate-spin" />}
                <span>Create Salesman</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Companies a salesman works for */}
      <Modal onClose={() => setEditing(null)} open={!!editing}>
        {editing && (
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Companies · {editing.name}</h3>
                <p className="text-xs text-muted-foreground">Choose which of your companies {editing.name} works for.</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                <X size={16} />
              </button>
            </div>
            {editError && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-2.5 text-xs font-medium text-danger-foreground">{editError}</p>}
            <CompanyCheckboxes companies={companies} value={editing.orgIds} onChange={(orgIds) => setEditing({ ...editing, orgIds })} />
            <p className="text-[11px] text-muted-foreground">
              Removing a company doesn&apos;t move their existing clients there — reassign those from the Clients page if needed.
            </p>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button type="button" onClick={() => setEditing(null)} className="cursor-pointer rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground/70 transition hover:bg-subtle">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCompanies}
                disabled={isPending}
                className={buttonVariants({ size: "sm" })}
              >
                {isPending && <Loader2 size={12} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toastMsg || undefined} />
    </div>
  );
}
