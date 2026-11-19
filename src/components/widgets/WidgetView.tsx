"use client";

import { useTheme } from "@/components/theme";
import { seriesColor } from "@/lib/palette";
import { AGG_LABELS } from "@/lib/format";
import type { SeriesResponse, WidgetRecord } from "@/lib/types";
import { WidgetCard } from "./WidgetCard";
import { StatTile } from "./StatTile";
import { MetricChart } from "./MetricChart";

export function WidgetView({
  widget,
  index,
  series,
  loading,
  editMode,
  dragHandleClass,
  onEdit,
  onRemove,
}: {
  widget: WidgetRecord;
  index: number;
  series?: SeriesResponse;
  loading: boolean;
  editMode: boolean;
  dragHandleClass: string;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { resolved } = useTheme();
  const color = seriesColor(resolved, index, widget.color);
  const gradientId = `grad-${widget.id}`;
  const subtitle = AGG_LABELS[widget.agg] ?? widget.agg;

  return (
    <WidgetCard
      title={widget.title}
      subtitle={subtitle}
      editMode={editMode}
      dragHandleClass={dragHandleClass}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      {widget.viz === "stat" ? (
        <StatTile
          series={series}
          loading={loading}
          color={color}
          gradientId={gradientId}
        />
      ) : (
        <MetricChart
          viz={widget.viz}
          series={series}
          loading={loading}
          color={color}
          theme={resolved}
          gradientId={gradientId}
        />
      )}
    </WidgetCard>
  );
}
