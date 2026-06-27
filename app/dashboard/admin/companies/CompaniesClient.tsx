"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
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
  Briefcase
} from "lucide-react";
import {
  assignManagerToOrg,
  removeManagerFromOrg,
  assignSalesmanToManager,
  unassignSalesmanFromManager,
  createUserAction
} from "@/lib/actions/company-actions";

interface Org {
  id: number;
  name: string;
  clients: Array<{
    id: number;
    status: string;
  }>;
  managers: Array<{
    manager_id: number;
    manager: {
      id: number;
      name: string;
      email: string;
      phone: string | null;
    };
  }>;
}

interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role_id: number;
}

interface ManagerSalesmanRow {
  manager_id: number;
  salesman_id: number;
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
  salesmenList,
  managerSalesmen,
  clientCounts
}: {
  companies: Org[];
  managersList: User[];
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
    const activeClient = counts.find((c) => c.status === "active_client")?._count.id ?? 0;
    const followUp = counts.find((c) => c.status === "follow_up")?._count.id ?? 0;
    const lead = counts.find((c) => c.status === "lead")?._count.id ?? 0;
    const lost = counts.find((c) => c.status === "lost")?._count.id ?? 0;

    const totalOnboarded = onboarded + activeClient;
    const score = totalOnboarded * 5 + followUp * 2 + lead * 1 - lost * 1;
    return { onboarded: totalOnboarded, lost, score };
  };

  // Helper: Get manager's team KPI
  const getManagerKpi = (managerId: number, orgId: number) => {
    // Salesmen assigned to this manager in this org/company
    const assignedSalesmen = localSalesmenList.filter((s) =>
      localManagerSalesmen.some((ms) => ms.manager_id === managerId && ms.salesman_id === s.id)
    );

    let totalOnboarded = 0;
    let totalFollowUp = 0;
    let totalLead = 0;
    let totalLost = 0;

    for (const s of assignedSalesmen) {
      const counts = clientCounts.filter((c) => c.assigned_salesman_id === s.id);
      const onboarded = counts.find((c) => c.status === "onboarded")?._count.id ?? 0;
      const activeClient = counts.find((c) => c.status === "active_client")?._count.id ?? 0;
      const followUp = counts.find((c) => c.status === "follow_up")?._count.id ?? 0;
      const lead = counts.find((c) => c.status === "lead")?._count.id ?? 0;
      const lost = counts.find((c) => c.status === "lost")?._count.id ?? 0;

      totalOnboarded += (onboarded + activeClient);
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
    if (score > 75) return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    if (score >= 50) return "bg-amber-50 text-amber-700 border-amber-200/60";
    return "bg-rose-50 text-rose-700 border-rose-200/60";
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

  const handleUnassignSalesman = async (salesmanId: number, managerId: number) => {
    if (!confirm("Are you sure you want to unassign this salesman?")) return;
    
    const backupRelations = localManagerSalesmen;
    setLocalManagerSalesmen(prev => prev.filter(ms => !(ms.manager_id === managerId && ms.salesman_id === salesmanId)));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/manager-salesman?salesmanId=${salesmanId}&managerId=${managerId}`, {
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

  const handleAssignSalesmanSubmit = async (salesmanId: number, managerId: number) => {
    const backupRelations = localManagerSalesmen;
    setLocalManagerSalesmen(prev => [...prev, { manager_id: managerId, salesman_id: salesmanId }]);

    startTransition(async () => {
      try {
        const res = await fetch("/api/manager-salesman", {
          method: "POST",
          body: JSON.stringify({ managerId, salesmanId }),
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
          const managerId = Number(selectedAssignmentId);
          const tempSalesman = { id: activeModal.userId, name: activeModal.name, email: "", phone: null, role_id: 3 };
          setLocalSalesmenList(prev => [...prev, tempSalesman]);
          setLocalManagerSalesmen(prev => [...prev, { manager_id: managerId, salesman_id: activeModal.userId }]);

          await assignSalesmanToManager(activeModal.userId, managerId);
        }
      }
      setActiveModal(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex gap-2 justify-end mb-6">
        <button
          onClick={() => {
            setErrorMsg("");
            setActiveModal({ type: "add-user", roleId: 2 });
          }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-950 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-900 transition cursor-pointer"
        >
          <Plus size={14} /> Add Manager
        </button>
        <button
          onClick={() => {
            setErrorMsg("");
            setActiveModal({ type: "add-user", roleId: 3 });
          }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-950 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-900 transition cursor-pointer"
        >
          <Plus size={14} /> Add Salesman
        </button>
      </div>

      {/* Main Companies Stack */}
      <div className="flex flex-col gap-8 w-full">
        {localCompanies.map((company) => {
          const isCompanyA = company.name.toLowerCase().includes("company a") || company.name.toLowerCase().endsWith("a");

          // Statistics
          const companyClients = company.clients;
          const onboardedCount = companyClients.filter((c) => c.status === "onboarded" || c.status === "active_client").length;
          const fontColor = "text-white"; // dummy
          const lostCount = companyClients.filter((c) => c.status === "lost").length;

          // Compute total staff (managers + salesmen under this company)
          const assignedManagersIds = company.managers.map((m) => m.manager_id);
          const assignedSalesmen = localSalesmenList.filter((s) =>
            localManagerSalesmen.some((ms) => assignedManagersIds.includes(ms.manager_id) && ms.salesman_id === s.id)
          );
          const totalStaff = assignedManagersIds.length + assignedSalesmen.length;

          // Redesign variables mapping: Company A gets Teal, Company B gets Violet
          const headerBg = isCompanyA ? "bg-teal-600" : "bg-violet-600";
          const bodyBg = isCompanyA ? "bg-teal-50 border-teal-100" : "bg-violet-50 border-violet-100";
          const labelText = isCompanyA ? "text-teal-700" : "text-violet-700";
          const labelAccentText = isCompanyA ? "text-teal-600" : "text-violet-600";
          const managerCardBorder = isCompanyA ? "border-l-teal-600 border-teal-100" : "border-l-violet-600 border-violet-100";
          const managerAvatarBg = isCompanyA ? "bg-teal-100 text-teal-700" : "bg-violet-100 text-violet-700";
          const teamKpiText = isCompanyA ? "text-3xl font-extrabold text-teal-600" : "text-3xl font-extrabold text-violet-600";
          const salesmanRowBorder = isCompanyA ? "border-teal-100" : "border-violet-100";
          const salesmanAvatarBg = isCompanyA ? "bg-teal-50 text-teal-700" : "bg-violet-50 text-violet-700";
          const salesmanKpiPill = isCompanyA ? "bg-teal-100 text-teal-800 border-teal-200" : "bg-violet-100 text-violet-800 border-violet-200";
          const dashedSalesmanBtn = isCompanyA
            ? "w-full flex items-center justify-center gap-1.5 border border-dashed border-teal-300 text-teal-700 bg-teal-50/20 hover:bg-teal-50 rounded-lg py-2.5 text-xs font-bold transition cursor-pointer"
            : "w-full flex items-center justify-center gap-1.5 border border-dashed border-violet-300 text-violet-700 bg-violet-50/20 hover:bg-violet-50 rounded-lg py-2.5 text-xs font-bold transition cursor-pointer";
          const dashedManagerBtn = isCompanyA
            ? "w-full flex items-center justify-center gap-2 border border-dashed border-teal-300 text-teal-700 bg-teal-50/30 hover:bg-teal-100/30 rounded-xl py-3.5 text-xs font-bold transition cursor-pointer"
            : "w-full flex items-center justify-center gap-2 border border-dashed border-violet-300 text-violet-700 bg-violet-50/30 hover:bg-violet-100/30 rounded-xl py-3.5 text-xs font-bold transition cursor-pointer";
          const unassignedActionBtn = isCompanyA
            ? "w-full mt-3 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold transition cursor-pointer"
            : "w-full mt-3 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold transition cursor-pointer";

          return (
            <div
              key={company.id}
              className={`rounded-2xl border shadow-md flex flex-col overflow-hidden ${bodyBg}`}
            >
              {/* Bold full-width colored header banner */}
              <div className={`p-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-6 shrink-0 ${headerBg}`}>
                <div className="flex items-center gap-3">
                  <Building className="h-6 w-6 text-white/90" />
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">{company.name}</h2>
                </div>

                {/* Quick stats displayed as white stat boxes */}
                <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                  <div className="bg-white/10 border border-white/25 backdrop-blur-md rounded-xl px-4 py-2 text-center min-w-[90px] flex-1">
                    <p className="text-sm font-semibold text-white/80 leading-none">Onboarded</p>
                    <p className="text-2xl font-black text-white mt-1">{onboardedCount}</p>
                  </div>
                  <div className="bg-white/10 border border-white/25 backdrop-blur-md rounded-xl px-4 py-2 text-center min-w-[90px] flex-1">
                    <p className="text-sm font-semibold text-white/80 leading-none">Lost</p>
                    <p className="text-2xl font-black text-white mt-1">{lostCount}</p>
                  </div>
                  <div className="bg-white/10 border border-white/25 backdrop-blur-md rounded-xl px-4 py-2 text-center min-w-[90px] flex-1">
                    <p className="text-sm font-semibold text-white/80 leading-none">Staff Count</p>
                    <p className="text-2xl font-black text-white mt-1">{totalStaff}</p>
                  </div>
                </div>

                {/* White outlined Assign Manager button */}
                <button
                  onClick={() =>
                    setActiveModal({
                      type: "assign-manager",
                      orgId: company.id,
                      orgName: company.name
                    })
                  }
                  className="flex items-center justify-center gap-1.5 border border-white text-white hover:bg-white/15 active:bg-white/20 font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer shrink-0"
                >
                  <Plus size={14} /> Assign Manager
                </button>
              </div>

              {/* Body Area */}
              <div className="p-6 space-y-6">
                {/* 1. Assigned Managers Horizontal Row */}
                <div className="space-y-3">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${labelText}`}>
                    Assigned Managers
                  </h3>

                  <div className="flex flex-row gap-6 overflow-x-auto pb-4 w-full scrollbar-thin">
                    {company.managers.map((m) => {
                      const manager = m.manager;
                      const managerTeamScore = getManagerKpi(manager.id, company.id);

                      // Salesmen assigned to this manager in this company
                      const managerSalesmenList = localSalesmenList.filter((s) =>
                        localManagerSalesmen.some((ms) => ms.manager_id === manager.id && ms.salesman_id === s.id)
                      );

                      return (
                        <div
                          key={manager.id}
                          className={`bg-white rounded-2xl p-5 shadow-sm min-w-[320px] max-w-[340px] border border-slate-100 flex-shrink-0 flex flex-col justify-between border-l-4 ${managerCardBorder}`}
                        >
                          <div className="space-y-4">
                            {/* Manager Block Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex gap-3">
                                <div className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-full font-bold text-sm border border-slate-100/50 ${managerAvatarBg}`}>
                                  {getInitials(manager.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900 leading-tight">
                                    {manager.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[170px]" title={manager.email}>
                                    {manager.email}
                                  </p>
                                  {manager.phone && (
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {manager.phone}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => handleRemoveManager(manager.id, company.id)}
                                disabled={isPending}
                                className="p-1 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer shrink-0"
                                title="Remove manager assignment"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            {/* Team KPI metrics */}
                            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Team KPI Score
                              </span>
                              <span className={teamKpiText}>
                                {managerTeamScore}
                              </span>
                            </div>

                            {/* Assigned Salesmen Vertical List */}
                            <div className="space-y-2">
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${labelAccentText}`}>
                                Assigned Salesmen ({managerSalesmenList.length})
                              </p>
                              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                                {managerSalesmenList.map((salesman) => {
                                  const { onboarded, lost, score } = getSalesmanKpi(salesman.id);
                                  return (
                                    <div
                                      key={salesman.id}
                                      className={`flex items-center justify-between bg-white border rounded-xl p-2.5 shadow-sm ${salesmanRowBorder}`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className={`h-7 w-7 shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${salesmanAvatarBg}`}>
                                          {getInitials(salesman.name)}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                                            {salesman.name}
                                          </p>
                                          <p className="text-[9px] text-slate-400 mt-0.5">
                                            Onboarded: {onboarded} · Lost: {lost}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${salesmanKpiPill}`}>
                                          KPI: {score}
                                        </span>
                                        <button
                                          onClick={() => handleUnassignSalesman(salesman.id, manager.id)}
                                          disabled={isPending}
                                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                                          title="Unassign salesman"
                                        >
                                          <UserMinus size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}

                                {managerSalesmenList.length === 0 && (
                                  <p className="text-[11px] text-slate-400 italic text-center py-2">
                                    No salesmen assigned.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Dashed assign salesman slot at manager bottom */}
                          <div className="mt-4 pt-3 border-t border-slate-100">
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
                      <div className="flex items-center justify-center w-full min-h-[140px] bg-white border border-dashed border-slate-200 rounded-2xl">
                        <p className="text-xs text-slate-400 italic">
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
                <div className="border-t border-slate-200/60 pt-6">
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${labelText}`}>
                    Unassigned Salesmen
                  </h3>

                  <div className="flex flex-row gap-4 overflow-x-auto pb-3 w-full scrollbar-thin">
                    {localSalesmenList
                      .filter((s) => !localManagerSalesmen.some((ms) => ms.salesman_id === s.id))
                      .map((s) => (
                        <div
                          key={s.id}
                          className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 min-w-[210px] flex-shrink-0 flex flex-col justify-between shadow-sm"
                        >
                          <div>
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                                {getInitials(s.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-amber-950 truncate leading-tight">
                                  {s.name}
                                </p>
                                <p className="text-[10px] text-amber-600 truncate mt-0.5 max-w-[140px]" title={s.email}>
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
                      <p className="text-xs text-slate-400 italic py-2">
                        All salesmen assigned to managers.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Modals Handling with dynamic accent matching --- */}
      {(() => {
        // Compute modal-specific colors
        const modalOrg = activeModal && "orgId" in activeModal ? companies.find((c) => c.id === activeModal.orgId) : undefined;
        const isModalTeal = modalOrg
          ? modalOrg.name.toLowerCase().includes("company a") || modalOrg.name.toLowerCase().endsWith("a")
          : true;

        const modalTextAccent = isModalTeal ? "text-teal-700" : "text-violet-700";
        const modalBorderAccent = isModalTeal ? "hover:border-teal-200 hover:bg-teal-50/30" : "hover:border-violet-200 hover:bg-violet-50/30";
        const modalAvatarBg = isModalTeal ? "bg-teal-50 text-teal-700" : "bg-violet-50 text-violet-700";
        const modalBtnAccent = isModalTeal ? "text-teal-700 bg-teal-50" : "text-violet-700 bg-violet-50";

        const isUserTeal = activeModal?.type === "add-user"
          ? activeModal.roleId === 2
          : activeModal?.type === "post-create-assign"
            ? activeModal.roleId === 2
            : true;

        const userModalTextAccent = "text-blue-900";
        const userModalBorderAccent = "focus:border-blue-950";
        const userModalBtnClass = "bg-blue-950 hover:bg-blue-900 text-white";

        return (
          <>
            {/* 1. Assign Manager Modal */}
            <Modal open={activeModal?.type === "assign-manager"}>
              {activeModal?.type === "assign-manager" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className={`text-base font-bold ${modalTextAccent}`}>
                      Assign Manager to {activeModal.orgName}
                    </h3>
                    <button
                      onClick={() => setActiveModal(null)}
                      className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 transition cursor-pointer"
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
                          className={`flex items-center gap-3 p-3 rounded-xl border border-slate-100 transition cursor-pointer ${modalBorderAccent}`}
                        >
                          <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center ${modalAvatarBg}`}>
                            {getInitials(mgr.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{mgr.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{mgr.email}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${modalBtnAccent}`}>
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
                      <p className="text-xs text-slate-400 italic text-center py-6">
                        All managers are already assigned to this company.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Modal>

            {/* 2. Assign Salesman Modal */}
            <Modal open={activeModal?.type === "assign-salesman"}>
              {activeModal?.type === "assign-salesman" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className={`text-base font-bold ${modalTextAccent}`}>
                      {activeModal.managerId === -1
                        ? `Assign Salesman: ${activeModal.managerName}`
                        : `Assign Salesman to ${activeModal.managerName}`}
                    </h3>
                    <button
                      onClick={() => setActiveModal(null)}
                      className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {activeModal.managerId === -1 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        <p className="text-xs text-slate-500 font-semibold mb-2">
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
                                  handleAssignSalesmanSubmit(sUser.id, m.manager_id);
                                }
                              }}
                              className={`flex items-center gap-3 p-3 rounded-xl border border-slate-100 transition cursor-pointer ${modalBorderAccent}`}
                            >
                              <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center bg-teal-50 text-teal-700`}>
                                {getInitials(m.manager.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{m.manager.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{m.manager.email}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${modalBtnAccent}`}>
                                Select
                              </span>
                            </div>
                          ))}

                        {(!companies.find((c) => c.id === activeModal.orgId)?.managers ||
                          companies.find((c) => c.id === activeModal.orgId)!.managers.length === 0) && (
                          <p className="text-xs text-slate-400 italic text-center py-6">
                            No managers assigned to this company. Assign a manager first.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {salesmenList
                          .filter((s) => {
                            const managersOfThisCompany =
                              companies.find((c) => c.id === activeModal.orgId)?.managers.map((m) => m.manager_id) ?? [];
                            return !managerSalesmen.some(
                              (ms) => managersOfThisCompany.includes(ms.manager_id) && ms.salesman_id === s.id
                            );
                          })
                          .map((s) => (
                            <div
                              key={s.id}
                              onClick={() => handleAssignSalesmanSubmit(s.id, activeModal.managerId)}
                              className={`flex items-center gap-3 p-3 rounded-xl border border-slate-100 transition cursor-pointer ${modalBorderAccent}`}
                            >
                              <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center ${modalAvatarBg}`}>
                                {getInitials(s.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{s.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${modalBtnAccent}`}>
                                Assign
                              </span>
                            </div>
                          ))}

                        {salesmenList.filter((s) => {
                          const managersOfThisCompany =
                            companies.find((c) => c.id === activeModal.orgId)?.managers.map((m) => m.manager_id) ?? [];
                          return !managerSalesmen.some(
                            (ms) => managersOfThisCompany.includes(ms.manager_id) && ms.salesman_id === s.id
                          );
                        }).length === 0 && (
                          <p className="text-xs text-slate-400 italic text-center py-6">
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
            <Modal open={activeModal?.type === "add-user"}>
              {activeModal?.type === "add-user" && (
                <form onSubmit={handleAddUserSubmit} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className={`text-base font-bold ${userModalTextAccent}`}>
                      Create New {activeModal.roleId === 2 ? "Manager" : "Salesman"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-xs font-medium text-rose-700">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Jenkins"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none transition ${userModalBorderAccent}`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. sarah@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none transition ${userModalBorderAccent}`}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Phone (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +1 555-0199"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={`h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none transition ${userModalBorderAccent}`}
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 font-medium">
                      Note: Password defaults to <span className="font-bold text-slate-800">salespal123</span>.
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${userModalBtnClass}`}
                    >
                      {isPending ? "Creating..." : "Create & Next"}
                    </button>
                  </div>
                </form>
              )}
            </Modal>

            {/* 4. Post-Create Assignment Modal */}
            <Modal open={activeModal?.type === "post-create-assign"}>
              {activeModal?.type === "post-create-assign" && (
                <form onSubmit={handlePostCreateAssignSubmit} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className={`text-base font-bold ${userModalTextAccent}`}>
                      Created: {activeModal.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        router.refresh();
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      The user has been successfully created. Now assign them to a company or manager:
                    </p>

                    {activeModal.roleId === 2 ? (
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Assign to Company
                        </label>
                        <select
                          value={selectedAssignmentId}
                          onChange={(e) => setSelectedAssignmentId(e.target.value)}
                          className={`h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none transition cursor-pointer ${userModalBorderAccent}`}
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
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Assign to Manager
                        </label>
                        <select
                          value={selectedAssignmentId}
                          onChange={(e) => setSelectedAssignmentId(e.target.value)}
                          className={`h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none transition cursor-pointer ${userModalBorderAccent}`}
                        >
                          <option value="">-- Choose Manager (Skip) --</option>
                          {managersList.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        router.refresh();
                      }}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Skip Assignment
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${userModalBtnClass}`}
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
