"use client";

import { useMemo } from "react";
import ReactGridLayout, { WidthProvider, type Layout } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { WidgetView } from "./widgets/WidgetView";
import { metricKey } from "@/lib/hooks";
import type { SeriesResponse, WidgetRecord } from "@/lib/types";

const GridLayout = WidthProvider(ReactGridLayout);

export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function DashboardGrid({
  widgets,
  metrics,
  metricsLoading,
  editMode,
  onLayoutChange,
  onEditWidget,
  onRemoveWidget,
}: {
  widgets: WidgetRecord[];
  metrics: Map<string, SeriesResponse>;
  metricsLoading: boolean;
  editMode: boolean;
  onLayoutChange: (items: LayoutItem[]) => void;
  onEditWidget: (w: WidgetRecord) => void;
  onRemoveWidget: (id: string) => void;
}) {
  const layout: Layout = useMemo(
    () =>
      widgets.map((w) => ({
        i: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: 2,
        minH: 3,
      })),
    [widgets],
  );

  function handleChange(next: Layout) {
    if (!editMode) return;
    onLayoutChange(
      next.map((l) => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h })),
    );
  }

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={40}
      margin={[16, 16]}
      containerPadding={[0, 0]}
      isDraggable={editMode}
      isResizable={editMode}
      draggableHandle=".drag-handle"
      compactType="vertical"
      onLayoutChange={handleChange}
    >
      {widgets.map((w, index) => {
        const series = metrics.get(
          metricKey({
            sourceId: w.sourceId,
            metric: w.metric,
            agg: w.agg,
            days: w.rangeDays,
          }),
        );
        return (
          <div key={w.id}>
            <WidgetView
              widget={w}
              index={index}
              series={series}
              loading={metricsLoading && !series}
              editMode={editMode}
              dragHandleClass="drag-handle"
              onEdit={() => onEditWidget(w)}
              onRemove={() => onRemoveWidget(w.id)}
            />
          </div>
        );
      })}
    </GridLayout>
  );
}
