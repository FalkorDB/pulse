import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge middleware uses ONLY the edge-safe config (no DB imports).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Protect all page routes. API routes self-guard; auth endpoints, the login
  // page, and static assets are excluded.
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico).*)"],
};
