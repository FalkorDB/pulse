import { randomUUID } from "crypto";

/** Short, URL-safe, collision-resistant id for graph entities. */
export function newId(prefix = ""): string {
  const id = randomUUID().replace(/-/g, "").slice(0, 20);
  return prefix ? `${prefix}_${id}` : id;
}

/** UTC day key (YYYY-MM-DD) for a timestamp — our daily snapshot bucket. */
export function dayKey(d: Date | number | string = new Date()): string {
  const date = typeof d === "object" ? d : new Date(d);
  return date.toISOString().slice(0, 10);
}

/** Epoch milliseconds at 00:00:00 UTC for the day containing `d`. */
export function dayStartMs(d: Date | number | string = new Date()): number {
  return Date.parse(dayKey(d) + "T00:00:00.000Z");
}
