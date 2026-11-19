import { z } from "zod";
import { deleteWidget, updateWidget } from "@/lib/db/dashboards";
import { handle, HttpError, ok, requireUser } from "@/lib/api";

const patchSchema = z.object({
  viz: z.enum(["stat", "line", "area", "bar"]).optional(),
  title: z.string().min(1).max(120).optional(),
  sourceId: z.string().min(1).optional(),
  metric: z.string().min(1).optional(),
  agg: z
    .enum(["latest", "raw", "cumsum", "sum", "delta", "rolling7", "rolling30"])
    .optional(),
  rangeDays: z.number().int().positive().max(1825).optional(),
  color: z.string().nullable().optional(),
  x: z.number().int().min(0).optional(),
  y: z.number().int().min(0).optional(),
  w: z.number().int().min(1).optional(),
  h: z.number().int().min(1).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    const patch = patchSchema.parse(await req.json());
    const widget = await updateWidget(id, patch);
    if (!widget) throw new HttpError(404, "Widget not found");
    return ok({ widget });
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    await deleteWidget(id);
    return ok({ ok: true });
  });
}
