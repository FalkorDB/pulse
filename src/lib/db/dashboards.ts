import "server-only";
import { query, queryOne } from "@/lib/falkordb";
import { newId } from "@/lib/ids";
import { ensureSchema } from "@/lib/db/schema";
import type {
  Aggregation,
  DashboardRecord,
  VizType,
  WidgetRecord,
} from "@/lib/types";

type NodeVal = { properties: Record<string, unknown> };

const num = (v: unknown, fallback: number): number =>
  v === null || v === undefined ? fallback : Number(v);

export function rowToWidget(props: Record<string, unknown>): WidgetRecord {
  return {
    id: String(props.id),
    dashboardId: String(props.dashboardId ?? ""),
    viz: (props.viz as VizType) ?? "stat",
    title: String(props.title ?? ""),
    sourceId: String(props.sourceId ?? ""),
    metric: String(props.metric ?? ""),
    agg: (props.agg as Aggregation) ?? "latest",
    rangeDays: num(props.rangeDays, 90),
    color: props.color == null ? null : String(props.color),
    x: num(props.x, 0),
    y: num(props.y, 0),
    w: num(props.w, 4),
    h: num(props.h, 5),
    order: num(props.order, 0),
  };
}

export function rowToDashboard(
  props: Record<string, unknown>,
  widgetNodes: NodeVal[],
): DashboardRecord {
  return {
    id: String(props.id),
    ownerEmail: String(props.ownerEmail ?? ""),
    name: String(props.name ?? "Untitled"),
    order: num(props.order, 0),
    createdAt: num(props.createdAt, 0),
    widgets: (widgetNodes ?? [])
      .filter((w) => w && w.properties)
      .map((w) => rowToWidget(w.properties)),
  };
}

export async function listDashboards(
  ownerEmail: string,
): Promise<DashboardRecord[]> {
  await ensureSchema();
  const rows = await query<{ d: NodeVal; ws: NodeVal[] }>(
    `MATCH (u:User {email: $email})-[:OWNS]->(d:Dashboard)
     OPTIONAL MATCH (d)-[:HAS]->(w:Widget)
     WITH d, w ORDER BY d.order, w.order
     WITH d, collect(w) AS ws
     RETURN d, ws ORDER BY d.order`,
    { email: ownerEmail.toLowerCase() },
  );
  return rows.map((r) => rowToDashboard(r.d.properties, r.ws));
}

export async function getDashboard(
  id: string,
): Promise<DashboardRecord | null> {
  await ensureSchema();
  const row = await queryOne<{ d: NodeVal; ws: NodeVal[] }>(
    `MATCH (d:Dashboard {id: $id})
     OPTIONAL MATCH (d)-[:HAS]->(w:Widget)
     WITH d, w ORDER BY w.order
     WITH d, collect(w) AS ws
     RETURN d, ws`,
    { id },
  );
  return row ? rowToDashboard(row.d.properties, row.ws) : null;
}

export async function createDashboard(
  ownerEmail: string,
  name: string,
): Promise<DashboardRecord> {
  await ensureSchema();
  const email = ownerEmail.toLowerCase();
  const id = newId("dash");
  const row = await queryOne<{ d: NodeVal }>(
    `MERGE (u:User {email: $email})
     WITH u
     OPTIONAL MATCH (u)-[:OWNS]->(existing:Dashboard)
     WITH u, count(existing) AS cnt
     CREATE (u)-[:OWNS]->(d:Dashboard {
       id: $id, ownerEmail: $email, name: $name, order: cnt, createdAt: timestamp()
     })
     RETURN d`,
    { email, id, name },
  );
  return rowToDashboard(row!.d.properties, []);
}

export async function renameDashboard(id: string, name: string): Promise<void> {
  await ensureSchema();
  await query(`MATCH (d:Dashboard {id: $id}) SET d.name = $name`, { id, name });
}

export async function deleteDashboard(id: string): Promise<void> {
  await ensureSchema();
  await query(
    `MATCH (d:Dashboard {id: $id})
     OPTIONAL MATCH (d)-[:HAS]->(w:Widget)
     DETACH DELETE d, w`,
    { id },
  );
}

/** Return the user's first dashboard, creating an "Overview" one if none exist. */
export async function ensureDefaultDashboard(
  ownerEmail: string,
): Promise<DashboardRecord> {
  const existing = await listDashboards(ownerEmail);
  if (existing.length > 0) return existing[0];
  return createDashboard(ownerEmail, "Overview");
}

