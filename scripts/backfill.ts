import "./loadEnv";
import { ensureSchema } from "../src/lib/db/schema";
import { getEnabledSources } from "../src/lib/db/sources";
import { getSeries, bulkUpsert } from "../src/lib/db/snapshots";
import { getSourceType } from "../src/lib/metrics/registry";
import { dayStartMs } from "../src/lib/ids";

/**
 * DEV ONLY — synthesize plausible historical data so local dashboards look alive
 * before real history accumulates. Only fills metrics that have exactly ONE real
 * datapoint (i.e. a single snapshot from `npm run collect`); it never overwrites
 * real multi-day history (e.g. PyPI's ~180 real days). Do NOT run in production.
 *
 * Run: npm run collect && npm run backfill
 */
const DAYS = 120;

function synth(current: number, kind: string, days: number): number[] {
  // Starting value as a fraction of the current value, by metric behaviour.
  const startFactor = kind === "cumulative" ? 0.5 : kind === "level" ? 0.65 : 0.5;
  const start = Math.max(0, current * startFactor);
  const out: number[] = [];
  for (let i = 0; i < days; i++) {
    const t = i / (days - 1); // 0 → 1
    const base = start + (current - start) * t;
    const noise = kind === "cumulative" ? 0 : base * 0.03 * (Math.random() - 0.5);
    out.push(Math.max(0, Math.round(base + noise)));
  }
  out[out.length - 1] = current; // land exactly on the real value
  return out;
}

async function main() {
  await ensureSchema();
  console.warn("⚠️  DEMO BACKFILL — synthetic data for local dev only.\n");
  const sources = await getEnabledSources();
  let filled = 0;

  for (const src of sources) {
    const def = getSourceType(src.type);
    if (!def) continue;
    for (const metric of def.metrics) {
      const existing = await getSeries(src.id, metric.key);
      if (existing.length !== 1) continue; // only anchor off a single snapshot
      const current = existing[0].value;
      const values = synth(current, metric.kind, DAYS);
      const now = Date.now();
      const points = values.map((value, i) => {
        const ts = dayStartMs(now - (DAYS - 1 - i) * 86_400_000);
        return {
          metric: metric.key,
          day: new Date(ts).toISOString().slice(0, 10),
          ts,
          value,
        };
      });
      await bulkUpsert(src.id, points);
      filled++;
      console.log(`✓ ${src.label} · ${metric.label} (${DAYS}d synthetic)`);
    }
  }
  console.log(`\nDone. Backfilled ${filled} metric series.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("backfill failed:", err);
  process.exit(1);
});
