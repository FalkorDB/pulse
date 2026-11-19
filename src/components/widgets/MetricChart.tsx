"use client";

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
  YAxis,
} from "recharts";
import type { SeriesResponse, VizType } from "@/lib/types";
import type { Theme } from "@/lib/palette";
import { CHROME } from "@/lib/palette";
import { formatCompact, formatDay, formatFull } from "@/lib/format";

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-md">
      <div className="text-muted">{formatDay(label as string)}</div>
      <div className="tnum mt-0.5 font-semibold text-fg">
        {formatFull(v)}
        {unit ? ` ${unit}` : ""}
      </div>
    </div>
  );
}

export function MetricChart({
  viz,
  series,
  loading,
  color,
  theme,
  gradientId,
}: {
  viz: VizType;
  series?: SeriesResponse;
  loading: boolean;
  color: string;
  theme: Theme;
  gradientId: string;
}) {
  if (!series && loading) {
    return <div className="h-full animate-pulse rounded-lg bg-surface-2" />;
  }
  if (!series || series.points.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-xs text-muted">
        <span>No data yet.</span>
        <span>Run a collection to populate this metric.</span>
      </div>
    );
  }

  const chrome = CHROME[theme];
  const data = series.points;
  const commonAxes = (
    <>
      <CartesianGrid vertical={false} stroke={chrome.grid} strokeWidth={1} />
      <XAxis
        dataKey="day"
        tickFormatter={(d) => formatDay(d)}
        tick={{ fill: chrome.muted, fontSize: 11 }}
        tickLine={false}
        axisLine={{ stroke: chrome.axis }}
        minTickGap={28}
        tickMargin={8}
      />
      <YAxis
        tickFormatter={(v) => formatCompact(v)}
        tick={{ fill: chrome.muted, fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        width={40}
      />
      <Tooltip
        content={<ChartTooltip unit={series.unit} />}
        cursor={{ stroke: chrome.axis, strokeWidth: 1 }}
      />
    </>
  );

  const margin = { top: 8, right: 10, bottom: 0, left: 0 };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {viz === "bar" ? (
        <BarChart data={data} margin={margin}>
          {commonAxes}
          <Bar
            dataKey="value"
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
        </BarChart>
      ) : viz === "area" ? (
        <AreaChart data={data} margin={margin}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {commonAxes}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: chrome.surface }}
            isAnimationActive={false}
          />
        </AreaChart>
      ) : (
        <LineChart data={data} margin={margin}>
          {commonAxes}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: chrome.surface }}
            isAnimationActive={false}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
