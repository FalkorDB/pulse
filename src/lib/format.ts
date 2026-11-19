/** Compact number for stat tiles / axes: 1234567 → "1.23M". */
export function formatCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs < 1000) return trimDecimals(n);
  const units = [
    { v: 1e12, s: "T" },
    { v: 1e9, s: "B" },
    { v: 1e6, s: "M" },
    { v: 1e3, s: "k" },
  ];
  for (const u of units) {
    if (abs >= u.v) {
      const scaled = n / u.v;
      const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
      return `${scaled.toFixed(digits)}${u.s}`;
    }
  }
  return trimDecimals(n);
}

function trimDecimals(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(Math.abs(n) < 10 ? 2 : 1);
}

/** Full number with thousands separators: 1234567 → "1,234,567". */
export function formatFull(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

/** Signed compact delta: +1234 → "+1.23k". */
export function formatDelta(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${formatCompact(Math.abs(n))}`;
}

export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(1)}%`;
}

/** "Nov 19" style short date from a YYYY-MM-DD day or epoch ms. */
export function formatDay(day: string | number): string {
  const d = typeof day === "number" ? new Date(day) : new Date(day + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(ms: number | null | undefined): string {
  if (!ms) return "never";
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const AGG_LABELS: Record<string, string> = {
  latest: "Latest",
  raw: "As recorded",
  cumsum: "Cumulative",
  sum: "Total",
  delta: "Daily change",
  rolling7: "7-day average",
  rolling30: "30-day average",
};

export const RANGE_OPTIONS = [
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 180, label: "180d" },
  { days: 365, label: "1y" },
  { days: 1825, label: "All" },
];
