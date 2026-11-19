import { z } from "zod";
import { deleteSource, updateSource } from "@/lib/db/sources";
import { handle, HttpError, ok, requireUser } from "@/lib/api";

const patchSchema = z.object({
  label: z.string().min(1).optional(),
  config: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    const patch = patchSchema.parse(await req.json());
    const source = await updateSource(id, patch);
    if (!source) throw new HttpError(404, "Source not found");
    return ok({ source });
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    await deleteSource(id);
    return ok({ ok: true });
  });
}
