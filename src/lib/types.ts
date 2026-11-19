/**
 * Shared domain types. Pure types only (no server imports) so both server code
 * and client components can import them.
 */

/** How a metric behaves over time — drives which aggregations make sense. */
export type MetricKind =
  | "level" // point-in-time value that can rise or fall (stars, forks, open issues)
  | "cumulative" // monotonic running total (dockerhub pulls, total downloads)
  | "incremental"; // per-period activity (daily downloads, daily views)

export type Aggregation =
  | "latest" // most recent value
  | "raw" // value as recorded each day
  | "cumsum" // running cumulative sum of incremental values
  | "sum" // sum over the window
  | "delta" // day-over-day change (turns a cumulative series into incremental)
  | "rolling7" // 7-day rolling average
  | "rolling30"; // 30-day rolling average

export type VizType = "stat" | "line" | "area" | "bar";

export interface MetricDefinition {
  key: string;
  label: string;
  kind: MetricKind;
  unit?: string;
}

/** A field the UI renders when configuring a source instance. */
export interface SourceConfigField {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  help?: string;
}

export interface SourceRecord {
  id: string;
  type: string;
  label: string;
  config: Record<string, string>;
  enabled: boolean;
  createdAt: number;
  createdBy?: string | null;
  lastCollectedAt?: number | null;
  lastStatus?: string | null;
}

export interface WidgetRecord {
  id: string;
  dashboardId: string;
  viz: VizType;
  title: string;
  sourceId: string;
  metric: string;
  agg: Aggregation;
  rangeDays: number;
  color?: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  order: number;
}

export interface DashboardRecord {
  id: string;
  ownerEmail: string;
  name: string;
  order: number;
  createdAt: number;
  widgets: WidgetRecord[];
}

export interface Datapoint {
  day: string; // YYYY-MM-DD
  ts: number; // epoch ms
  value: number;
}

/** Series returned by the metrics query API, aggregation already applied. */
export interface SeriesResponse {
  sourceId: string;
  metric: string;
  kind: MetricKind;
  unit?: string;
  agg: Aggregation;
  points: Datapoint[];
  summary: {
    latest: number | null;
    previous: number | null;
    change: number | null; // latest - previous
    changePct: number | null;
    total: number | null; // sum of points (window)
    min: number | null;
    max: number | null;
  };
}
