import "server-only";
import { getEnabledSources, markCollected } from "@/lib/db/sources";
import { bulkUpsert } from "@/lib/db/snapshots";
import { getSourceType } from "@/lib/metrics/registry";
import { GITHUB_TOKEN } from "@/lib/env";

export interface CollectResult {
  sourceId: string;
  label: string;
  type: string;
  ok: boolean;
  points: number;
  error?: string;
}

/**
 * Run every enabled source's adapter and persist the datapoints it returns.
 * Idempotent: adapters may return historical points; the upsert dedupes by
 * (source, metric, day), so re-running the same day just refreshes values.
 */
export async function collectAll(): Promise<CollectResult[]> {
  const sources = await getEnabledSources();
  const ctx = { githubToken: GITHUB_TOKEN || undefined };
  const results: CollectResult[] = [];

  for (const src of sources) {
    const def = getSourceType(src.type);
    if (!def) {
      await markCollected(src.id, "error: unknown source type", Date.now());
      results.push({
        sourceId: src.id,
        label: src.label,
        type: src.type,
        ok: false,
        points: 0,
        error: `Unknown source type "${src.type}"`,
      });
      continue;
    }

    try {
      const points = await def.collect(src.config, ctx);
      const n = points.length ? await bulkUpsert(src.id, points) : 0;
      await markCollected(src.id, "ok", Date.now());
      results.push({
        sourceId: src.id,
        label: src.label,
        type: src.type,
        ok: true,
        points: n,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markCollected(src.id, `error: ${message}`.slice(0, 240), Date.now());
      results.push({
        sourceId: src.id,
        label: src.label,
        type: src.type,
        ok: false,
        points: 0,
        error: message,
      });
    }
  }

  return results;
}

/**
 * One-time historical backfill for sources whose adapter supports it (e.g.
 * GitHub stars/forks over time). Idempotent — safe to re-run.
 */
export async function backfillAll(): Promise<CollectResult[]> {
  const sources = await getEnabledSources();
  const ctx = { githubToken: GITHUB_TOKEN || undefined };
  const results: CollectResult[] = [];

  for (const src of sources) {
    const def = getSourceType(src.type);
    if (!def?.backfill) continue; // nothing historical to reconstruct
    try {
      const points = await def.backfill(src.config, ctx);
      const n = points.length ? await bulkUpsert(src.id, points) : 0;
      results.push({
        sourceId: src.id,
        label: src.label,
        type: src.type,
        ok: true,
        points: n,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        sourceId: src.id,
        label: src.label,
        type: src.type,
        ok: false,
        points: 0,
        error: message,
      });
    }
  }

  return results;
}
