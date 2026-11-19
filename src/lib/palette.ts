/**
 * Chart colours — the validated data-viz reference palette. Categorical hues are
 * assigned to widgets in FIXED order (never cycled/by-rank); each single-series
 * chart uses exactly one hue. Light and dark are distinct, mode-tuned steps.
 */
export type Theme = "light" | "dark";

export const CATEGORICAL: Record<Theme, string[]> = {
  light: [
    "#2a78d6", // blue
    "#1baf7a", // aqua
    "#eda100", // yellow
    "#008300", // green
    "#4a3aa7", // violet
    "#e34948", // red
    "#e87ba4", // magenta
    "#eb6834", // orange
  ],
  dark: [
    "#3987e5",
    "#199e70",
    "#c98500",
    "#008300",
    "#9085e9",
    "#e66767",
    "#d55181",
    "#d95926",
  ],
};

/** Chart chrome (grid / axis / ink) per mode — matches globals.css tokens. */
export const CHROME: Record<Theme, {
  grid: string;
  axis: string;
  muted: string;
  secondary: string;
  surface: string;
}> = {
  light: {
    grid: "#e1e0d9",
    axis: "#c3c2b7",
    muted: "#898781",
    secondary: "#52514e",
    surface: "#fcfcfb",
  },
  dark: {
    grid: "#2c2c2a",
    axis: "#383835",
    muted: "#898781",
    secondary: "#c3c2b7",
    surface: "#1a1a19",
  },
};

/** Resolve a widget's colour: an explicit override, else the fixed slot by index. */
export function seriesColor(
  theme: Theme,
  index: number,
  override?: string | null,
): string {
  if (override) return override;
  const slots = CATEGORICAL[theme];
  return slots[index % slots.length];
}
