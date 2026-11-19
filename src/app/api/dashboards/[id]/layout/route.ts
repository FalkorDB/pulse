import { z } from "zod";
import { saveLayout } from "@/lib/db/dashboards";
import { handle, ok, requireUser } from "@/lib/api";

const layoutSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      x: z.number().int().min(0),
      y: z.number().int().min(0),
      w: z.number().int().min(1),
      h: z.number().int().min(1),
    }),
  ),
});

/** Persist the drag/resize layout for all widgets on a dashboard. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    const { items } = layoutSchema.parse(await req.json());
    await saveLayout(id, items);
    return ok({ ok: true });
  });
}
