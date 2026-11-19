import "server-only";
import { query, queryOne } from "../falkordb";
import { ensureSchema } from "./schema";
import { newId } from "../ids";
import type { SourceRecord } from "../types";

interface SourceProps {
  id: string;
  type: string;
  label: string;
  configJson?: string;
  enabled?: boolean;
  createdAt?: number;
  createdBy?: string | null;
  lastCollectedAt?: number | null;
  lastStatus?: string | null;
}

function mapSource(p: SourceProps): SourceRecord {
  let config: Record<string, string> = {};
  if (p.configJson) {
    try {
      config = JSON.parse(p.configJson) as Record<string, string>;
    } catch {
      config = {};
    }
  }
  return {
    id: p.id,
    type: p.type,
    label: p.label,
    config,
    enabled: p.enabled ?? true,
    createdAt: p.createdAt ?? 0,
    createdBy: p.createdBy ?? null,
    lastCollectedAt: p.lastCollectedAt ?? null,
    lastStatus: p.lastStatus ?? null,
  };
}

export async function listSources(): Promise<SourceRecord[]> {
  await ensureSchema();
  const rows = await query<{ s: { properties: SourceProps } }>(
    `MATCH (s:Source) RETURN s ORDER BY s.label`,
  );
  return rows.map((r) => mapSource(r.s.properties));
}

export async function getEnabledSources(): Promise<SourceRecord[]> {
  await ensureSchema();
  const rows = await query<{ s: { properties: SourceProps } }>(
    `MATCH (s:Source) WHERE s.enabled = true RETURN s ORDER BY s.label`,
  );
  return rows.map((r) => mapSource(r.s.properties));
}

export async function getSource(id: string): Promise<SourceRecord | null> {
  await ensureSchema();
  const row = await queryOne<{ s: { properties: SourceProps } }>(
    `MATCH (s:Source {id: $id}) RETURN s`,
    { id },
  );
  return row ? mapSource(row.s.properties) : null;
}

export async function createSource(input: {
  type: string;
  label: string;
  config: Record<string, string>;
  createdBy?: string | null;
}): Promise<SourceRecord> {
  await ensureSchema();
  const id = newId("src");
  const row = await queryOne<{ s: { properties: SourceProps } }>(
    `CREATE (s:Source {
       id: $id, type: $type, label: $label, configJson: $configJson,
       enabled: true, createdAt: timestamp(), createdBy: $createdBy
     })
     RETURN s`,
    {
      id,
      type: input.type,
      label: input.label,
      configJson: JSON.stringify(input.config ?? {}),
      createdBy: input.createdBy ?? null,
    },
  );
  return mapSource(row!.s.properties);
}

export async function updateSource(
  id: string,
  patch: { label?: string; config?: Record<string, string>; enabled?: boolean },
): Promise<SourceRecord | null> {
  await ensureSchema();
  const sets: string[] = [];
  const params: Record<string, unknown> = { id };
  if (patch.label !== undefined) {
    sets.push("s.label = $label");
    params.label = patch.label;
  }
  if (patch.config !== undefined) {
    sets.push("s.configJson = $configJson");
    params.configJson = JSON.stringify(patch.config);
  }
  if (patch.enabled !== undefined) {
    sets.push("s.enabled = $enabled");
    params.enabled = patch.enabled;
  }
  if (sets.length === 0) return getSource(id);

  const row = await queryOne<{ s: { properties: SourceProps } }>(
    `MATCH (s:Source {id: $id}) SET ${sets.join(", ")} RETURN s`,
    params as never,
  );
  return row ? mapSource(row.s.properties) : null;
}

export async function deleteSource(id: string): Promise<void> {
  await ensureSchema();
  await query(
    `MATCH (s:Source {id: $id})
     OPTIONAL MATCH (s)-[:MEASURED]->(p:Datapoint)
     DETACH DELETE s, p`,
    { id },
  );
}

export async function markCollected(
  id: string,
  status: string,
  at: number,
): Promise<void> {
  await ensureSchema();
  await query(
    `MATCH (s:Source {id: $id})
     SET s.lastCollectedAt = $at, s.lastStatus = $status`,
    { id, at, status },
  );
}
