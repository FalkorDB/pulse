import { dayKey, dayStartMs } from "@/lib/ids";
import type { CollectContext, CollectedPoint, SourceTypeDef } from "../adapter";

const API = "https://api.github.com";

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "falkordb-pulse",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

interface RepoResponse {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  subscribers_count: number;
}

interface TrafficResponse {
  views?: Array<{ timestamp: string; count: number; uniques: number }>;
  clones?: Array<{ timestamp: string; count: number; uniques: number }>;
}

export const githubRepo: SourceTypeDef = {
  type: "github_repo",
  label: "GitHub Repository",
  description:
    "Stars, forks, open issues and watchers for a repository. With a token that has push access, also daily page views and clones (last 14 days).",
  icon: "Github",
  configFields: [
    { name: "owner", label: "Owner / Org", placeholder: "FalkorDB", required: true },
    { name: "repo", label: "Repository", placeholder: "FalkorDB", required: true },
  ],
  metrics: [
    { key: "stars", label: "Stars", kind: "level" },
    { key: "forks", label: "Forks", kind: "level" },
    { key: "open_issues", label: "Open Issues", kind: "level" },
    { key: "watchers", label: "Watchers", kind: "level" },
    { key: "views", label: "Views", kind: "incremental", unit: "views" },
    { key: "unique_views", label: "Unique Visitors", kind: "incremental", unit: "visitors" },
    { key: "clones", label: "Clones", kind: "incremental", unit: "clones" },
  ],
  defaultLabel: (c) => `${c.owner}/${c.repo}`,

  async collect(config, ctx: CollectContext): Promise<CollectedPoint[]> {
    const { owner, repo } = config;
    const points: CollectedPoint[] = [];
    const today = dayKey();
    const todayTs = dayStartMs();

    // --- Core repo stats (always available for public repos) ---
    const res = await fetch(`${API}/repos/${owner}/${repo}`, {
      headers: headers(ctx.githubToken),
    });
    if (!res.ok) {
      throw new Error(
        `GitHub repo ${owner}/${repo} returned ${res.status} ${res.statusText}`,
      );
    }
    const repoData = (await res.json()) as RepoResponse;
    points.push(
      { metric: "stars", day: today, ts: todayTs, value: repoData.stargazers_count ?? 0 },
      { metric: "forks", day: today, ts: todayTs, value: repoData.forks_count ?? 0 },
      { metric: "open_issues", day: today, ts: todayTs, value: repoData.open_issues_count ?? 0 },
      { metric: "watchers", day: today, ts: todayTs, value: repoData.subscribers_count ?? 0 },
    );

    // --- Traffic (requires push access + a token). Best-effort. ---
    if (ctx.githubToken) {
      await collectTraffic(owner, repo, ctx.githubToken, points);
    }

    return points;
  },

  /**
   * Reconstruct daily cumulative stars + forks history from each stargazer's
   * `starred_at` and each fork's `created_at`. A token is strongly recommended
   * (raises the rate limit from 60/hr to 5,000/hr).
   */
  async backfill(config, ctx: CollectContext): Promise<CollectedPoint[]> {
    const { owner, repo } = config;
    const points: CollectedPoint[] = [];

    const starTimes = await paginateTimestamps(
      (page) =>
        `${API}/repos/${owner}/${repo}/stargazers?per_page=100&page=${page}`,
      (item) => (item as { starred_at?: string }).starred_at,
      ctx.githubToken,
      // The star+json media type is what makes stargazers include `starred_at`.
      "application/vnd.github.star+json",
    );
    points.push(...cumulativeDaily(starTimes, "stars"));

    const forkTimes = await paginateTimestamps(
      (page) =>
        `${API}/repos/${owner}/${repo}/forks?per_page=100&page=${page}&sort=oldest`,
      (item) => (item as { created_at?: string }).created_at,
      ctx.githubToken,
    );
    points.push(...cumulativeDaily(forkTimes, "forks"));

    return points;
  },
};

/** Max pages to walk (100 × 100 = 10k events) — bounds cost on huge repos. */
const MAX_PAGES = 100;

/** Page through a list endpoint, extracting one ISO timestamp per item. */
async function paginateTimestamps(
  url: (page: number) => string,
  pick: (item: unknown) => string | undefined,
  token?: string,
  accept?: string,
): Promise<number[]> {
  const times: number[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const h = headers(token);
    if (accept) h.Accept = accept;
    const res = await fetch(url(page), { headers: h });
    if (!res.ok) {
      if (page === 1) {
        throw new Error(`GitHub history fetch returned ${res.status} ${res.statusText}`);
      }
      break; // partial history is better than none
    }
    const arr = (await res.json()) as unknown[];
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (const item of arr) {
      const iso = pick(item);
      if (iso) times.push(Date.parse(iso));
    }
    if (arr.length < 100) break;
  }
  return times;
}

const DAY_MS = 86_400_000;

/**
 * Turn a set of event timestamps into a daily cumulative count series, one
 * point per UTC day from the first event through today.
 */
function cumulativeDaily(timesMs: number[], metric: string): CollectedPoint[] {
  if (timesMs.length === 0) return [];
  timesMs.sort((a, b) => a - b);
  const out: CollectedPoint[] = [];
  const firstDay = dayStartMs(timesMs[0]);
  const lastDay = dayStartMs();
  let idx = 0;
  let count = 0;
  for (let d = firstDay; d <= lastDay; d += DAY_MS) {
    const nextDay = d + DAY_MS;
    while (idx < timesMs.length && timesMs[idx] < nextDay) {
      count++;
      idx++;
    }
    out.push({ metric, day: dayKey(d), ts: d, value: count });
  }
  return out;
}

/** Fetch daily views/clones. Silently skips if the token lacks push access. */
async function collectTraffic(
  owner: string,
  repo: string,
  token: string,
  out: CollectedPoint[],
): Promise<void> {
  try {
    const [viewsRes, clonesRes] = await Promise.all([
      fetch(`${API}/repos/${owner}/${repo}/traffic/views`, { headers: headers(token) }),
      fetch(`${API}/repos/${owner}/${repo}/traffic/clones`, { headers: headers(token) }),
    ]);

    if (viewsRes.ok) {
      const data = (await viewsRes.json()) as TrafficResponse;
      for (const v of data.views ?? []) {
        const day = dayKey(v.timestamp);
        const ts = dayStartMs(v.timestamp);
        out.push({ metric: "views", day, ts, value: v.count ?? 0 });
        out.push({ metric: "unique_views", day, ts, value: v.uniques ?? 0 });
      }
    }

    if (clonesRes.ok) {
      const data = (await clonesRes.json()) as TrafficResponse;
      for (const c of data.clones ?? []) {
        out.push({
          metric: "clones",
          day: dayKey(c.timestamp),
          ts: dayStartMs(c.timestamp),
          value: c.count ?? 0,
        });
      }
    }
  } catch {
    // Network / permission issues on traffic are non-fatal.
  }
}
