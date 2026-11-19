/**
 * Seed a few real FalkorDB sources into the graph. Idempotent (MERGE on
 * type+label). Standalone: talks to FalkorDB directly, so it needs no running
 * app. Run with: npm run seed
 */
import { FalkorDB } from "falkordb";
import { randomUUID } from "crypto";

const SOURCES = [
  { type: "github_repo", label: "FalkorDB/FalkorDB", config: { owner: "FalkorDB", repo: "FalkorDB" } },
  { type: "github_repo", label: "FalkorDB/QueryWeaver", config: { owner: "FalkorDB", repo: "QueryWeaver" } },
  { type: "pypi_package", label: "PyPI · falkordb", config: { package: "falkordb" } },
  { type: "dockerhub_image", label: "falkordb/falkordb", config: { namespace: "falkordb", repo: "falkordb" } },
  { type: "dbengines_system", label: "DB-Engines · FalkorDB", config: { system: "FalkorDB" } },
];

async function main() {
  const db = await FalkorDB.connect({
    socket: {
      host: process.env.FALKORDB_HOST ?? "localhost",
      port: Number(process.env.FALKORDB_PORT ?? 6379),
    },
    password: process.env.FALKORDB_PASSWORD || undefined,
  });
  const g = db.selectGraph(process.env.FALKORDB_GRAPH ?? "pulse");

  for (const stmt of [
    "CREATE INDEX FOR (s:Source) ON (s.id)",
    "CREATE INDEX FOR (p:Datapoint) ON (p.metric)",
    "CREATE INDEX FOR (p:Datapoint) ON (p.day)",
  ]) {
    try {
      await g.query(stmt);
    } catch {
      /* already exists */
    }
  }

  for (const s of SOURCES) {
    await g.query(
      `MERGE (s:Source {type: $type, label: $label})
       ON CREATE SET s.id = $id, s.createdAt = timestamp(), s.createdBy = 'seed'
       SET s.configJson = $configJson, s.enabled = true`,
      {
        params: {
          type: s.type,
          label: s.label,
          id: "src_" + randomUUID().replace(/-/g, "").slice(0, 20),
          configJson: JSON.stringify(s.config),
        },
      },
    );
    console.log("  ✓ seeded", s.label);
  }

  const res = await g.query<{ n: number }>("MATCH (s:Source) RETURN count(s) AS n");
  console.log("Total sources in graph:", res.data?.[0]?.n);
  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
