"use client";

import { useState } from "react";
import { History, RefreshCw, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button, Field, Input, Select, Spinner } from "./ui";
import { SourceIcon } from "./SourceIcon";
import { useSources, useSourceTypes } from "@/lib/hooks";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import type { SourceRecord } from "@/lib/types";

export function SourcesModal({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: sourcesData, mutate: mutateSources } = useSources();
  const { data: typesData } = useSourceTypes();
  const sources = sourcesData?.sources ?? [];
  const types = typesData?.types ?? [];

  const [refreshing, setRefreshing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  // Add-source form state
  const [type, setType] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const typeInfo = types.find((t) => t.type === type);

  async function refresh() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const r = await api.refresh();
      setRefreshMsg(`Collected ${r.points} datapoints from ${r.sources} sources.`);
      await mutateSources();
      onChanged();
    } catch (e) {
      setRefreshMsg(e instanceof Error ? e.message : "Collection failed");
    } finally {
      setRefreshing(false);
    }
  }

  async function backfill() {
    setBackfilling(true);
    setRefreshMsg(null);
    try {
      const r = await api.backfillHistory();
      setRefreshMsg(`Backfilled ${r.points} historical datapoints.`);
      await mutateSources();
      onChanged();
    } catch (e) {
      setRefreshMsg(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setBackfilling(false);
    }
  }

  async function toggle(s: SourceRecord) {
    await api.updateSource(s.id, { enabled: !s.enabled });
    await mutateSources();
    onChanged();
  }

  async function remove(s: SourceRecord) {
    await api.deleteSource(s.id);
    await mutateSources();
    onChanged();
  }

  async function add() {
    if (!typeInfo) return;
    setAdding(true);
    setAddError(null);
    try {
      await api.createSource(type, config);
      setType("");
      setConfig({});
      await mutateSources();
      onChanged();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add source");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Data sources" wide>
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-secondary">
          Metrics are collected daily. Collect now for the latest numbers, or
          backfill to reconstruct history (GitHub stars/forks over time).
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={backfill}
            disabled={backfilling || refreshing}
          >
            {backfilling ? <Spinner className="h-3.5 w-3.5" /> : <History size={13} />}
            {backfilling ? "Backfilling…" : "Backfill history"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={refresh}
            disabled={refreshing || backfilling}
          >
            {refreshing ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw size={13} />}
            {refreshing ? "Collecting…" : "Collect now"}
          </Button>
        </div>
      </div>
      {refreshMsg && (
        <p className="mb-4 text-xs text-muted">{refreshMsg}</p>
      )}

      {/* Existing sources */}
      <div className="space-y-2">
        {sources.length === 0 && (
          <p className="py-4 text-center text-sm text-muted">
            No sources yet. Add one below.
          </p>
        )}
        {sources.map((s) => {
          const info = types.find((t) => t.type === s.type);
          const status = s.lastStatus ?? "";
          const dot = !s.lastCollectedAt
            ? "bg-muted"
            : status.startsWith("error")
              ? "bg-[rgb(var(--bad))]"
              : "bg-[rgb(var(--good))]";
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5"
            >
              <SourceIcon name={info?.icon ?? "Activity"} className="text-secondary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-fg">
                  {s.label}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                  {s.lastCollectedAt
                    ? `Last collected ${formatDateTime(s.lastCollectedAt)}`
                    : "Never collected"}
                  {status.startsWith("error") && (
                    <span className="truncate text-[rgb(var(--bad))]">· {status}</span>
                  )}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-secondary">
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={() => toggle(s)}
                  className="accent-[rgb(var(--accent))]"
                />
                Enabled
              </label>
              <button
                type="button"
                aria-label="Delete source"
                onClick={() => remove(s)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-secondary hover:bg-[rgb(var(--bad))]/10 hover:text-[rgb(var(--bad))]"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add source */}
      <div className="mt-5 rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-fg">Add a source</h3>
        <div className="mt-3 space-y-3">
          <Field label="Type">
            <Select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setConfig({});
              }}
            >
              <option value="">Select a source type…</option>
              {types.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          {typeInfo && (
            <>
              <p className="text-xs text-muted">{typeInfo.description}</p>
              {typeInfo.configFields.map((f) => (
                <Field key={f.name} label={f.label} help={f.help}>
                  <Input
                    value={config[f.name] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, [f.name]: e.target.value }))
                    }
                  />
                </Field>
              ))}
              {addError && (
                <p className="text-xs text-[rgb(var(--bad))]">{addError}</p>
              )}
              <Button variant="primary" size="sm" onClick={add} disabled={adding}>
                {adding ? "Adding…" : "Add source"}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
