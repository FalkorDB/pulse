"use client";

import type {
  Aggregation,
  DashboardRecord,
  MetricKind,
  SeriesResponse,
  SourceRecord,
  VizType,
} from "@/lib/types";
import type { SourceConfigField } from "@/lib/types";

/** Metric info as returned by /api/source-types (aggregations resolved). */
export interface MetricInfo {
  key: string;
  label: string;
  kind: MetricKind;
  unit: string | null;
  aggregations: Aggregation[];
  defaultAgg: Aggregation;
}

export interface SourceTypeInfo {
  type: string;
  label: string;
  description: string;
  icon: string;
  configFields: SourceConfigField[];
  metrics: MetricInfo[];
}

export interface MetricQuery {
  sourceId: string;
  metric: string;
  agg: Aggregation;
  days: number;
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

/** SWR fetcher for GET endpoints. */
export async function fetcher<T>(url: string): Promise<T> {
  return parse<T>(await fetch(url, { headers: { Accept: "application/json" } }));
}

async function send<T>(method: string, url: string, body?: unknown): Promise<T> {
  return parse<T>(
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export const api = {
  // Dashboards
  listDashboards: () => fetcher<{ dashboards: DashboardRecord[] }>("/api/dashboards"),
  createDashboard: (name: string) =>
    send<{ dashboard: DashboardRecord }>("POST", "/api/dashboards", { name }),
  renameDashboard: (id: string, name: string) =>
    send<{ ok: true }>("PATCH", `/api/dashboards/${id}`, { name }),
  deleteDashboard: (id: string) =>
    send<{ ok: true }>("DELETE", `/api/dashboards/${id}`),
  saveLayout: (id: string, items: { id: string; x: number; y: number; w: number; h: number }[]) =>
    send<{ ok: true }>("PUT", `/api/dashboards/${id}/layout`, { items }),

  // Widgets
  addWidget: (input: {
    dashboardId: string;
    viz: VizType;
    title: string;
    sourceId: string;
    metric: string;
    agg: Aggregation;
    rangeDays: number;
    color?: string | null;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
  }) => send<{ widget: unknown }>("POST", "/api/widgets", input),
  updateWidget: (
    id: string,
    patch: Partial<{
      viz: VizType;
      title: string;
      sourceId: string;
      metric: string;
      agg: Aggregation;
      rangeDays: number;
      color: string | null;
    }>,
  ) => send<{ widget: unknown }>("PATCH", `/api/widgets/${id}`, patch),
  deleteWidget: (id: string) => send<{ ok: true }>("DELETE", `/api/widgets/${id}`),

  // Sources
  listSources: () => fetcher<{ sources: SourceRecord[] }>("/api/sources"),
  sourceTypes: () => fetcher<{ types: SourceTypeInfo[] }>("/api/source-types"),
  createSource: (type: string, config: Record<string, string>, label?: string) =>
    send<{ source: SourceRecord }>("POST", "/api/sources", { type, config, label }),
  updateSource: (
    id: string,
    patch: Partial<{ label: string; config: Record<string, string>; enabled: boolean }>,
  ) => send<{ source: SourceRecord }>("PATCH", `/api/sources/${id}`, patch),
  deleteSource: (id: string) => send<{ ok: true }>("DELETE", `/api/sources/${id}`),

  // Metrics
  query: (queries: MetricQuery[]) =>
    send<{ results: SeriesResponse[] }>("POST", "/api/metrics/query", { queries }),

  // Collection — session-authenticated manual refresh (the cron route is separate).
  refresh: () =>
    send<{ ok: true; points: number; sources: number }>("POST", "/api/refresh"),

  // One-time historical reconstruction (GitHub stars/forks over time).
  backfillHistory: () =>
    send<{ ok: true; points: number; sources: number }>("POST", "/api/backfill"),
};
