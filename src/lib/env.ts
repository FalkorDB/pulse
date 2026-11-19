/**
 * Centralised environment access. Edge-safe: only reads `process.env`, no Node
 * built-ins, so it can be imported from middleware and server code alike.
 */

export const ALLOWED_DOMAIN = (
  process.env.ALLOWED_EMAIL_DOMAIN ?? "falkordb.com"
).toLowerCase();

export const GRAPH_NAME = process.env.FALKORDB_GRAPH ?? "pulse";

export const GITHUB_TOKEN =
  process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? "";

/** Secret shared with the cron scheduler to authorise /api/collect. */
export const COLLECT_SECRET =
  process.env.CRON_SECRET ?? process.env.COLLECT_SECRET ?? "";

export interface FalkorConnection {
  url?: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export function falkorConnection(): FalkorConnection {
  return {
    url: process.env.FALKORDB_URL || undefined,
    host: process.env.FALKORDB_HOST ?? "localhost",
    port: Number(process.env.FALKORDB_PORT ?? 6379),
    username: process.env.FALKORDB_USERNAME || undefined,
    password: process.env.FALKORDB_PASSWORD || undefined,
  };
}
