import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { MetricLog } from "@/types/goal";

interface MetricChartProps {
  logs: MetricLog[];
  targetValue?: number | null;
  metricUnit: string;
  baselineValue?: number;
  baselineDate?: string;
}

export function MetricChart({ logs, targetValue, metricUnit, baselineValue, baselineDate }: MetricChartProps) {
  const data = useMemo(() => {
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    // Ensure baseline is the first point
    if (baselineValue !== undefined && baselineDate && !sorted.find((l) => l.date === baselineDate)) {
      sorted.unshift({ id: "baseline", goal_id: "", date: baselineDate, value: baselineValue, notes: "Baseline" });
    }
    return sorted.map((l) => ({
      date: new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: l.value,
      rawDate: l.date,
    }));
  }, [logs, baselineValue, baselineDate]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 12% 16%)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "hsl(220 10% 50%)" }}
          axisLine={{ stroke: "hsl(225 12% 16%)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(220 10% 50%)", fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          unit={` ${metricUnit}`}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(225 20% 9%)",
            border: "1px solid hsl(225 12% 16%)",
            borderRadius: "8px",
            fontSize: 12,
            fontFamily: "JetBrains Mono",
          }}
          labelStyle={{ color: "hsl(210 20% 93%)" }}
          itemStyle={{ color: "hsl(270 70% 60%)" }}
        />
        {targetValue != null && (
          <ReferenceLine
            y={targetValue}
            stroke="hsl(270 70% 60%)"
            strokeDasharray="6 3"
            strokeOpacity={0.5}
            label={{
              value: `Target: ${targetValue}`,
              position: "right",
              fill: "hsl(270 70% 60%)",
              fontSize: 11,
              fontFamily: "JetBrains Mono",
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(270 70% 60%)"
          strokeWidth={2}
          dot={{ fill: "hsl(270 70% 60%)", r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "hsl(270 70% 60%)", strokeWidth: 2, stroke: "hsl(225 25% 6%)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
