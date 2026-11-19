import "server-only";
import { query, queryOne } from "../falkordb";

export interface UserRecord {
  email: string;
  name: string | null;
  image: string | null;
  createdAt: number;
}

/** Create or refresh a user on sign-in. Email (lowercased) is the stable key. */
export async function upsertUser(input: {
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<UserRecord> {
  const email = input.email.toLowerCase();
  const row = await queryOne<{ u: { properties: UserRecord } }>(
    `MERGE (u:User {email: $email})
     ON CREATE SET u.createdAt = timestamp()
     SET u.name = $name, u.image = $image
     RETURN u`,
    { email, name: input.name ?? null, image: input.image ?? null },
  );
  return (
    row?.u.properties ?? { email, name: null, image: null, createdAt: Date.now() }
  );
}

export async function getUser(email: string): Promise<UserRecord | null> {
  const row = await queryOne<{ u: { properties: UserRecord } }>(
    `MATCH (u:User {email: $email}) RETURN u`,
    { email: email.toLowerCase() },
  );
  return row?.u.properties ?? null;
}

export async function listUsers(): Promise<UserRecord[]> {
  const rows = await query<{ u: { properties: UserRecord } }>(
    `MATCH (u:User) RETURN u ORDER BY u.email`,
  );
  return rows.map((r) => r.u.properties);
}
