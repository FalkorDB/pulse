import { dayKey, dayStartMs } from "@/lib/ids";
import type { CollectedPoint, SourceTypeDef } from "../adapter";

interface RepoResponse {
  pull_count: number;
  star_count: number;
}

export const dockerhubImage: SourceTypeDef = {
  type: "dockerhub_image",
  label: "Docker Hub Image",
  description:
    "Total pull count and star count for a Docker Hub image. Pulls are a running total; the dashboard derives daily pulls from day-over-day change.",
  icon: "Container",
  configFields: [
    { name: "namespace", label: "Namespace", placeholder: "falkordb", required: true },
    { name: "repo", label: "Image", placeholder: "falkordb", required: true },
  ],
  metrics: [
    { key: "pulls", label: "Pulls", kind: "cumulative", unit: "pulls" },
    { key: "docker_stars", label: "Docker Stars", kind: "level" },
  ],
  defaultLabel: (c) => `${c.namespace}/${c.repo}`,

  async collect(config): Promise<CollectedPoint[]> {
    const { namespace, repo } = config;
    const res = await fetch(
      `https://hub.docker.com/v2/repositories/${encodeURIComponent(namespace)}/${encodeURIComponent(repo)}/`,
      { headers: { "User-Agent": "falkordb-pulse", Accept: "application/json" } },
    );
    if (!res.ok) {
      throw new Error(
        `Docker Hub ${namespace}/${repo} returned ${res.status} ${res.statusText}`,
      );
    }
    const data = (await res.json()) as RepoResponse;
    const day = dayKey();
    const ts = dayStartMs();
    return [
      { metric: "pulls", day, ts, value: data.pull_count ?? 0 },
      { metric: "docker_stars", day, ts, value: data.star_count ?? 0 },
    ];
  },
};
