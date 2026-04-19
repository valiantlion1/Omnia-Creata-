"use client";

import type { OcosReport } from "@ocos/contracts";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const palette = ["#2b6d6a", "#9b5d3b", "#7f6a2d", "#7a4f8c", "#c06452"];

function toChartData(chart: OcosReport["charts"][number]) {
  const rows = new Map<string, Record<string, number | string>>();

  for (const series of chart.series) {
    for (const point of series.points) {
      const row = rows.get(point.x) ?? { x: point.x };
      row[series.name] = point.y;
      rows.set(point.x, row);
    }
  }

  return [...rows.values()];
}

function ChartRenderer({ chart }: { chart: OcosReport["charts"][number] }) {
  const data = toChartData(chart);
  const seriesNames = chart.series.map((series) => series.name);

  const tooltipStyle = {
    background: "#fffaf3",
    border: "1px solid rgba(125, 94, 65, 0.16)",
    borderRadius: 16,
    color: "#2b2118",
    boxShadow: "0 18px 32px rgba(73, 58, 44, 0.12)"
  };

  if (chart.type === "bar" || chart.type === "timeline") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(125, 94, 65, 0.14)" vertical={false} />
          <XAxis dataKey="x" stroke="rgba(78, 60, 44, 0.5)" tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(78, 60, 44, 0.5)" tickLine={false} axisLine={false} width={32} />
          <Tooltip contentStyle={tooltipStyle} />
          {seriesNames.map((seriesName, index) => (
            <Bar key={seriesName} dataKey={seriesName} fill={palette[index % palette.length]} radius={[8, 8, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chart.type === "area" || chart.type === "sparkline") {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <CartesianGrid stroke="rgba(125, 94, 65, 0.14)" vertical={false} />
          <XAxis dataKey="x" stroke="rgba(78, 60, 44, 0.5)" tickLine={false} axisLine={false} />
          <YAxis stroke="rgba(78, 60, 44, 0.5)" tickLine={false} axisLine={false} width={32} />
          <Tooltip contentStyle={tooltipStyle} />
          {seriesNames.map((seriesName, index) => (
            <Area
              key={seriesName}
              type="monotone"
              dataKey={seriesName}
              stroke={palette[index % palette.length]}
              fill={palette[index % palette.length]}
              fillOpacity={0.16}
              strokeWidth={2.2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(125, 94, 65, 0.14)" vertical={false} />
        <XAxis dataKey="x" stroke="rgba(78, 60, 44, 0.5)" tickLine={false} axisLine={false} />
        <YAxis stroke="rgba(78, 60, 44, 0.5)" tickLine={false} axisLine={false} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        {seriesNames.map((seriesName, index) => (
          <Line
            key={seriesName}
            type="monotone"
            dataKey={seriesName}
            stroke={palette[index % palette.length]}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ReportCharts({ report }: { report: OcosReport }) {
  if (report.charts.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {report.charts.map((chart) => (
        <section
          key={chart.id}
          className="rounded-[24px] border border-[var(--ocos-border-strong)] bg-white/82 p-4 shadow-[0_18px_40px_rgba(73,58,44,0.08)]"
        >
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--ocos-muted)]">{chart.type}</p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--ocos-ink)]">{chart.label}</h3>
          </div>
          <ChartRenderer chart={chart} />
        </section>
      ))}
    </div>
  );
}
