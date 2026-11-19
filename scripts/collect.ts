import "./loadEnv";
import { ensureSchema } from "../src/lib/db/schema";
import { collectAll } from "../src/lib/collector";

/**
 * Run the collector once against every enabled source. Mirrors what the Vercel
 * cron hits at /api/collect.
 *
 * Run: npm run collect
 */
async function main() {
  await ensureSchema();
  console.log("Collecting metrics…\n");
  const results = await collectAll();
  for (const r of results) {
    const status = r.ok ? `✓ ${r.points} pts` : `✗ ${r.error}`;
    console.log(`${status.padEnd(28)} ${r.label} [${r.type}]`);
  }
  const total = results.reduce((n, r) => n + r.points, 0);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length} sources, ${total} datapoints, ${failed} failed.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("collect failed:", err);
  process.exit(1);
});
