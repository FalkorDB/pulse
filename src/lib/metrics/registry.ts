import type { SourceTypeDef } from "./adapter";
import { githubRepo } from "./adapters/github";
import { pypiPackage } from "./adapters/pypi";
import { dockerhubImage } from "./adapters/dockerhub";
import { dbEnginesSystem } from "./adapters/dbengines";
import { socialManual } from "./adapters/social";

/**
 * The plugin registry. To add a new metric source, implement a SourceTypeDef in
 * ./adapters and append it here — the UI and collector pick it up automatically.
 */
const all: SourceTypeDef[] = [
  githubRepo,
  pypiPackage,
  dockerhubImage,
  dbEnginesSystem,
  socialManual,
];

export const registry: Record<string, SourceTypeDef> = Object.fromEntries(
  all.map((s) => [s.type, s]),
);

export function listSourceTypes(): SourceTypeDef[] {
  return all;
}

export function getSourceType(type: string): SourceTypeDef | undefined {
  return registry[type];
}

export function getMetricDef(type: string, key: string) {
  return registry[type]?.metrics.find((m) => m.key === key);
}
