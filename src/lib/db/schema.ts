import "server-only";
import { getGraph, query } from "../falkordb";

/**
 * Index + constraint bootstrap. Idempotent: safe to call on every cold start.
 * FalkorDB throws if an index/constraint already exists, so we swallow those.
 */
const INDICES = [
  "CREATE INDEX FOR (u:User) ON (u.email)",
  "CREATE INDEX FOR (d:Dashboard) ON (d.id)",
  "CREATE INDEX FOR (d:Dashboard) ON (d.ownerEmail)",
  "CREATE INDEX FOR (w:Widget) ON (w.id)",
  "CREATE INDEX FOR (s:Source) ON (s.id)",
  "CREATE INDEX FOR (p:Datapoint) ON (p.metric)",
  "CREATE INDEX FOR (p:Datapoint) ON (p.day)",
];

let bootstrapped: Promise<void> | null = null;

async function doBootstrap(): Promise<void> {
  const graph = await getGraph();
  for (const stmt of INDICES) {
    try {
      await graph.query(stmt);
    } catch (err) {
      const msg = String(err);
      if (!/already|exist/i.test(msg)) {
        // Unexpected error — log but don't crash the request.
        console.warn("[schema] index create failed:", stmt, msg);
      }
    }
  }
}

/** Ensure indices exist; memoised per process. */
export async function ensureSchema(): Promise<void> {
  if (!bootstrapped) bootstrapped = doBootstrap();
  return bootstrapped;
}

/** Danger: wipe the entire graph. Used only by seed/reset scripts. */
export async function resetGraph(): Promise<void> {
  await query("MATCH (n) DETACH DELETE n");
}
