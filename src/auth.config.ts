import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { ALLOWED_DOMAIN } from "@/lib/env";

/**
 * Edge-safe auth config shared by the middleware and the full server config.
 * MUST NOT import anything that pulls in Node-only code (e.g. the FalkorDB
 * client) — the middleware runs on the edge runtime.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Google({
      authorization: {
        params: {
          // Hint Google to restrict the account chooser to the company domain.
          // (Real enforcement happens in the `signIn` callback in auth.ts.)
          hd: ALLOWED_DOMAIN,
          prompt: "select_account",
          access_type: "offline",
        },
      },
    }),
  ],
  callbacks: {
    // Gate every matched page route: anonymous users get redirected to /login.
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
