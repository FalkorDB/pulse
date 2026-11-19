import { NextResponse } from "next/server";
import { collectAll } from "@/lib/collector";
import { COLLECT_SECRET } from "@/lib/env";

// Collection can hit several external APIs; give it room (Vercel caps at 60s on
// the Hobby plan).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function run(req: Request): Promise<NextResponse> {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Also accept
  // `?secret=` for manual triggering.
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.replace(/^Bearer\s+/i, "");
  const url = new URL(req.url);
  const provided = bearer || url.searchParams.get("secret") || "";

  if (COLLECT_SECRET && provided !== COLLECT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const results = await collectAll();
  const points = results.reduce((n, r) => n + r.points, 0);
  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - started,
    sources: results.length,
    points,
    results,
  });
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
