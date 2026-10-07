"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
  Building,
  Users,
  Phone,
  Mail,
  X,
  TrendingUp,
  Award,
  Circle,
  Briefcase,
  Pencil,
  MapPin
} from "lucide-react";
import { CompanyFormModal, type CompanyFormValues } from "@/components/companies/CompanyFormModal";
import { CompanyAccountantsPanel } from "@/components/companies/CompanyAccountantsPanel";
import { CompanyDocumentsPanel } from "@/components/companies/CompanyDocumentsPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CompanyDocumentItem } from "@/types/company";
import {
  assignManagerToOrg,
  removeManagerFromOrg,
  assignSalesmanToManager,
  unassignSalesmanFromManager,
  createUserAction,
  deleteCompanyAction
} from "@/lib/actions/company-actions";

import { buttonVariants } from "@/components/ui/Button";
interface Org {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  /** Client counts by status, and the total, for this company. */
  clientStatusCounts: Record<string, number>;
  clientTotal: number;
  managers: Array<{
    manager_id: number;
    manager: {
      id: number;
      name: string;
      email: string;
      phone: string | null;
    };
  }>;
  accountants: Array<{
    accountant_id: number;
    accountant: {
      id: number;
      name: string;
      email: string;
      phone: string | null;
    };
  }>;
  documents: CompanyDocumentItem[];
}

interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role_id: number;
}

/** The salesman works under the manager for this company (one row per company). */
interface ManagerSalesmanRow {
  manager_id: number;
  salesman_id: number;
  org_id: number;
}

interface ClientCountRow {
  assigned_salesman_id: number | null;
  status: string;
  _count: {
    id: number;
  };
}

