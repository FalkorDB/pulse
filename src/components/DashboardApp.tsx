"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Database, Plus } from "lucide-react";
import { Header } from "./Header";
import { DashboardGrid, type LayoutItem } from "./DashboardGrid";
import { AddWidgetModal } from "./AddWidgetModal";
import { EditWidgetModal } from "./EditWidgetModal";
import { SourcesModal } from "./SourcesModal";
import { Button, Spinner } from "./ui";
import { useDashboards, useMetrics } from "@/lib/hooks";
import { api, type MetricQuery } from "@/lib/client";
import type { WidgetRecord } from "@/lib/types";

export function DashboardApp({
  user,
}: {
  user: { name: string | null; email: string; image: string | null };
}) {
  const { data, isLoading, mutate } = useDashboards();
  const dashboards = useMemo(() => data?.dashboards ?? [], [data]);

  const [activeId, setActiveId] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [editWidget, setEditWidget] = useState<WidgetRecord | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a valid active dashboard selected (restoring the last-used one).
  useEffect(() => {
    if (!dashboards.length) return;
    setActiveId((prev) => {
      if (prev && dashboards.some((d) => d.id === prev)) return prev;
      const saved =
        typeof window !== "undefined"
          ? localStorage.getItem("pulse-active-dash")
          : null;
      if (saved && dashboards.some((d) => d.id === saved)) return saved;
      return dashboards[0].id;
    });
  }, [dashboards]);

  useEffect(() => {
    if (activeId) localStorage.setItem("pulse-active-dash", activeId);
  }, [activeId]);

  const active = dashboards.find((d) => d.id === activeId);
  const widgets = active?.widgets ?? [];

  const queries = useMemo<MetricQuery[]>(
    () =>
      widgets.map((w) => ({
        sourceId: w.sourceId,
        metric: w.metric,
        agg: w.agg,
        days: w.rangeDays,
      })),
    [widgets],
  );
  const { map, isLoading: metricsLoading, mutate: mutateMetrics } =
    useMetrics(queries);

  const refreshAll = () => {
    mutate();
    mutateMetrics();
  };

  async function createDashboard() {
    const res = await api.createDashboard(`Dashboard ${dashboards.length + 1}`);
    await mutate();
    setActiveId(res.dashboard.id);
    setEditMode(true);
  }

  async function deleteDashboard(id: string) {
    await api.deleteDashboard(id);
    if (id === activeId) {
      const remaining = dashboards.filter((d) => d.id !== id);
      setActiveId(remaining[0]?.id ?? "");
    }
    await mutate();
  }

  function handleLayoutChange(items: LayoutItem[]) {
    if (!activeId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.saveLayout(activeId, items).then(() => mutate());
    }, 700);
  }

  async function removeWidget(id: string) {
    await api.deleteWidget(id);
    await mutate();
  }

  if (isLoading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner className="h-6 w-6 text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Restrained brand flourish: a faint accent glow behind the header. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-64 opacity-[0.07]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgb(var(--accent)) 0%, transparent 70%)",
        }}
      />

      <Header
        user={user}
        dashboards={dashboards}
        activeId={activeId}
        onSelect={setActiveId}
        onCreateDashboard={createDashboard}
        onRenameDashboard={(id, name) => {
          api.renameDashboard(id, name).then(() => mutate());
        }}
        onDeleteDashboard={deleteDashboard}
        editMode={editMode}
        onToggleEdit={() => setEditMode((v) => !v)}
        onAddWidget={() => setAddOpen(true)}
        onManageSources={() => setSourcesOpen(true)}
      />

      <main className="relative mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        {widgets.length === 0 ? (
          <EmptyState
            onAddWidget={() => setAddOpen(true)}
            onManageSources={() => setSourcesOpen(true)}
          />
        ) : (
          <DashboardGrid
            widgets={widgets}
            metrics={map}
            metricsLoading={metricsLoading}
            editMode={editMode}
            onLayoutChange={handleLayoutChange}
            onEditWidget={setEditWidget}
            onRemoveWidget={removeWidget}
          />
        )}
      </main>

      <AddWidgetModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        dashboardId={activeId}
        onCreated={refreshAll}
        onManageSources={() => {
          setAddOpen(false);
          setSourcesOpen(true);
        }}
      />
      <EditWidgetModal
        widget={editWidget}
        open={editWidget !== null}
        onClose={() => setEditWidget(null)}
        onSaved={refreshAll}
      />
      <SourcesModal
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
        onChanged={refreshAll}
      />
    </div>
  );
}

function EmptyState({
  onAddWidget,
  onManageSources,
}: {
  onAddWidget: () => void;
  onManageSources: () => void;
}) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-card border border-border bg-surface p-8 text-center">
      <GraphGlyph />
      <h2 className="mt-4 font-display text-lg font-semibold text-fg">
        This dashboard is empty
      </h2>
      <p className="mt-1 text-sm text-secondary">
        Add a widget to start tracking a metric. Each widget charts one metric
        from one of your data sources.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button variant="primary" onClick={onAddWidget}>
          <Plus size={15} /> Add widget
        </Button>
        <Button variant="outline" onClick={onManageSources}>
          <Database size={15} /> Manage sources
        </Button>
      </div>
    </div>
  );
}

/** A tiny graph constellation — nodes + edges — nodding to FalkorDB. */
function GraphGlyph() {
  return (
    <svg
      viewBox="0 0 120 70"
      className="mx-auto h-16 w-28 text-accent"
      fill="none"
      aria-hidden
    >
      <line x1="20" y1="50" x2="55" y2="20" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <line x1="55" y1="20" x2="95" y2="38" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <line x1="55" y1="20" x2="60" y2="55" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <line x1="60" y1="55" x2="95" y2="38" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="20" cy="50" r="5" fill="currentColor" />
      <circle cx="55" cy="20" r="6" fill="currentColor" />
      <circle cx="95" cy="38" r="5" fill="currentColor" />
      <circle cx="60" cy="55" r="4" fill="currentColor" />
    </svg>
  );
}
