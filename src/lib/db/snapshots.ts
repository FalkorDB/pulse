import "server-only";
import { query, queryOne } from "@/lib/falkordb";
import { ensureSchema } from "@/lib/db/schema";
import type { Datapoint } from "@/lib/types";

type ScalarRow = { day: unknown; ts: unknown; value: unknown };

const toPoint = (r: ScalarRow): Datapoint => ({
  day: String(r.day),
  ts: Number(r.ts),
  value: Number(r.value),
});

/** Insert or update a single daily datapoint for a source+metric. */
export async function upsertDatapoint(
  sourceId: string,
  metric: string,
  day: string,
  ts: number,
  value: number,
): Promise<void> {
  await ensureSchema();
  await query(
    `MATCH (s:Source {id: $sourceId})
     MERGE (s)-[:MEASURED]->(p:Datapoint {metric: $metric, day: $day})
     SET p.ts = $ts, p.value = $value`,
    { sourceId, metric, day, ts, value },
  );
}

/** Bulk insert/update datapoints for a source in a single round trip. */
export async function bulkUpsert(
  sourceId: string,
  points: { metric: string; day: string; ts: number; value: number }[],
): Promise<number> {
  if (points.length === 0) return 0;
  await ensureSchema();
  const row = await queryOne<{ n: number }>(
    `MATCH (s:Source {id: $sourceId})
     UNWIND $points AS pt
     MERGE (s)-[:MEASURED]->(p:Datapoint {metric: pt.metric, day: pt.day})
     SET p.ts = pt.ts, p.value = pt.value
     RETURN count(p) AS n`,
    { sourceId, points },
  );
  return Number(row?.n ?? 0);
}

/** Ordered time series for a source+metric, optionally from a given day. */
export async function getSeries(
  sourceId: string,
  metric: string,
  fromDay?: string,
): Promise<Datapoint[]> {
  await ensureSchema();
  const where = fromDay ? "WHERE p.day >= $fromDay" : "";
  const rows = await query<ScalarRow>(
    `MATCH (s:Source {id: $sourceId})-[:MEASURED]->(p:Datapoint {metric: $metric})
     ${where}
     RETURN p.day AS day, p.ts AS ts, p.value AS value
     ORDER BY p.ts`,
    { sourceId, metric, fromDay: fromDay ?? null },
  );
  return rows.map(toPoint);
}

/** Most recent datapoint for a source+metric. */
export async function getLatest(
  sourceId: string,
  metric: string,
): Promise<Datapoint | null> {
  await ensureSchema();
  const row = await queryOne<ScalarRow>(
    `MATCH (s:Source {id: $sourceId})-[:MEASURED]->(p:Datapoint {metric: $metric})
     RETURN p.day AS day, p.ts AS ts, p.value AS value
     ORDER BY p.ts DESC LIMIT 1`,
    { sourceId, metric },
  );
  return row ? toPoint(row) : null;
}
