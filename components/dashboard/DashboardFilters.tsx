"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

interface Org {
  id: number;
  name: string;
}

export function DashboardFilters({ orgs }: { orgs: Org[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPeriod = searchParams.get("period") ?? "this_month";
  const currentOrg = searchParams.get("org") ?? "all";

  const [selectedOrg, setSelectedOrg] = useState(currentOrg);
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);

  // Synchronize state when query parameters change (e.g., via back/forward navigation)
  useEffect(() => {
    setSelectedOrg(currentOrg);
  }, [currentOrg]);

  useEffect(() => {
    setSelectedPeriod(currentPeriod);
  }, [currentPeriod]);

  const navigate = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || value === "this_month") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [router, pathname, searchParams]
  );

  const handleOrgChange = (orgId: string) => {
    setSelectedOrg(orgId);
    navigate("org", orgId);
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    navigate("period", period);
  };

  // Compute current quarter label
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const quarterLabel = `Q${quarter} ${now.getFullYear()}`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Org tabs */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
        <button
          type="button"
          onClick={() => handleOrgChange("all")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${
            selectedOrg === "all"
              ? "bg-slate-950 text-white shadow-sm font-semibold"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
          }`}
        >
          All
        </button>
        {orgs.map((org) => {
          const isCompanyA = org.name.toLowerCase().includes("company a") || org.name.toLowerCase().endsWith("a");
          const isCompanyB = org.name.toLowerCase().includes("company b") || org.name.toLowerCase().endsWith("b");
          const isActive = selectedOrg === String(org.id);

          let tabClass = "";
          if (isActive) {
            if (isCompanyA) {
              tabClass = "bg-teal-600 text-white shadow-sm font-semibold";
            } else if (isCompanyB) {
              tabClass = "bg-blue-600 text-white shadow-sm font-semibold";
            } else {
              tabClass = "bg-slate-950 text-white shadow-sm font-semibold";
            }
          } else {
            if (isCompanyA) {
              tabClass = "text-teal-700/85 hover:text-teal-800 hover:bg-teal-50/60";
            } else if (isCompanyB) {
              tabClass = "text-blue-700/85 hover:text-blue-800 hover:bg-blue-50/60";
            } else {
              tabClass = "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50";
            }
          }

          return (
            <button
              key={org.id}
              type="button"
              onClick={() => handleOrgChange(String(org.id))}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${tabClass}`}
            >
              {org.name}
            </button>
          );
        })}
      </div>

      {/* Period dropdown */}
      <select
        value={selectedPeriod}
        onChange={(e) => handlePeriodChange(e.target.value)}
        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer"
      >
        <option value="this_month">This Month</option>
        <option value="last_month">Last Month</option>
        <option value="quarter">{quarterLabel}</option>
      </select>
    </div>
  );
}
