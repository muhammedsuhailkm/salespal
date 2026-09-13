"use client";

import { useSyncExternalStore } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface OrderMonthlyChartPoint {
  month: string;
  totalCollected: number;
  totalPending: number;
  orderCount: number;
}

function subscribeToMount(onStoreChange: () => void) {
  onStoreChange();
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function OrderMonthlyChart({ data }: { data: OrderMonthlyChartPoint[] }) {
  const isMounted = useSyncExternalStore(subscribeToMount, getClientSnapshot, getServerSnapshot);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-[280px]">
        <div className="h-full w-full rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 16, right: 18, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
            fontSize: "12px",
            fontWeight: 500,
          }}
          labelStyle={{ color: "#0f172a", fontWeight: 600, marginBottom: 2 }}
          cursor={{ fill: "#f1f5f9" }}
        />
        <Legend
          verticalAlign="top"
          height={32}
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span style={{ color: "#475569", fontSize: "11px", fontWeight: 500 }}>{value}</span>
          )}
        />
        <Bar yAxisId="left" dataKey="totalCollected" name="Collected" stackId="amount" fill="#0d9488" />
        <Bar yAxisId="left" dataKey="totalPending" name="Pending" stackId="amount" fill="#d97706" radius={[4, 4, 0, 0]} />
        <Line
          yAxisId="right"
          dataKey="orderCount"
          name="Orders"
          type="monotone"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#ffffff", stroke: "#3b82f6", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
