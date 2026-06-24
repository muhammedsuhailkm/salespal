"use client";

import { useSyncExternalStore } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts";

interface MonthlyActivityChartProps {
  data: { month: string; count: number }[];
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

export function MonthlyActivityChart({ data }: MonthlyActivityChartProps) {
  const isMounted = useSyncExternalStore(
    subscribeToMount,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-[240px]">
        <div className="h-full w-full rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 24, right: 18, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#64748b", fontWeight: 500 }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
        />
        <YAxis
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
          itemStyle={{ color: "#0d9488" }}
          cursor={{ stroke: "#cbd5e1", strokeDasharray: "3 3" }}
        />
        <Line
          dataKey="count"
          name="Onboarded"
          type="linear"
          stroke="#0d9488"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#ffffff", stroke: "#0d9488", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#0d9488", stroke: "#ffffff", strokeWidth: 2 }}
          connectNulls
        >
          <LabelList
            dataKey="count"
            position="top"
            offset={8}
            fill="#334155"
            fontSize={10}
            fontWeight={700}
          />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}
