import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { ALLOWED_DOMAIN } from "@/lib/env";
import { upsertUser } from "@/lib/db/users";

/**
 * Full server-side auth config. Runs in the Node runtime (the FalkorDB client
 * here is Node-only), so this file must never be imported by the middleware.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    // Hard domain restriction: only company Google accounts may sign in.
    async signIn({ profile, user }) {
      const email = (profile?.email ?? user?.email ?? "").toLowerCase();
      const hd = (profile as { hd?: string } | null | undefined)?.hd;
      const allowed =
        email.endsWith("@" + ALLOWED_DOMAIN) || hd === ALLOWED_DOMAIN;
      if (!allowed) return false;

      // Provision / refresh the user record. A transient DB hiccup shouldn't
      // lock an authorised employee out, so we never fail sign-in on write error.
      try {
        await upsertUser({
          email,
          name: profile?.name ?? user?.name ?? null,
          image:
            (profile as { picture?: string } | null | undefined)?.picture ??
            user?.image ??
            null,
        });
      } catch (err) {
        console.error("[auth] upsertUser failed:", err);
      }
      return true;
    },

    async jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email.toLowerCase();
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.email as string) ?? session.user.email;
      }
      return session;
    },
  },
});
