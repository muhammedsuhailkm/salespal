"use client";

import dynamic from "next/dynamic";

const MonthlyTrendChartLazy = dynamic(
  () =>
    import("@/components/dashboard/MonthlyTrendChart").then(
      (mod) => mod.MonthlyTrendChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] w-full rounded-xl bg-slate-100 animate-pulse" />
    ),
  }
);

interface TrendPoint {
  month: string;
  companyA: number;
  companyB: number;
}

export function MonthlyTrendChartWrapper({
  data,
  companyAName,
  companyBName,
}: {
  data: TrendPoint[];
  companyAName: string;
  companyBName: string;
}) {
  return (
    <div className="h-[300px] w-full">
      <MonthlyTrendChartLazy
        data={data}
        companyAName={companyAName}
        companyBName={companyBName}
      />
    </div>
  );
}
