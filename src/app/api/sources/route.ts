import { z } from "zod";
import { createSource, listSources } from "@/lib/db/sources";
import { getSourceType } from "@/lib/metrics/registry";
import { handle, HttpError, ok, requireUser } from "@/lib/api";

export async function GET() {
  return handle(async () => {
    await requireUser();
    const sources = await listSources();
    return ok({ sources });
  });
}

const createSchema = z.object({
  type: z.string().min(1),
  config: z.record(z.string(), z.string()),
  label: z.string().optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const email = await requireUser();
    const body = createSchema.parse(await req.json());
    const def = getSourceType(body.type);
    if (!def) throw new HttpError(400, `Unknown source type "${body.type}"`);

    // Validate required config fields are present.
    for (const field of def.configFields) {
      if (field.required && !body.config[field.name]?.trim()) {
        throw new HttpError(400, `Missing required field "${field.label}"`);
      }
    }

    const label = body.label?.trim() || def.defaultLabel(body.config);
    const source = await createSource({
      type: body.type,
      label,
      config: body.config,
      createdBy: email,
    });
    return ok({ source }, { status: 201 });
  });
}
