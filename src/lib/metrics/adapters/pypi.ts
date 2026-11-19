import { dayStartMs } from "@/lib/ids";
import type { CollectedPoint, SourceTypeDef } from "../adapter";

interface OverallResponse {
  data?: Array<{ category: string; date: string; downloads: number }>;
}

export const pypiPackage: SourceTypeDef = {
  type: "pypi_package",
  label: "PyPI Package",
  description:
    "Daily download counts for a PyPI package (via pypistats). Backfills roughly the last 180 days on first collection.",
  icon: "Package",
  configFields: [
    {
      name: "package",
      label: "Package name",
      placeholder: "falkordb",
      required: true,
      help: "The name on pypi.org, e.g. falkordb.",
    },
  ],
  metrics: [{ key: "downloads", label: "Downloads", kind: "incremental", unit: "downloads" }],
  defaultLabel: (c) => `PyPI · ${c.package}`,

  async collect(config): Promise<CollectedPoint[]> {
    const pkg = config.package;
    const res = await fetch(
      `https://pypistats.org/api/packages/${encodeURIComponent(pkg)}/overall?mirrors=false`,
      { headers: { "User-Agent": "falkordb-pulse", Accept: "application/json" } },
    );
    if (!res.ok) {
      throw new Error(`pypistats ${pkg} returned ${res.status} ${res.statusText}`);
    }
    const body = (await res.json()) as OverallResponse;
    const points: CollectedPoint[] = [];
    for (const row of body.data ?? []) {
      // mirrors=false still returns the "without_mirrors" category; be defensive.
      if (row.category !== "without_mirrors") continue;
      points.push({
        metric: "downloads",
        day: row.date,
        ts: dayStartMs(row.date),
        value: row.downloads ?? 0,
      });
    }
    return points;
  },
};
