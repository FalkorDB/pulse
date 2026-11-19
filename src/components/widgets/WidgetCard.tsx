"use client";

import { GripVertical, Pencil, Trash2 } from "lucide-react";

export function WidgetCard({
  title,
  subtitle,
  editMode,
  dragHandleClass,
  onEdit,
  onRemove,
  children,
}: {
  title: string;
  subtitle?: string;
  editMode: boolean;
  dragHandleClass: string;
  onEdit: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm">
      <div
        className={`flex items-start justify-between gap-2 px-4 pt-3 ${
          editMode ? `${dragHandleClass} cursor-grab active:cursor-grabbing` : ""
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {editMode && (
              <GripVertical size={13} className="shrink-0 text-muted" />
            )}
            <h3 className="truncate text-sm font-semibold text-fg">{title}</h3>
          </div>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>
          )}
        </div>
        {editMode && (
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              aria-label="Edit widget"
              onClick={onEdit}
              onMouseDown={(e) => e.stopPropagation()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-secondary hover:bg-surface-2 hover:text-fg"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              aria-label="Remove widget"
              onClick={onRemove}
              onMouseDown={(e) => e.stopPropagation()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-secondary hover:bg-[rgb(var(--bad))]/10 hover:text-[rgb(var(--bad))]"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 px-4 pb-3 pt-2">{children}</div>
    </div>
  );
}
