"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Moon, Sun } from "lucide-react";
import type { Theme } from "@/lib/palette";

type Pref = Theme | "system";

interface ThemeState {
  resolved: Theme;
  pref: Pref;
  setPref: (p: Pref) => void;
}

const ThemeCtx = createContext<ThemeState>({
  resolved: "light",
  pref: "system",
  setPref: () => {},
});

const STORAGE_KEY = "pulse-theme";

function systemTheme(): Theme {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Inline script injected before hydration to set the .dark class with no flash. */
export const themeBootScript = `(function(){try{var p=localStorage.getItem("${STORAGE_KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<Pref>("system");
  const [resolved, setResolved] = useState<Theme>("light");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Pref) || "system";
    setPrefState(stored);
  }, []);

  useEffect(() => {
    const apply = () => {
      const r: Theme = pref === "system" ? systemTheme() : pref;
      setResolved(r);
      document.documentElement.classList.toggle("dark", r === "dark");
    };
    apply();
    if (pref === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [pref]);

  const setPref = useCallback((p: Pref) => {
    localStorage.setItem(STORAGE_KEY, p);
    setPrefState(p);
  }, []);

  return (
    <ThemeCtx.Provider value={{ resolved, pref, setPref }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);

export function ThemeToggle() {
  const { resolved, setPref } = useTheme();
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setPref(resolved === "dark" ? "light" : "dark")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-secondary transition-colors hover:bg-surface-2 hover:text-fg"
    >
      {resolved === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
