import type { MetricDefinition, SourceConfigField } from "@/lib/types";

/** Runtime context handed to every adapter's collect(). */
export interface CollectContext {
  githubToken?: string;
}

/** A single measurement an adapter produces for one metric on one UTC day. */
export interface CollectedPoint {
  metric: string;
  day: string; // YYYY-MM-DD (UTC)
  ts: number; // epoch ms at 00:00 UTC of `day`
  value: number;
}

/**
 * A metric source type (plugin). Adding a new data source = add one file that
 * exports a SourceTypeDef and register it in registry.ts. The UI reads
 * `configFields` to render the "add source" form and `metrics` to populate
 * widget metric pickers; the collector calls `collect()` on a schedule.
 */
export interface SourceTypeDef {
  /** Stable machine key, e.g. "github_repo". Persisted on Source nodes. */
  type: string;
  /** Human label, e.g. "GitHub Repository". */
  label: string;
  description: string;
  /** lucide-react icon name, e.g. "Github", "Package", "Container", "Share2". */
  icon: string;
  /** Fields the UI collects to configure an instance of this source. */
  configFields: SourceConfigField[];
  /** Metrics this source produces. */
  metrics: MetricDefinition[];
  /** Human label derived from a configured instance's values. */
  defaultLabel: (config: Record<string, string>) => string;
  /** Fetch current + any available historical datapoints. */
  collect: (
    config: Record<string, string>,
    ctx: CollectContext,
  ) => Promise<CollectedPoint[]>;
  /**
   * Optional one-time historical reconstruction — e.g. GitHub stars/forks over
   * time from each stargazer's `starred_at`. Run on demand (not every day); the
   * collector upsert dedupes by (source, metric, day).
   */
  backfill?: (
    config: Record<string, string>,
    ctx: CollectContext,
  ) => Promise<CollectedPoint[]>;
}
