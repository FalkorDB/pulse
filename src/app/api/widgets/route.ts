import { z } from "zod";
import { addWidget } from "@/lib/db/dashboards";
import { handle, ok, requireUser } from "@/lib/api";

const vizEnum = z.enum(["stat", "line", "area", "bar"]);
const aggEnum = z.enum([
  "latest",
  "raw",
  "cumsum",
  "sum",
  "delta",
  "rolling7",
  "rolling30",
]);

const createSchema = z.object({
  dashboardId: z.string().min(1),
  viz: vizEnum,
  title: z.string().min(1).max(120),
  sourceId: z.string().min(1),
  metric: z.string().min(1),
  agg: aggEnum,
  rangeDays: z.number().int().positive().max(1825).default(90),
  color: z.string().nullable().optional(),
  x: z.number().int().min(0).default(0),
  y: z.number().int().min(0).default(1000),
  w: z.number().int().min(1).default(6),
  h: z.number().int().min(1).default(8),
});

export async function POST(req: Request) {
  return handle(async () => {
    await requireUser();
    const body = createSchema.parse(await req.json());
    const { dashboardId, ...input } = body;
    const widget = await addWidget(dashboardId, {
      ...input,
      color: input.color ?? null,
    });
    return ok({ widget }, { status: 201 });
  });
}
