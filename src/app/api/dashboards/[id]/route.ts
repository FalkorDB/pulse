import { z } from "zod";
import { deleteDashboard, renameDashboard } from "@/lib/db/dashboards";
import { handle, ok, requireUser } from "@/lib/api";

const patchSchema = z.object({ name: z.string().min(1).max(80) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    const { name } = patchSchema.parse(await req.json());
    await renameDashboard(id, name);
    return ok({ ok: true });
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    await deleteDashboard(id);
    return ok({ ok: true });
  });
}
