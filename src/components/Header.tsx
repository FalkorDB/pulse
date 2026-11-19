"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Database, Plus, SlidersHorizontal, X } from "lucide-react";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./theme";
import { Button } from "./ui";
import type { DashboardRecord } from "@/lib/types";

export function Header({
  user,
  dashboards,
  activeId,
  onSelect,
  onCreateDashboard,
  onRenameDashboard,
  onDeleteDashboard,
  editMode,
  onToggleEdit,
  onAddWidget,
  onManageSources,
}: {
  user: { name: string | null; email: string; image: string | null };
  dashboards: DashboardRecord[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreateDashboard: () => void;
  onRenameDashboard: (id: string, name: string) => void;
  onDeleteDashboard: (id: string) => void;
  editMode: boolean;
  onToggleEdit: () => void;
  onAddWidget: () => void;
  onManageSources: () => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) inputRef.current?.focus();
  }, [renamingId]);

  function startRename(d: DashboardRecord) {
    setRenamingId(d.id);
    setRenameValue(d.name);
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      onRenameDashboard(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <Logo />

        {/* Dashboard tabs */}
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {dashboards.map((d) =>
            renamingId === d.id ? (
              <input
                key={d.id}
                ref={inputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenamingId(null);
                }}
                className="h-8 w-32 rounded-lg border border-accent bg-surface px-2 text-sm text-fg outline-none"
              />
            ) : (
              <div key={d.id} className="group relative shrink-0">
                <button
                  type="button"
                  onClick={() => onSelect(d.id)}
                  onDoubleClick={() => startRename(d)}
                  title="Double-click to rename"
                  className={`h-8 rounded-lg px-3 text-sm font-medium transition-colors ${
                    d.id === activeId
                      ? "bg-surface-2 text-fg"
                      : "text-secondary hover:text-fg"
                  }`}
                >
                  {d.name}
                </button>
                {editMode && dashboards.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Delete ${d.name}`}
                    onClick={() => onDeleteDashboard(d.id)}
                    className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-[rgb(var(--bad))] text-white group-hover:flex"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ),
          )}
          <button
            type="button"
            aria-label="New dashboard"
            onClick={onCreateDashboard}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Plus size={16} />
          </button>
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleEdit}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
              editMode
                ? "border-accent bg-accent text-accent-fg"
                : "border-border text-secondary hover:bg-surface-2 hover:text-fg"
            }`}
          >
            {editMode ? <Check size={15} /> : <SlidersHorizontal size={15} />}
            <span className="hidden sm:inline">{editMode ? "Done" : "Arrange"}</span>
          </button>

          <Button variant="outline" onClick={onManageSources} className="hidden sm:inline-flex">
            <Database size={15} /> Sources
          </Button>

          <Button variant="primary" onClick={onAddWidget}>
            <Plus size={15} /> <span className="hidden sm:inline">Add widget</span>
          </Button>

          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
