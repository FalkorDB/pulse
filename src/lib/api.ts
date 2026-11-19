import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

/** The signed-in user's email (our stable user id), or null if unauthenticated. */
export async function currentUserEmail(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email ?? session?.user?.id ?? null;
  return email ? email.toLowerCase() : null;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Resolve the current user or throw a 401 that `handle()` turns into a response. */
export async function requireUser(): Promise<string> {
  const email = await currentUserEmail();
  if (!email) throw new HttpError(401, "Not authenticated");
  return email;
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

/** Wrap a route body so thrown HttpErrors become clean JSON responses. */
export async function handle(
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api] unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
