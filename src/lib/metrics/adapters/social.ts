import type { CollectedPoint, SourceTypeDef } from "../adapter";

/**
 * Manually-entered social metric (LinkedIn followers, X/Twitter mentions, etc.).
 *
 * The public APIs for LinkedIn and X are paywalled or restricted, so v1 lets a
 * teammate type the number in and still get the full time-series + charting
 * treatment. A future v2 can add automated adapters (X API, LinkedIn Marketing
 * API) under new source types without touching this one. Because values arrive
 * from the UI, collect() has nothing to fetch and returns no points.
 */
export const socialManual: SourceTypeDef = {
  type: "social_manual",
  label: "Social (manual entry)",
  description:
    "A social metric you update by hand — e.g. LinkedIn followers or X mentions. Automated collection for these platforms is planned for v2.",
  icon: "Share2",
  configFields: [
    { name: "platform", label: "Platform", placeholder: "LinkedIn", required: true },
    {
      name: "metricLabel",
      label: "Metric",
      placeholder: "Followers",
      required: true,
      help: "What you're tracking, e.g. Followers or Mentions.",
    },
  ],
  metrics: [{ key: "value", label: "Value", kind: "level" }],
  defaultLabel: (c) => `${c.platform} · ${c.metricLabel}`,

  async collect(): Promise<CollectedPoint[]> {
    // Values are entered through the UI, not fetched from an API.
    return [];
  },
};
