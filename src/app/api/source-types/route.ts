import { listSourceTypes } from "@/lib/metrics/registry";
import {
  allowedAggregations,
  defaultAggregation,
} from "@/lib/metrics/aggregations";
import { handle, ok, requireUser } from "@/lib/api";

/** Catalogue of available source types + their metrics, for the "add" UI. */
export async function GET() {
  return handle(async () => {
    await requireUser();
    const types = listSourceTypes().map((def) => ({
      type: def.type,
      label: def.label,
      description: def.description,
      icon: def.icon,
      configFields: def.configFields,
      metrics: def.metrics.map((m) => ({
        key: m.key,
        label: m.label,
        kind: m.kind,
        unit: m.unit ?? null,
        aggregations: allowedAggregations(m.kind),
        defaultAgg: defaultAggregation(m.kind),
      })),
    }));
    return ok({ types });
  });
}
