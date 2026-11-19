import "server-only";
import { FalkorDB, type Graph, type QueryParams } from "falkordb";
import { falkorConnection, GRAPH_NAME } from "./env";

/**
 * A single shared FalkorDB connection per server process. Cached on `globalThis`
 * so Next.js dev hot-reloads don't open a new socket on every request.
 */
const globalForFalkor = globalThis as unknown as {
  __falkorClient?: Promise<FalkorDB>;
};

function connect(): Promise<FalkorDB> {
  const c = falkorConnection();
  if (c.url) return FalkorDB.connect({ url: c.url });
  return FalkorDB.connect({
    socket: { host: c.host, port: c.port },
    username: c.username,
    password: c.password,
  });
}

export async function getClient(): Promise<FalkorDB> {
  if (!globalForFalkor.__falkorClient) {
    globalForFalkor.__falkorClient = connect();
  }
  return globalForFalkor.__falkorClient;
}

export async function getGraph(): Promise<Graph> {
  const client = await getClient();
  return client.selectGraph(GRAPH_NAME);
}

/** Run a read/write Cypher query and return its rows (already keyed by alias). */
export async function query<T = Record<string, unknown>>(
  cypher: string,
  params?: QueryParams,
): Promise<T[]> {
  const graph = await getGraph();
  const reply = await graph.query<T>(cypher, params ? { params } : undefined);
  return reply.data ?? [];
}

/** Run a query expected to return a single row (or null). */
export async function queryOne<T = Record<string, unknown>>(
  cypher: string,
  params?: QueryParams,
): Promise<T | null> {
  const rows = await query<T>(cypher, params);
  return rows[0] ?? null;
}