export function CompaniesClient({
  companies,
  managersList,
  accountantsList,
  salesmenList,
  managerSalesmen,
  clientCounts
}: {
  companies: Org[];
  managersList: User[];
  accountantsList: User[];
  salesmenList: User[];
  managerSalesmen: ManagerSalesmanRow[];
  clientCounts: ClientCountRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Optimistic UI state layers
  const [localCompanies, setLocalCompanies] = useState(companies);
  const [localManagerSalesmen, setLocalManagerSalesmen] = useState(managerSalesmen);
  const [localSalesmenList, setLocalSalesmenList] = useState(salesmenList);

  useEffect(() => {
    setLocalCompanies(companies);
  }, [companies]);

  useEffect(() => {
    setLocalManagerSalesmen(managerSalesmen);
  }, [managerSalesmen]);

  useEffect(() => {
    setLocalSalesmenList(salesmenList);
  }, [salesmenList]);
  // Modals state
  const [activeModal, setActiveModal] = useState<
    | { type: "assign-manager"; orgId: number; orgName: string }
    | { type: "assign-salesman"; managerId: number; managerName: string; orgId: number }
    | { type: "add-user"; roleId: number }
    | { type: "post-create-assign"; userId: number; name: string; roleId: number }
    | null
  >(null);

  // Company create / edit
  const [companyForm, setCompanyForm] = useState<{ open: boolean; company: CompanyFormValues | null }>({
    open: false,
    company: null
  });
  // After creating a company, open its document upload once it appears in the list.
  const [uploadPromptOrgId, setUploadPromptOrgId] = useState<number | null>(null);

  // Add User Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Post-Create Assignment Selection State
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");

  // Helper: Get salesman counts & KPI
  const getSalesmanKpi = (salesmanId: number) => {
    const counts = clientCounts.filter((c) => c.assigned_salesman_id === salesmanId);
    const onboarded = counts.find((c) => c.status === "onboarded")?._count.id ?? 0;
    const followUp = counts.find((c) => c.status === "follow_up")?._count.id ?? 0;
    const lead = counts.find((c) => c.status === "lead")?._count.id ?? 0;
    const lost = counts.find((c) => c.status === "lost")?._count.id ?? 0;

    const totalOnboarded = onboarded;
    const score = totalOnboarded * 5 + followUp * 2 + lead * 1 - lost * 1;
    return { onboarded: totalOnboarded, lost, score };
  };

  // Helper: Get manager's team KPI
  const getManagerKpi = (managerId: number, orgId: number) => {
    // Salesmen working under this manager for this company
    const assignedSalesmen = localSalesmenList.filter((s) =>
      localManagerSalesmen.some((ms) => ms.manager_id === managerId && ms.org_id === orgId && ms.salesman_id === s.id)
    );

    let totalOnboarded = 0;
    let totalFollowUp = 0;
    let totalLead = 0;
    let totalLost = 0;

    for (const s of assignedSalesmen) {
      const counts = clientCounts.filter((c) => c.assigned_salesman_id === s.id);
      const onboarded = counts.find((c) => c.status === "onboarded")?._count.id ?? 0;
        const followUp = counts.find((c) => c.status === "follow_up")?._count.id ?? 0;
      const lead = counts.find((c) => c.status === "lead")?._count.id ?? 0;
      const lost = counts.find((c) => c.status === "lost")?._count.id ?? 0;

      totalOnboarded += onboarded;
      totalFollowUp += followUp;
      totalLead += lead;
      totalLost += lost;
    }

    return totalOnboarded * 5 + totalFollowUp * 2 + totalLead * 1 - totalLost * 1;
  };

  // Helper: Avatar Initials
  const getInitials = (userName: string) => {
    return userName
      .split(" ")
      .map((n) => n.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Helper: KPI Pill classes
  const getKpiBadgeClasses = (score: number) => {
    if (score > 75) return "bg-success-soft text-success-foreground border-success/30";
    if (score >= 50) return "bg-warning-soft text-warning-foreground border-warning/30";
    return "bg-danger-soft text-danger-foreground border-danger/30";
  };

  // Mutations
  const handleRemoveManager = async (managerId: number, orgId: number) => {
    if (!confirm("Are you sure you want to remove this manager from this company?")) return;
    
    const backupCompanies = localCompanies;
    setLocalCompanies(prev => prev.map(c => {
      if (c.id === orgId) {
        return {
          ...c,
          managers: c.managers.filter(m => m.manager_id !== managerId)
        };
      }
      return c;
    }));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/manager-org?managerId=${managerId}&orgId=${orgId}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        router.refresh();
      } catch (e) {
        setLocalCompanies(backupCompanies);
        alert("Failed to remove manager.");
      }
    });
  };

  const handleUnassignSalesman = async (salesmanId: number, managerId: number, orgId: number, orgName: string) => {
    if (!confirm(`Take this salesman off the team for ${orgName}? Their other companies are not affected.`)) return;

    const backupRelations = localManagerSalesmen;
    setLocalManagerSalesmen(prev => prev.filter(ms => !(ms.manager_id === managerId && ms.salesman_id === salesmanId && ms.org_id === orgId)));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/manager-salesman?salesmanId=${salesmanId}&managerId=${managerId}&orgId=${orgId}`, {
          method: "DELETE"
        });
        if (!res.ok) throw new Error();
        router.refresh();
      } catch (e) {
        setLocalManagerSalesmen(backupRelations);
        alert("Failed to unassign salesman.");
      }
    });
  };

  const handleAssignManagerSubmit = async (managerId: number, orgId: number) => {
    const backupCompanies = localCompanies;
    const mgr = managersList.find(m => m.id === managerId);
    if (mgr) {
      setLocalCompanies(prev => prev.map(c => {
        if (c.id === orgId) {
          return {
            ...c,
            managers: [...c.managers, { manager_id: managerId, manager: mgr }]
          };
        }
        return c;
      }));
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/manager-org", {
          method: "POST",
          body: JSON.stringify({ managerId, orgId }),
          headers: { "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error();
        setActiveModal(null);
        router.refresh();
      } catch (e) {
        setLocalCompanies(backupCompanies);
        alert("Failed to assign manager.");
      }
    });
  };

  const handleAssignSalesmanSubmit = async (salesmanId: number, managerId: number, orgId: number) => {
    const backupRelations = localManagerSalesmen;
    setLocalManagerSalesmen(prev => [...prev, { manager_id: managerId, salesman_id: salesmanId, org_id: orgId }]);

    startTransition(async () => {
      try {
        const res = await fetch("/api/manager-salesman", {
          method: "POST",
          body: JSON.stringify({ managerId, salesmanId, orgId }),
          headers: { "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error();
        setActiveModal(null);
        router.refresh();
      } catch (e) {
        setLocalManagerSalesmen(backupRelations);
        alert("Failed to assign salesman.");
      }
    });
  };

  const handleDeleteCompany = (company: Org) => {
    if (company.clientTotal > 0) {
      alert(
        `${company.name} still has ${company.clientTotal} client${company.clientTotal === 1 ? "" : "s"}. Move or remove them before deleting the company.`
      );
      return;
    }
    if (!confirm(`Delete ${company.name}? Its manager/accountant assignments and documents will be removed. This cannot be undone.`)) return;

    startTransition(async () => {
      const res = await deleteCompanyAction(company.id);
      if (!res.success) {
        alert(res.error ?? "Failed to delete company.");
        return;
      }
      setLocalCompanies((prev) => prev.filter((c) => c.id !== company.id));
      router.refresh();
    });
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setErrorMsg("Name and email are required");
      return;
    }
    setErrorMsg("");

    startTransition(async () => {
      try {
        const res = await createUserAction({
          name,
          email,
          phone,
          roleId: activeModal?.type === "add-user" ? activeModal.roleId : 3
        });
        if (res.success && res.userId) {
          setName("");
          setEmail("");
          setPhone("");
          setSelectedAssignmentId("");
          // Forward to assignment step
          setActiveModal({
            type: "post-create-assign",
            userId: res.userId,
            name,
            roleId: activeModal?.type === "add-user" ? activeModal.roleId : 3
          });
        }
      } catch (err: any) {
        setErrorMsg(err.message ?? "An error occurred");
      }
    });
  };

  const handlePostCreateAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentId) {
      setActiveModal(null);
      router.refresh();
      return;
    }

    startTransition(async () => {
      if (activeModal?.type === "post-create-assign") {
        if (activeModal.roleId === 2) {
          const orgId = Number(selectedAssignmentId);
          const tempManager = { id: activeModal.userId, name: activeModal.name, email: "", phone: null, role_id: 2 };
          setLocalCompanies(prev => prev.map(c => {
            if (c.id === orgId) {
              return { ...c, managers: [...c.managers, { manager_id: activeModal.userId, manager: tempManager }] };
            }
            return c;
          }));

          await assignManagerToOrg(activeModal.userId, orgId);
        } else {
          // Value is "<managerId>:<orgId>" — the salesman joins that manager's team for that company.
          const [managerId, orgId] = selectedAssignmentId.split(":").map(Number);
          const tempSalesman = { id: activeModal.userId, name: activeModal.name, email: "", phone: null, role_id: 3 };
          setLocalSalesmenList(prev => [...prev, tempSalesman]);
          setLocalManagerSalesmen(prev => [...prev, { manager_id: managerId, salesman_id: activeModal.userId, org_id: orgId }]);

          await assignSalesmanToManager(activeModal.userId, managerId, orgId);
        }
      }
      setActiveModal(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-end mb-6">
        <button
          onClick={() => setCompanyForm({ open: true, company: null })}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <Building size={14} /> New Company
        </button>
        <button
          onClick={() => {
            setErrorMsg("");
            setActiveModal({ type: "add-user", roleId: 2 });
          }}
          className={buttonVariants({ size: "sm" })}
        >
          <Plus size={14} /> Add Manager
        </button>
        <button
          onClick={() => {
            setErrorMsg("");
            setActiveModal({ type: "add-user", roleId: 3 });
          }}
          className={buttonVariants({ size: "sm" })}
        >
          <Plus size={14} /> Add Salesman
        </button>
      </div>

      {/* Main Companies Stack */}
      <div className="flex flex-col gap-8 w-full">
        {localCompanies.length === 0 && (
          <EmptyState
            icon={Building}
            title="No companies yet"
            message="Create your first company to start assigning managers, salesmen and accountants."
          />
        )}
        {localCompanies.map((company) => {

          // Statistics
          const counts = company.clientStatusCounts;
          const onboardedCount = counts.onboarded ?? 0;
          const lostCount = counts.lost ?? 0;

          // Compute total staff (managers + salesmen under this company)
          const assignedManagersIds = company.managers.map((m) => m.manager_id);
          const assignedSalesmen = localSalesmenList.filter((s) =>
            localManagerSalesmen.some((ms) => assignedManagersIds.includes(ms.manager_id) && ms.salesman_id === s.id)
          );
          const totalStaff = assignedManagersIds.length + assignedSalesmen.length;

          // One neutral look for every company card; colour is kept for state, not identity.
          const labelText = "text-foreground";
          const labelAccentText = "text-muted-foreground";
          const managerCardBorder = "border border-border";
          const managerAvatarBg = "bg-primary-soft text-primary-soft-foreground";
          const teamKpiText = "text-2xl font-semibold tabular-nums text-foreground";
          const salesmanRowBorder = "border-border";
          const salesmanAvatarBg = "bg-muted text-foreground/80";
          const salesmanKpiPill = "bg-primary-soft text-primary-soft-foreground border-transparent";
          const dashedSalesmanBtn =
            "press w-full flex items-center justify-center gap-1.5 border border-dashed border-border-strong text-muted-foreground hover:border-primary/40 hover:bg-primary-soft hover:text-primary-soft-foreground rounded-control py-2.5 text-xs font-medium cursor-pointer";
          const dashedManagerBtn =
            "press w-full flex items-center justify-center gap-2 border border-dashed border-border-strong text-muted-foreground hover:border-primary/40 hover:bg-primary-soft hover:text-primary-soft-foreground rounded-control py-3 text-sm font-medium cursor-pointer";
          const unassignedActionBtn = cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-3 w-full");

          return (
            <div
              key={company.id}
              className="rounded-card border border-border bg-card shadow-card flex flex-col overflow-hidden"
            >
              {/* Company header: name, contact details, headline numbers */}
              <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shrink-0 border-b border-border">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-soft-foreground">
                    <Building className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xl font-semibold tracking-tight text-foreground">{company.name}</h2>
                      <button
                        onClick={() =>
                          setCompanyForm({
                            open: true,
                            company: {
                              id: company.id,
                              name: company.name,
                              address: company.address,
                              phone: company.phone,
                              email: company.email
                            }
                          })
                        }
                        aria-label={`Edit ${company.name}`}
                        title="Edit company"
                        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteCompany(company)}
                        disabled={isPending}
                        aria-label={`Delete ${company.name}`}
                        title="Delete company"
                        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "hover:bg-danger-soft hover:text-danger-foreground")}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {(company.address || company.phone || company.email) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {company.address && (
                          <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden /> {company.address}</span>
                        )}
                        {company.phone && (
                          <span className="inline-flex items-center gap-1"><Phone size={12} aria-hidden /> {company.phone}</span>
                        )}
                        {company.email && (
                          <span className="inline-flex items-center gap-1"><Mail size={12} aria-hidden /> {company.email}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick stats displayed as white stat boxes */}
                <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                  <div className="rounded-control border border-border bg-subtle px-4 py-2.5 min-w-[96px] flex-1">
                    <p className="text-xs text-muted-foreground">Onboarded</p>
                    <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{onboardedCount.toLocaleString()}</p>
                  </div>
                  <div className="rounded-control border border-border bg-subtle px-4 py-2.5 min-w-[96px] flex-1">
                    <p className="text-xs text-muted-foreground">Lost</p>
                    <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{lostCount.toLocaleString()}</p>
                  </div>
                  <div className="rounded-control border border-border bg-subtle px-4 py-2.5 min-w-[96px] flex-1">
                    <p className="text-xs text-muted-foreground">Staff</p>
                    <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{totalStaff.toLocaleString()}</p>
                  </div>
                </div>


              </div>

              {/* Body Area */}
              <div className="p-6 space-y-6">
                {/* 1. Assigned Managers Horizontal Row */}
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold ${labelText}`}>
                    Assigned Managers
                  </h3>

                  <div className="flex flex-row gap-6 overflow-x-auto pb-4 w-full scrollbar-thin">
                    {company.managers.map((m) => {
                      const manager = m.manager;
                      const managerTeamScore = getManagerKpi(manager.id, company.id);

                      // Salesmen working under this manager for this company
                      const managerSalesmenList = localSalesmenList.filter((s) =>
                        localManagerSalesmen.some((ms) => ms.manager_id === manager.id && ms.org_id === company.id && ms.salesman_id === s.id)
                      );

                      return (
                        <div
                          key={manager.id}
                          className={`bg-card rounded-2xl p-5 shadow-sm min-w-[320px] max-w-[340px] flex-shrink-0 flex flex-col justify-between ${managerCardBorder}`}
                        >
                          <div className="space-y-4">
                            {/* Manager Block Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex gap-3">
                                <div className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-full font-semibold text-sm border border-border/50 ${managerAvatarBg}`}>
                                  {getInitials(manager.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground leading-tight">
                                    {manager.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[170px]" title={manager.email}>
                                    {manager.email}
                                  </p>
                                  {manager.phone && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {manager.phone}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => handleRemoveManager(manager.id, company.id)}
                                disabled={isPending}
                                className="p-1 rounded-lg text-muted-foreground/80 hover:bg-danger-soft hover:text-danger-foreground transition cursor-pointer shrink-0"
                                title="Remove manager assignment"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            {/* Team KPI metrics */}
                            <div className="bg-subtle/50 border border-border rounded-xl p-3 flex items-center justify-between">
                              <span className="text-xs font-semibold text-muted-foreground/80">
                                Team KPI Score
                              </span>
                              <span className={teamKpiText}>
                                {managerTeamScore}
                              </span>
                            </div>

                            {/* Assigned Salesmen Vertical List */}
                            <div className="space-y-2">
                              <p className={`text-xs font-semibold ${labelAccentText}`}>
                                Assigned Salesmen ({managerSalesmenList.length})
                              </p>
                              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                                {managerSalesmenList.map((salesman) => {
                                  const { onboarded, lost, score } = getSalesmanKpi(salesman.id);
                                  return (
                                    <div
                                      key={salesman.id}
                                      className={`flex items-center justify-between bg-card border rounded-xl p-2.5 shadow-sm ${salesmanRowBorder}`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className={`h-7 w-7 shrink-0 flex items-center justify-center rounded-full text-xs font-semibold ${salesmanAvatarBg}`}>
                                          {getInitials(salesman.name)}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-foreground truncate leading-tight">
                                            {salesman.name}
                                          </p>
                                          <p className="text-[9px] text-muted-foreground/80 mt-0.5">
                                            Onboarded: {onboarded} · Lost: {lost}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${salesmanKpiPill}`}>
                                          KPI: {score}
                                        </span>
                                        <button
                                          onClick={() => handleUnassignSalesman(salesman.id, manager.id, company.id, company.name)}
                                          disabled={isPending}
                                          className="p-1 rounded text-muted-foreground/80 hover:text-danger-foreground hover:bg-danger-soft transition cursor-pointer"
                                          title={`Remove from ${company.name}`}
                                          aria-label={`Remove ${salesman.name} from ${company.name}`}
                                        >
                                          <UserMinus size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}

                                {managerSalesmenList.length === 0 && (
                                  <p className="text-[11px] text-muted-foreground/80 italic text-center py-2">
                                    No salesmen assigned.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Dashed assign salesman slot at manager bottom */}
                          <div className="mt-4 pt-3 border-t border-border">
                            <button
                              onClick={() =>
                                setActiveModal({
                                  type: "assign-salesman",
                                  managerId: manager.id,
                                  managerName: manager.name,
                                  orgId: company.id
                                })
                              }
                              className={dashedSalesmanBtn}
                            >
                              <UserPlus size={12} /> Assign salesman
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {company.managers.length === 0 && (
                      <div className="flex items-center justify-center w-full min-h-[140px] bg-card border border-dashed border-border rounded-card">
                        <p className="text-xs text-muted-foreground/80 italic">
                          No managers assigned to this company.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full-width dashed slot to assign another manager in company colour */}
                <button
                  onClick={() =>
                    setActiveModal({
                      type: "assign-manager",
                      orgId: company.id,
                      orgName: company.name
                    })
                  }
                  className={dashedManagerBtn}
                >
                  <Plus size={14} /> Assign another manager to this company
                </button>

                {/* 2. Unassigned Salesmen Horizontal Scroll Row */}
                <div className="border-t border-border/60 pt-6">
                  <h3 className={`text-xs font-semibold mb-3 ${labelText}`}>
                    Unassigned Salesmen
                  </h3>

                  <div className="flex flex-row gap-4 overflow-x-auto pb-3 w-full scrollbar-thin">
                    {localSalesmenList
                      .filter((s) => !localManagerSalesmen.some((ms) => ms.salesman_id === s.id))
                      .map((s) => (
                        <div
                          key={s.id}
                          className="bg-warning-soft border border-warning/30 text-warning-foreground rounded-xl p-3.5 min-w-[210px] flex-shrink-0 flex flex-col justify-between shadow-sm"
                        >
                          <div>
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full bg-warning-soft text-warning-foreground text-xs font-semibold">
                                {getInitials(s.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-warning-foreground truncate leading-tight">
                                  {s.name}
                                </p>
                                <p className="text-[10px] text-warning-foreground truncate mt-0.5 max-w-[140px]" title={s.email}>
                                  {s.email}
                                </p>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setActiveModal({
                                type: "assign-salesman",
                                managerId: -1,
                                managerName: s.name,
                                orgId: company.id
                              });
                            }}
                            className={unassignedActionBtn}
                          >
                            <Plus size={10} /> Assign to Manager
                          </button>
                        </div>
                      ))}

                    {salesmenList.filter((s) => !managerSalesmen.some((ms) => ms.salesman_id === s.id))
                      .length === 0 && (
                      <p className="text-xs text-muted-foreground/80 italic py-2">
                        All salesmen assigned to managers.
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Accountants + company documents */}
                <div className="border-t border-border/60 pt-6 grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <CompanyAccountantsPanel
                    orgId={company.id}
                    orgName={company.name}
                    assigned={company.accountants.map((a) => a.accountant)}
                    allAccountants={accountantsList}
                    labelClass={labelText}
                  />
                  <CompanyDocumentsPanel
                    orgId={company.id}
                    orgName={company.name}
                    documents={company.documents}
                    labelClass={labelText}
                    openUploadOnMount={uploadPromptOrgId === company.id}
                    onUploadPromptHandled={() => setUploadPromptOrgId(null)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CompanyFormModal
        open={companyForm.open}
        company={companyForm.company}
        onClose={() => setCompanyForm({ open: false, company: null })}
        onCreated={(orgId) => setUploadPromptOrgId(orgId)}
      />

      {/* --- Modals Handling with dynamic accent matching --- */}
      {(() => {
        // Compute modal-specific colors
        const modalOrg = activeModal && "orgId" in activeModal ? companies.find((c) => c.id === activeModal.orgId) : undefined;
        const isModalTeal = modalOrg
          ? modalOrg.name.toLowerCase().includes("company a") || modalOrg.name.toLowerCase().endsWith("a")
          : true;

        const modalTextAccent = isModalTeal ? "text-primary" : "text-info-foreground";
        const modalBorderAccent = isModalTeal ? "hover:border-primary/30 hover:bg-primary-soft/30" : "hover:border-info/30 hover:bg-info-soft/30";
        const modalAvatarBg = isModalTeal ? "bg-primary-soft text-primary" : "bg-info-soft text-info-foreground";
        const modalBtnAccent = isModalTeal ? "text-primary bg-primary-soft" : "text-info-foreground bg-info-soft";

        const isUserTeal = activeModal?.type === "add-user"
          ? activeModal.roleId === 2
          : activeModal?.type === "post-create-assign"
            ? activeModal.roleId === 2
            : true;

        const userModalTextAccent = "text-primary";
        const userModalBorderAccent = "focus:border-ring";
        const userModalBtnClass = "bg-primary hover:bg-primary-hover text-white";

        return (
          <>
            {/* 1. Assign Manager Modal */}
            <Modal onClose={() => setActiveModal(null)} open={activeModal?.type === "assign-manager"}>
              {activeModal?.type === "assign-manager" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className={`text-base font-semibold ${modalTextAccent}`}>
                      Assign Manager to {activeModal.orgName}
                    </h3>
                    <button aria-label="Close"
                      onClick={() => setActiveModal(null)}
                      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {managersList
                      .filter(
                        (mgr) =>
                          !companies
                            .find((c) => c.id === activeModal.orgId)
                            ?.managers.some((m) => m.manager_id === mgr.id)
                      )
                      .map((mgr) => (
                        <div
                          key={mgr.id}
                          onClick={() => handleAssignManagerSubmit(mgr.id, activeModal.orgId)}
                          className={`flex items-center gap-3 p-3 rounded-xl border border-border transition cursor-pointer ${modalBorderAccent}`}
                        >
                          <div className={`h-8 w-8 rounded-full font-semibold text-xs flex items-center justify-center ${modalAvatarBg}`}>
                            {getInitials(mgr.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{mgr.name}</p>
                            <p className="text-[10px] text-muted-foreground/80 truncate">{mgr.email}</p>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${modalBtnAccent}`}>
                            Assign
                          </span>
                        </div>
                      ))}

                    {managersList.filter(
                      (mgr) =>
                        !companies
                          .find((c) => c.id === activeModal.orgId)
                          ?.managers.some((m) => m.manager_id === mgr.id)
                    ).length === 0 && (
                      <p className="text-xs text-muted-foreground/80 italic text-center py-6">
                        All managers are already assigned to this company.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Modal>

            {/* 2. Assign Salesman Modal */}
            <Modal onClose={() => setActiveModal(null)} open={activeModal?.type === "assign-salesman"}>
              {activeModal?.type === "assign-salesman" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className={`text-base font-semibold ${modalTextAccent}`}>
                      {activeModal.managerId === -1
                        ? `Assign Salesman: ${activeModal.managerName}`
                        : `Assign Salesman to ${activeModal.managerName} · ${companies.find((c) => c.id === activeModal.orgId)?.name ?? ""}`}
                    </h3>
                    <button aria-label="Close"
                      onClick={() => setActiveModal(null)}
                      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {activeModal.managerId === -1 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        <p className="text-xs text-muted-foreground font-semibold mb-2">
                          Select a manager in this company to assign to:
                        </p>
                        {companies
                          .find((c) => c.id === activeModal.orgId)
                          ?.managers.map((m) => (
                            <div
                              key={m.manager_id}
                              onClick={() => {
                                const sUser = salesmenList.find((s) => s.name === activeModal.managerName);
                                if (sUser) {
                                  handleAssignSalesmanSubmit(sUser.id, m.manager_id, activeModal.orgId);
                                }
                              }}
                              className={`flex items-center gap-3 p-3 rounded-xl border border-border transition cursor-pointer ${modalBorderAccent}`}
                            >
                              <div className={`h-8 w-8 rounded-full font-semibold text-xs flex items-center justify-center bg-primary-soft text-primary`}>
                                {getInitials(m.manager.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{m.manager.name}</p>
                                <p className="text-[10px] text-muted-foreground/80 truncate">{m.manager.email}</p>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${modalBtnAccent}`}>
                                Select
                              </span>
                            </div>
                          ))}

                        {(!companies.find((c) => c.id === activeModal.orgId)?.managers ||
                          companies.find((c) => c.id === activeModal.orgId)!.managers.length === 0) && (
                          <p className="text-xs text-muted-foreground/80 italic text-center py-6">
                            No managers assigned to this company. Assign a manager first.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {salesmenList
                          .filter((s) => !localManagerSalesmen.some(
                            (ms) => ms.manager_id === activeModal.managerId && ms.org_id === activeModal.orgId && ms.salesman_id === s.id
                          ))
                          .map((s) => (
                            <div
                              key={s.id}
                              onClick={() => handleAssignSalesmanSubmit(s.id, activeModal.managerId, activeModal.orgId)}
                              className={`flex items-center gap-3 p-3 rounded-xl border border-border transition cursor-pointer ${modalBorderAccent}`}
                            >
                              <div className={`h-8 w-8 rounded-full font-semibold text-xs flex items-center justify-center ${modalAvatarBg}`}>
                                {getInitials(s.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                                <p className="text-[10px] text-muted-foreground/80 truncate">{s.email}</p>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${modalBtnAccent}`}>
                                Assign
                              </span>
                            </div>
                          ))}

                        {salesmenList.filter((s) => !localManagerSalesmen.some(
                          (ms) => ms.manager_id === activeModal.managerId && ms.org_id === activeModal.orgId && ms.salesman_id === s.id
                        )).length === 0 && (
                          <p className="text-xs text-muted-foreground/80 italic text-center py-6">
                            No available salesmen to assign.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Modal>

            {/* 3. Add User Modal */}
            <Modal onClose={() => setActiveModal(null)} open={activeModal?.type === "add-user"}>
              {activeModal?.type === "add-user" && (
                <form onSubmit={handleAddUserSubmit} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className={`text-base font-semibold ${userModalTextAccent}`}>
                      Create New {activeModal.roleId === 2 ? "Manager" : "Salesman"}
                    </h3>
                    <button aria-label="Close"
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 rounded-lg bg-danger-soft border border-danger/30 text-xs font-medium text-danger-foreground">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Jenkins"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`h-10 w-full rounded-xl border border-border px-3 text-xs outline-none transition ${userModalBorderAccent}`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. sarah@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`h-10 w-full rounded-xl border border-border px-3 text-xs outline-none transition ${userModalBorderAccent}`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Phone (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +1 555-0199"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`h-10 w-full rounded-xl border border-border px-3 text-xs outline-none transition ${userModalBorderAccent}`}
                      />
                    </div>

                    <div className="p-3 bg-subtle rounded-xl border border-border text-[11px] text-muted-foreground font-medium">
                      Note: Password defaults to <span className="font-semibold text-foreground">salespal123</span>.
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-foreground/70 hover:bg-subtle transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${userModalBtnClass}`}
                    >
                      {isPending ? "Creating..." : "Create & Next"}
                    </button>
                  </div>
                </form>
              )}
            </Modal>

            {/* 4. Post-Create Assignment Modal */}
            <Modal
              onClose={() => {
                setActiveModal(null);
                router.refresh();
              }}
              open={activeModal?.type === "post-create-assign"}
            >
              {activeModal?.type === "post-create-assign" && (
                <form onSubmit={handlePostCreateAssignSubmit} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className={`text-base font-semibold ${userModalTextAccent}`}>
                      Created: {activeModal.name}
                    </h3>
                    <button aria-label="Close"
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        router.refresh();
                      }}
                      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The user has been successfully created. Now assign them to a company or manager:
                    </p>

                    {activeModal.roleId === 2 ? (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">
                          Assign to Company
                        </label>
                        <select
                          value={selectedAssignmentId}
                          onChange={(e) => setSelectedAssignmentId(e.target.value)}
                          className={`h-10 w-full rounded-xl border border-border px-3 text-xs outline-none transition cursor-pointer ${userModalBorderAccent}`}
                        >
                          <option value="">-- Choose Company (Skip) --</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">
                          Assign to Manager (for a company)
                        </label>
                        <select
                          value={selectedAssignmentId}
                          onChange={(e) => setSelectedAssignmentId(e.target.value)}
                          className={`h-10 w-full rounded-xl border border-border px-3 text-xs outline-none transition cursor-pointer ${userModalBorderAccent}`}
                        >
                          <option value="">-- Choose Manager & Company (Skip) --</option>
                          {companies.map((c) => (
                            <optgroup key={c.id} label={c.name}>
                              {c.managers.map((m) => (
                                <option key={`${m.manager_id}:${c.id}`} value={`${m.manager_id}:${c.id}`}>
                                  {m.manager.name} — {c.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        router.refresh();
                      }}
                      className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-foreground/70 hover:bg-subtle transition cursor-pointer"
                    >
                      Skip Assignment
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${userModalBtnClass}`}
                    >
                      {isPending ? "Assigning..." : "Assign & Finish"}
                    </button>
                  </div>
                </form>
              )}
            </Modal>
          </>
        );
      })()}
    </>
  );
}
