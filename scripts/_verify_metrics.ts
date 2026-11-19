import "./loadEnv";
import { listSources } from "../src/lib/db/sources";
import { getSeries } from "../src/lib/db/snapshots";
import { getMetricDef } from "../src/lib/metrics/registry";
import { aggregate, summarize } from "../src/lib/metrics/aggregations";
import { dayKey } from "../src/lib/ids";

// Temp verifier: exercises the exact server path /api/metrics/query uses.
async function main() {
  const sources = await listSources();
  const from = dayKey(Date.now() - 365 * 86_400_000);

  const gh = sources.find((s) => s.label === "FalkorDB/FalkorDB")!;
  const raw = await getSeries(gh.id, "stars", from);
  const kind = getMetricDef(gh.type, "stars")!.kind;
  const summary = summarize(raw, aggregate(raw, "raw", kind), kind);
  console.log(
    `stars(1y): ${raw.length} pts | first ${JSON.stringify(raw[0])} last ${JSON.stringify(raw[raw.length - 1])}`,
  );
  console.log("stars summary:", JSON.stringify(summary));

  const pypi = sources.find((s) => s.type === "pypi_package")!;
  const praw = await getSeries(pypi.id, "downloads", from);
  const cum = aggregate(praw, "cumsum", "incremental");
  console.log(
    `pypi downloads: ${praw.length} days | cumsum last ${JSON.stringify(cum[cum.length - 1])}`,
  );

  const dbe = sources.find((s) => s.type === "dbengines_system")!;
  const rank = await getSeries(dbe.id, "rank");
  const score = await getSeries(dbe.id, "score");
  console.log(`db-engines: rank ${JSON.stringify(rank)} score ${JSON.stringify(score)}`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
