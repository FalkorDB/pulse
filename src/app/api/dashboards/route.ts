import { z } from "zod";
import {
  addWidget,
  createDashboard,
  ensureDefaultDashboard,
  listDashboards,
} from "@/lib/db/dashboards";
import { getEnabledSources } from "@/lib/db/sources";
import { getSourceType } from "@/lib/metrics/registry";
import { defaultAggregation } from "@/lib/metrics/aggregations";
import { handle, ok, requireUser } from "@/lib/api";

/**
 * Build a sensible starter dashboard the first time a user signs in: a row of
 * stat tiles across the top, then a chart per source below.
 */
async function seedStarterWidgets(dashboardId: string): Promise<void> {
  const sources = (await getEnabledSources()).slice(0, 4);
  let chartIndex = 0;
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const def = getSourceType(src.type);
    const primary = def?.metrics[0];
    if (!def || !primary) continue;
    const agg = defaultAggregation(primary.kind);

    // Top row: compact stat tiles.
    await addWidget(dashboardId, {
      viz: "stat",
      title: `${src.label} · ${primary.label}`,
      sourceId: src.id,
      metric: primary.key,
      agg,
      rangeDays: 90,
      color: null,
      x: (i % 4) * 3,
      y: 0,
      w: 3,
      h: 4,
    });

    // Below: a time-series chart, two per row.
    await addWidget(dashboardId, {
      viz: primary.kind === "level" ? "line" : "area",
      title: `${src.label} · ${primary.label}`,
      sourceId: src.id,
      metric: primary.key,
      agg,
      rangeDays: 90,
      color: null,
      x: (chartIndex % 2) * 6,
      y: 4 + Math.floor(chartIndex / 2) * 9,
      w: 6,
      h: 9,
    });
    chartIndex++;
  }
}

export async function GET() {
  return handle(async () => {
    const email = await requireUser();
    let dashboards = await listDashboards(email);
    if (dashboards.length === 0) {
      const dash = await ensureDefaultDashboard(email);
      await seedStarterWidgets(dash.id);
      dashboards = await listDashboards(email);
    }
    return ok({ dashboards });
  });
}

const createSchema = z.object({ name: z.string().min(1).max(80) });

export async function POST(req: Request) {
  return handle(async () => {
    const email = await requireUser();
    const { name } = createSchema.parse(await req.json());
    const dashboard = await createDashboard(email, name);
    return ok({ dashboard }, { status: 201 });
  });
}
