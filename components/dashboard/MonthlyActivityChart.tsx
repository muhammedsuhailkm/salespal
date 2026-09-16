"use client";

import { LineChart } from "@mantine/charts";

interface MonthlyActivityChartProps {
  data: { month: string; count: number }[];
}

export function MonthlyActivityChart({ data }: MonthlyActivityChartProps) {
  return (
    <LineChart
      h={240}
      data={data}
      dataKey="month"
      series={[{ name: "count", label: "Onboarded", color: "teal.6" }]}
      curveType="linear"
      withDots
      withLegend={false}
      tickLine="y"
      gridAxis="x"
    />
  );
}
