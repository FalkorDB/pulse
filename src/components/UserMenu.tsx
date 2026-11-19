"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

function initials(name: string | null, email: string): string {
  const base = name?.trim() || email;
  const parts = base.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export function UserMenu({
  user,
}: {
  user: { name: string | null; email: string; image: string | null };
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-fg"
      >
        {initials(user.name, user.email)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-border bg-surface p-1 shadow-lg">
            <div className="px-3 py-2">
              <div className="truncate text-sm font-medium text-fg">
                {user.name ?? "FalkorDB"}
              </div>
              <div className="truncate text-xs text-muted">{user.email}</div>
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-secondary transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
