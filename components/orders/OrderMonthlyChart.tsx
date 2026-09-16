"use client";

import { CompositeChart } from "@mantine/charts";

interface OrderMonthlyChartPoint {
  month: string;
  totalCollected: number;
  totalPending: number;
  orderCount: number;
}

export function OrderMonthlyChart({ data }: { data: OrderMonthlyChartPoint[] }) {
  return (
    <CompositeChart
      h={280}
      data={data}
      dataKey="month"
      withLegend
      withRightYAxis
      rightYAxisLabel="Orders"
      tickLine="y"
      gridAxis="x"
      barProps={{ stackId: "orders" }}
      series={[
        { name: "totalCollected", label: "Collected", color: "teal.6", type: "bar" },
        { name: "totalPending", label: "Pending", color: "orange.6", type: "bar" },
        { name: "orderCount", label: "Orders", color: "blue.6", type: "line", yAxisId: "right" },
      ]}
    />
  );
}
