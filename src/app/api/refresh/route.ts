import { collectAll } from "@/lib/collector";
import { handle, ok, requireUser } from "@/lib/api";

// Manual "collect now" triggered by a signed-in user from the UI. The scheduled
// cron uses /api/collect (secret-guarded); this one is session-guarded.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST() {
  return handle(async () => {
    await requireUser();
    const started = Date.now();
    const results = await collectAll();
    const points = results.reduce((n, r) => n + r.points, 0);
    return ok({
      ok: true,
      durationMs: Date.now() - started,
      sources: results.length,
      points,
      results,
    });
  });
}
