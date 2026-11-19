import https from "node:https";
import { dayKey, dayStartMs } from "@/lib/ids";
import type { CollectedPoint, SourceTypeDef } from "../adapter";

/**
 * db-engines.com serves an incomplete TLS chain (leaf cert only), which Node's
 * fetch rejects even though browsers/curl accept it (they carry the missing
 * intermediate). We read a public ranking page and send no credentials, so for
 * this host we tolerate the broken chain via Node's https module. Follows up to
 * a few redirects.
 */
function fetchHtml(url: string, redirects = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        rejectUnauthorized: false,
        headers: {
          "User-Agent": "Mozilla/5.0 (falkordb-pulse)",
          Accept: "text/html",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location && redirects < 3) {
          res.resume();
          resolve(fetchHtml(new URL(location, url).toString(), redirects + 1));
          return;
        }
        if (status >= 400) {
          res.resume();
          reject(new Error(`DB-Engines returned ${status}`));
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      },
    );
    req.on("error", reject);
    req.setTimeout(15_000, () => req.destroy(new Error("DB-Engines timed out")));
  });
}

/**
 * DB-Engines ranking for a database system (e.g. FalkorDB). DB-Engines has no
 * public API, so we parse the public system page. Values update monthly; daily
 * snapshots build the trend over time.
 */
export const dbEnginesSystem: SourceTypeDef = {
  type: "dbengines_system",
  label: "DB-Engines Ranking",
  description:
    "DB-Engines ranking score and overall rank for a database system. Updated monthly; parsed from the public db-engines.com system page.",
  icon: "Database",
  configFields: [
    {
      name: "system",
      label: "System",
      placeholder: "FalkorDB",
      required: true,
      help: "Name as it appears in db-engines.com/en/system/<name>",
    },
  ],
  metrics: [
    { key: "score", label: "DB-Engines Score", kind: "level", unit: "score" },
    { key: "rank", label: "Overall Rank", kind: "level", unit: "#" },
  ],
  defaultLabel: (c) => `DB-Engines · ${c.system}`,

  async collect(config): Promise<CollectedPoint[]> {
    const system = config.system;
    const html = await fetchHtml(
      `https://db-engines.com/en/system/${encodeURIComponent(system)}`,
    );
    const day = dayKey();
    const ts = dayStartMs();
    const points: CollectedPoint[] = [];

    // Page markup: <th ...>Score<td ...>0.37  and  <th ...>Rank<td ...>#269
    const score = html.match(/Score<td[^>]*>\s*([0-9]+(?:\.[0-9]+)?)/i);
    const rank = html.match(/Rank<td[^>]*>\s*#?\s*([0-9]+)/i);
    if (score) {
      points.push({ metric: "score", day, ts, value: parseFloat(score[1]) });
    }
    if (rank) {
      points.push({ metric: "rank", day, ts, value: parseInt(rank[1], 10) });
    }
    if (points.length === 0) {
      throw new Error(
        `Could not parse DB-Engines score/rank for "${system}" (page layout may have changed)`,
      );
    }
    return points;
  },
};
