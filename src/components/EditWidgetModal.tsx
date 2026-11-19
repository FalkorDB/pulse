"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
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

// Default-plus-brand swatches for a per-widget color override.
const SWATCHES = ["#2a78d6", "#1baf7a", "#4a3aa7", "#d81b93", "#eb6834", "#e34948", "#2ab6b4"];

export function EditWidgetModal({
  widget,
  open,
  onClose,
  onSaved,
}: {
  widget: WidgetRecord | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: sourcesData } = useSources();
  const { data: typesData } = useSourceTypes();

  const [title, setTitle] = useState("");
  const [viz, setViz] = useState<VizType>("line");
  const [agg, setAgg] = useState<Aggregation>("raw");
  const [rangeDays, setRangeDays] = useState(90);
  const [color, setColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (widget) {
      setTitle(widget.title);
      setViz(widget.viz);
      setAgg(widget.agg);
      setRangeDays(widget.rangeDays);
      setColor(widget.color ?? null);
      setError(null);
    }
  }, [widget]);

  // Resolve which aggregations are valid for this widget's metric.
  const allowedAggs = useMemo<Aggregation[]>(() => {
    const src = sourcesData?.sources.find((s) => s.id === widget?.sourceId);
    const info = typesData?.types.find((t) => t.type === src?.type);
    const m = info?.metrics.find((x) => x.key === widget?.metric);
    return m?.aggregations ?? ["raw", "cumsum", "delta", "rolling7"];
  }, [sourcesData, typesData, widget]);

  if (!widget) return null;

  async function save() {
    if (!widget) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateWidget(widget.id, {
        title: title.trim() || widget.title,
        viz,
        agg,
        rangeDays,
        color,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save widget");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!widget) return;
    await api.deleteWidget(widget.id);
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit widget"
      footer={
        <>
          <Button variant="danger" onClick={remove} className="mr-auto">
            <Trash2 size={13} /> Remove
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Visualization">
            <Select value={viz} onChange={(e) => setViz(e.target.value as VizType)}>
              {VIZ_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Aggregation">
            <Select value={agg} onChange={(e) => setAgg(e.target.value as Aggregation)}>
              {allowedAggs.map((a) => (
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

        <Field label="Color">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setColor(null)}
              className={`h-7 rounded-md border px-2 text-xs ${
                color === null
                  ? "border-accent text-fg"
                  : "border-border text-muted"
              }`}
            >
              Auto
            </button>
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Use ${c}`}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-md border-2 ${
                  color === c ? "border-fg" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>

        {error && <p className="text-xs text-[rgb(var(--bad))]">{error}</p>}
      </div>
    </Modal>
  );
}
