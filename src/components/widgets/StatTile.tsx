"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { SeriesResponse } from "@/lib/types";
import { formatCompact, formatDelta, formatPct } from "@/lib/format";

export function StatTile({
  series,
  loading,
  color,
  gradientId,
}: {
  series?: SeriesResponse;
  loading: boolean;
  color: string;
  gradientId: string;
}) {
  if (!series && loading) {
    return <div className="h-full animate-pulse rounded-lg bg-surface-2" />;
  }
  if (!series || series.points.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted">
        No data yet
      </div>
    );
  }

  const { summary, unit } = series;
  const change = summary.change;
  const dir = change == null || change === 0 ? "flat" : change > 0 ? "up" : "down";
  const deltaColor =
    dir === "flat"
      ? "text-muted"
      : dir === "up"
        ? "text-[rgb(var(--good))]"
        : "text-[rgb(var(--bad))]";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline gap-1.5">
        <span className="tnum text-[32px] font-semibold leading-none tracking-tight text-fg">
          {formatCompact(summary.latest)}
        </span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>

      {change != null && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
          {dir === "up" && <TrendingUp size={13} />}
          {dir === "down" && <TrendingDown size={13} />}
          <span className="tnum">{formatDelta(change)}</span>
          {summary.changePct != null && (
            <span className="tnum text-muted">({formatPct(summary.changePct)})</span>
          )}
        </div>
      )}

      <div className="mt-auto -mx-1 h-12 w-[calc(100%+0.5rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={series.points}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.75}
              fill={`url(#${gradientId})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
