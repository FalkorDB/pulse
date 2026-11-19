"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { Button, Field, Input, Select } from "./ui";
import { useSources, useSourceTypes } from "@/lib/hooks";
import { api } from "@/lib/client";
import { AGG_LABELS, RANGE_OPTIONS } from "@/lib/format";
import type { Aggregation, VizType, WidgetRecord } from "@/lib/types";

const VIZ_OPTIONS: { value: VizType; label: string }[] = [
  { value: "stat", label: "Stat tile" },
  { value: "line", label: "Line chart" },
  { value: "area", label: "Area chart" },
  { value: "bar", label: "Bar chart" },
];

export function AddWidgetModal({
  open,
  onClose,
  dashboardId,
  onCreated,
  onManageSources,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  dashboardId: string;
  onCreated: () => void;
  onManageSources: () => void;
  editing?: WidgetRecord | null;
}) {
  const { data: sourcesData } = useSources();
  const { data: typesData } = useSourceTypes();
  const sources = useMemo(() => sourcesData?.sources ?? [], [sourcesData]);
  const types = useMemo(() => typesData?.types ?? [], [typesData]);

  const [sourceId, setSourceId] = useState("");
  const [metric, setMetric] = useState("");
  const [viz, setViz] = useState<VizType>("line");
  const [agg, setAgg] = useState<Aggregation>("raw");
  const [rangeDays, setRangeDays] = useState(90);
  const [title, setTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = sources.find((s) => s.id === sourceId);
  const typeInfo = source ? types.find((t) => t.type === source.type) : undefined;
  const metrics = typeInfo?.metrics ?? [];
  const metricInfo = metrics.find((m) => m.key === metric);

  // When editing an existing widget, prefill from it.
  useEffect(() => {
    if (open && editing) {
      setSourceId(editing.sourceId);
      setMetric(editing.metric);
      setViz(editing.viz);
      setAgg(editing.agg);
      setRangeDays(editing.rangeDays);
      setTitle(editing.title);
      setTitleEdited(true);
    }
  }, [open, editing]);

  // Default the source once data loads (add mode only).
  useEffect(() => {
    if (open && !editing && !sourceId && sources.length) {
      setSourceId(sources[0].id);
    }
  }, [open, editing, sourceId, sources]);

  // When the source changes, pick its first metric.
  useEffect(() => {
    if (metrics.length && !metrics.some((m) => m.key === metric)) {
      setMetric(metrics[0].key);
    }
  }, [metrics, metric]);

  // Keep aggregation valid for the chosen metric.
  useEffect(() => {
    if (metricInfo && !metricInfo.aggregations.includes(agg)) {
      setAgg(metricInfo.defaultAgg);
    }
  }, [metricInfo, agg]);

  // Auto-title unless the user typed their own.
  useEffect(() => {
    if (!titleEdited && source && metricInfo) {
      setTitle(`${source.label} · ${metricInfo.label}`);
    }
  }, [titleEdited, source, metricInfo]);

  async function submit() {
    if (!source || !metricInfo) return;
    setSaving(true);
    setError(null);
    const finalTitle = title.trim() || `${source.label} · ${metricInfo.label}`;
    try {
      if (editing) {
        await api.updateWidget(editing.id, {
          viz,
          title: finalTitle,
          sourceId: source.id,
          metric: metricInfo.key,
          agg,
          rangeDays,
        });
      } else {
        await api.addWidget({
          dashboardId,
          viz,
          title: finalTitle,
          sourceId: source.id,
          metric: metricInfo.key,
          agg,
          rangeDays,
          w: viz === "stat" ? 3 : 6,
          h: viz === "stat" ? 4 : 8,
        });
      }
      onCreated();
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save widget");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setTitleEdited(false);
    setViz("line");
    setRangeDays(90);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit widget" : "Add widget"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={saving || !source}>
            {saving
              ? editing
                ? "Saving…"
                : "Adding…"
              : editing
                ? "Save changes"
                : "Add widget"}
          </Button>
        </>
      }
    >
      {sources.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-secondary">No data sources yet.</p>
          <Button className="mt-3" variant="primary" onClick={onManageSources}>
            Add a data source
          </Button>
        </div>
      ) : (
        <div className="space-y-3.5">
          <Field label="Data source">
            <Select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Metric">
            <Select value={metric} onChange={(e) => setMetric(e.target.value)}>
              {metrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Visualization">
              <Select
                value={viz}
                onChange={(e) => setViz(e.target.value as VizType)}
              >
                {VIZ_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Aggregation">
              <Select
                value={agg}
                onChange={(e) => setAgg(e.target.value as Aggregation)}
              >
                {(metricInfo?.aggregations ?? []).map((a) => (
                  <option key={a} value={a}>
                    {AGG_LABELS[a] ?? a}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Time range">
            <Select
              value={String(rangeDays)}
              onChange={(e) => setRangeDays(Number(e.target.value))}
            >
              {RANGE_OPTIONS.map((r) => (
                <option key={r.days} value={r.days}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleEdited(true);
              }}
            />
          </Field>

          {error && (
            <p className="text-xs text-[rgb(var(--bad))]">{error}</p>
          )}
        </div>
      )}
    </Modal>
  );
}
