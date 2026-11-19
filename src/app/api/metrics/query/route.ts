import { z } from "zod";
import { getSource } from "@/lib/db/sources";
import { getSeries } from "@/lib/db/snapshots";
import { getMetricDef } from "@/lib/metrics/registry";
import { aggregate, summarize } from "@/lib/metrics/aggregations";
import { dayKey } from "@/lib/ids";
import { handle, ok, requireUser } from "@/lib/api";
import type { Aggregation, SeriesResponse } from "@/lib/types";

const querySchema = z.object({
  queries: z
    .array(
      z.object({
        sourceId: z.string().min(1),
        metric: z.string().min(1),
        agg: z.string().min(1),
        days: z.number().int().positive().max(1825).default(90),
      }),
    )
    .max(100),
});

/**
 * Batch metric query: one round-trip serves every widget on a dashboard.
 * Applies the requested aggregation server-side and returns summary stats.
 */
export async function POST(req: Request) {
  return handle(async () => {
    await requireUser();
    const { queries } = querySchema.parse(await req.json());

    // Cache source lookups within the batch (dashboards reuse sources).
    const sourceCache = new Map<string, Awaited<ReturnType<typeof getSource>>>();
    async function source(id: string) {
      if (!sourceCache.has(id)) sourceCache.set(id, await getSource(id));
      return sourceCache.get(id)!;
    }

    const results: SeriesResponse[] = await Promise.all(
      queries.map(async (q): Promise<SeriesResponse> => {
        const src = await source(q.sourceId);
        const def = src ? getMetricDef(src.type, q.metric) : undefined;
        const kind = def?.kind ?? "level";
        const fromDay = dayKey(Date.now() - q.days * 86_400_000);
        const raw = src ? await getSeries(q.sourceId, q.metric, fromDay) : [];
        const agg = q.agg as Aggregation;
        const points = aggregate(raw, agg, kind);
        return {
          sourceId: q.sourceId,
          metric: q.metric,
          kind,
          unit: def?.unit,
          agg,
          points,
          summary: summarize(raw, points, kind),
        };
      }),
    );

    return ok({ results });
  });
}
