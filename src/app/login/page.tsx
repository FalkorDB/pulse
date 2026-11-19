import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ALLOWED_DOMAIN } from "@/lib/env";
import { Logo } from "@/components/Logo";
import { LoginButton } from "@/components/LoginButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <Logo />
          <h1 className="mt-6 text-xl font-semibold tracking-tight text-fg">
            Sign in
          </h1>
          <p className="mt-1.5 text-sm text-secondary">
            FalkorDB&apos;s business-metrics dashboards — GitHub, PyPI, DockerHub
            and more, tracked over time.
          </p>

          {error && (
            <div className="mt-5 rounded-lg border border-[rgb(var(--bad))]/30 bg-[rgb(var(--bad))]/10 px-3.5 py-2.5 text-sm text-[rgb(var(--bad))]">
              {error === "AccessDenied"
                ? `Only @${ALLOWED_DOMAIN} Google accounts can access Pulse.`
                : "Something went wrong signing in. Please try again."}
            </div>
          )}

          <div className="mt-6">
            <LoginButton />
          </div>

          <p className="mt-4 text-center text-xs text-muted">
            Restricted to <span className="font-medium">@{ALLOWED_DOMAIN}</span>{" "}
            accounts
          </p>
        </div>
      </div>
    </main>
  );
}
