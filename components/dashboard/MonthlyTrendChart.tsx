"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface TrendPoint {
  month: string;
  companyA: number;
  companyB: number;
}

export function MonthlyTrendChart({ data, companyAName, companyBName }: {
  data: TrendPoint[];
  companyAName: string;
  companyBName: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 16, right: 18, left: -16, bottom: 0 }}>
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
          cursor={{ stroke: "#cbd5e1", strokeDasharray: "3 3" }}
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
        <Line
          dataKey="companyA"
          name={companyAName}
          type="monotone"
          stroke="#0d9488"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#ffffff", stroke: "#0d9488", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#0d9488", stroke: "#ffffff", strokeWidth: 2 }}
          connectNulls
        />
        <Line
          dataKey="companyB"
          name={companyBName}
          type="monotone"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#ffffff", stroke: "#3b82f6", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
