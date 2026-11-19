import { backfillAll } from "@/lib/collector";
import { handle, ok, requireUser } from "@/lib/api";

// One-time historical reconstruction (GitHub stars/forks over time), triggered
// by a signed-in user from the UI. Can be slow for large repos, so give it room.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST() {
  return handle(async () => {
    await requireUser();
    const started = Date.now();
    const results = await backfillAll();
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
