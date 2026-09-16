"use client";

import { LineChart } from "@mantine/charts";

interface TrendPoint {
  month: string;
  companyA: number;
  companyB: number;
}

export function MonthlyTrendChart({
  data,
  companyAName,
  companyBName,
}: {
  data: TrendPoint[];
  companyAName: string;
  companyBName: string;
}) {
  return (
    <LineChart
      h={300}
      data={data}
      dataKey="month"
      withLegend
      tickLine="y"
      gridAxis="x"
      curveType="monotone"
      series={[
        { name: "companyA", label: companyAName, color: "teal.6" },
        { name: "companyB", label: companyBName, color: "blue.6" },
      ]}
    />
  );
}
