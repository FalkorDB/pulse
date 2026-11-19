import "./loadEnv";
import { ensureSchema } from "../src/lib/db/schema";
import { backfillAll } from "../src/lib/collector";

/**
 * Reconstruct real historical data where an adapter supports it (GitHub
 * stars/forks over time). Idempotent. A GH_TOKEN is strongly recommended.
 *
 * Run: npm run backfill:history
 */
async function main() {
  await ensureSchema();
  console.log("Reconstructing historical data…\n");
  const results = await backfillAll();
  if (results.length === 0) {
    console.log("No sources with historical support are enabled.");
  }
  for (const r of results) {
    const status = r.ok ? `✓ ${r.points} pts` : `✗ ${r.error}`;
    console.log(`${status.padEnd(28)} ${r.label} [${r.type}]`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("backfill:history failed:", err);
  process.exit(1);
});