export async function addWidget(
  dashboardId: string,
  input: {
    viz: VizType;
    title: string;
    sourceId: string;
    metric: string;
    agg: Aggregation;
    rangeDays: number;
    color?: string | null;
    x: number;
    y: number;
    w: number;
    h: number;
  },
): Promise<WidgetRecord> {
  await ensureSchema();
  const id = newId("wid");
  const row = await queryOne<{ wid: NodeVal }>(
    `MATCH (d:Dashboard {id: $dashboardId})
     OPTIONAL MATCH (d)-[:HAS]->(ex:Widget)
     WITH d, count(ex) AS cnt
     CREATE (d)-[:HAS]->(wid:Widget {
       id: $id, dashboardId: $dashboardId, viz: $viz, title: $title,
       sourceId: $sourceId, metric: $metric, agg: $agg, rangeDays: $rangeDays,
       x: $x, y: $y, w: $w, h: $h, order: cnt
     })
     SET wid.color = $color
     RETURN wid`,
    {
      dashboardId,
      id,
      viz: input.viz,
      title: input.title,
      sourceId: input.sourceId,
      metric: input.metric,
      agg: input.agg,
      rangeDays: input.rangeDays,
      color: input.color ?? null,
      x: input.x,
      y: input.y,
      w: input.w,
      h: input.h,
    },
  );
  // Link the widget to its source (no-op if the source id is unknown).
  await query(
    `MATCH (wid:Widget {id: $id}), (s:Source {id: $sourceId})
     MERGE (wid)-[:SHOWS]->(s)`,
    { id, sourceId: input.sourceId },
  );
  return rowToWidget(row!.wid.properties);
}

export async function updateWidget(
  id: string,
  patch: Partial<{
    viz: VizType;
    title: string;
    sourceId: string;
    metric: string;
    agg: Aggregation;
    rangeDays: number;
    color: string | null;
    x: number;
    y: number;
    w: number;
    h: number;
  }>,
): Promise<WidgetRecord | null> {
  await ensureSchema();
  const row = await queryOne<{ wid: NodeVal }>(
    `MATCH (wid:Widget {id: $id})
     SET wid.viz       = coalesce($viz, wid.viz),
         wid.title     = coalesce($title, wid.title),
         wid.sourceId  = coalesce($sourceId, wid.sourceId),
         wid.metric    = coalesce($metric, wid.metric),
         wid.agg       = coalesce($agg, wid.agg),
         wid.rangeDays = coalesce($rangeDays, wid.rangeDays),
         wid.color     = coalesce($color, wid.color),
         wid.x         = coalesce($x, wid.x),
         wid.y         = coalesce($y, wid.y),
         wid.w         = coalesce($w, wid.w),
         wid.h         = coalesce($h, wid.h)
     RETURN wid`,
    {
      id,
      viz: patch.viz ?? null,
      title: patch.title ?? null,
      sourceId: patch.sourceId ?? null,
      metric: patch.metric ?? null,
      agg: patch.agg ?? null,
      rangeDays: patch.rangeDays ?? null,
      color: patch.color ?? null,
      x: patch.x ?? null,
      y: patch.y ?? null,
      w: patch.w ?? null,
      h: patch.h ?? null,
    },
  );
  if (!row) return null;

  // If the source changed, rewire the SHOWS relationship.
  if (patch.sourceId !== undefined) {
    await query(
      `MATCH (wid:Widget {id: $id})
       OPTIONAL MATCH (wid)-[r:SHOWS]->()
       DELETE r
       WITH wid
       OPTIONAL MATCH (s:Source {id: $sourceId})
       FOREACH (_ IN CASE WHEN s IS NULL THEN [] ELSE [1] END |
         MERGE (wid)-[:SHOWS]->(s))`,
      { id, sourceId: patch.sourceId },
    );
  }
  return rowToWidget(row.wid.properties);
}

export async function deleteWidget(id: string): Promise<void> {
  await ensureSchema();
  await query(`MATCH (wid:Widget {id: $id}) DETACH DELETE wid`, { id });
}

/** Persist grid positions/sizes after a drag or resize. */
export async function saveLayout(
  dashboardId: string,
  items: { id: string; x: number; y: number; w: number; h: number }[],
): Promise<void> {
  if (items.length === 0) return;
  await ensureSchema();
  await query(
    `UNWIND $items AS it
     MATCH (d:Dashboard {id: $dashboardId})-[:HAS]->(wid:Widget {id: it.id})
     SET wid.x = it.x, wid.y = it.y, wid.w = it.w, wid.h = it.h`,
    { dashboardId, items },
  );
}
