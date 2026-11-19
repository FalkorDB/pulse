"use client";

import useSWR from "swr";
import { api, type MetricQuery } from "@/lib/client";
import type { SeriesResponse } from "@/lib/types";

/** SWR hooks built on the typed `api` client. Keeps components stable. */

export function useDashboards() {
  return useSWR("/api/dashboards", () => api.listDashboards());
}

export function useSources() {
  return useSWR("/api/sources", () => api.listSources());
}

export function useSourceTypes() {
  return useSWR("/api/source-types", () => api.sourceTypes());
}

export function metricKey(q: MetricQuery): string {
  return `${q.sourceId}|${q.metric}|${q.agg}|${q.days}`;
}

/**
 * Fetch all widget series for a dashboard in one batched request. Returns a map
 * keyed by metricKey(query) so each widget looks up its own series.
 */
export function useMetrics(queries: MetricQuery[]) {
  const sorted = [...queries].sort((a, b) =>
    metricKey(a).localeCompare(metricKey(b)),
  );
  const key = sorted.length ? `metrics:${sorted.map(metricKey).join(",")}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => api.query(sorted).then((r) => r.results),
    { keepPreviousData: true },
  );

  const map = new Map<string, SeriesResponse>();
  if (data) {
    sorted.forEach((q, i) => {
      if (data[i]) map.set(metricKey(q), data[i]);
    });
  }
  return { map, error, isLoading, mutate };
}
