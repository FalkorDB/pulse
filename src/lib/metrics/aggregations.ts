import type {
  Aggregation,
  Datapoint,
  MetricKind,
  SeriesResponse,
} from "@/lib/types";

/** Which aggregations make sense for a metric of this kind. */
export function allowedAggregations(kind: MetricKind): Aggregation[] {
  switch (kind) {
    case "level":
      return ["raw", "latest", "delta", "rolling7", "rolling30"];
    case "cumulative":
      return ["raw", "latest", "delta", "rolling7"];
    case "incremental":
      return ["cumsum", "sum", "raw", "rolling7", "rolling30"];
  }
}

export function defaultAggregation(kind: MetricKind): Aggregation {
  return kind === "incremental" ? "cumsum" : "raw";
}

function sortAsc(points: Datapoint[]): Datapoint[] {
  return [...points].sort((a, b) => a.ts - b.ts);
}

function rolling(points: Datapoint[], window: number): Datapoint[] {
  const out: Datapoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - window + 1);
    let sum = 0;
    for (let j = start; j <= i; j++) sum += points[j].value;
    const count = i - start + 1;
    out.push({ day: points[i].day, ts: points[i].ts, value: sum / count });
  }
  return out;
}

/** Transform a raw daily series into the display series for `agg`. */
export function aggregate(
  rawPoints: Datapoint[],
  agg: Aggregation,
  _kind: MetricKind,
): Datapoint[] {
  const points = sortAsc(rawPoints);
  if (points.length === 0) return [];

  switch (agg) {
    case "raw":
      return points;

    case "latest":
      return [points[points.length - 1]];

    case "cumsum": {
      let run = 0;
      return points.map((p) => {
        run += p.value;
        return { day: p.day, ts: p.ts, value: run };
      });
    }

    case "sum": {
      const total = points.reduce((s, p) => s + p.value, 0);
      const last = points[points.length - 1];
      return [{ day: last.day, ts: last.ts, value: total }];
    }

    case "delta": {
      const out: Datapoint[] = [];
      for (let i = 1; i < points.length; i++) {
        out.push({
          day: points[i].day,
          ts: points[i].ts,
          value: points[i].value - points[i - 1].value,
        });
      }
      return out;
    }

    case "rolling7":
      return rolling(points, 7);

    case "rolling30":
      return rolling(points, 30);

    default:
      return points;
  }
}

/** Summary stats for a stat tile / tooltip. All fields null-safe. */
export function summarize(
  rawPoints: Datapoint[],
  aggregated: Datapoint[],
  kind: MetricKind,
): SeriesResponse["summary"] {
  const aggValues = aggregated.map((p) => p.value);
  const rawValues = sortAsc(rawPoints).map((p) => p.value);

  const latest = aggValues.length ? aggValues[aggValues.length - 1] : null;
  const previous = aggValues.length >= 2 ? aggValues[aggValues.length - 2] : null;
  const change = latest !== null && previous !== null ? latest - previous : null;
  const changePct =
    change !== null && previous !== null && previous !== 0
      ? (change / previous) * 100
      : null;

  const total =
    kind === "incremental"
      ? rawValues.reduce((s, v) => s + v, 0)
      : rawValues.length
        ? rawValues[rawValues.length - 1]
        : null;

  return {
    latest,
    previous,
    change,
    changePct,
    total,
    min: aggValues.length ? Math.min(...aggValues) : null,
    max: aggValues.length ? Math.max(...aggValues) : null,
  };
}
