import { ScriptOnce } from "@tanstack/react-router";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { resolveTheme, THEME_STORAGE_KEY, type Theme, ThemeContext } from "./theme-context.ts";

/** Runs before first paint so the page never flashes the wrong theme. Dark is the house style. */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"dark";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function ThemeScript() {
  return <ScriptOnce>{THEME_SCRIPT}</ScriptOnce>;
}

function systemPrefersDark(): boolean {
  return typeof globalThis.matchMedia === "function" && globalThis.matchMedia(DARK_QUERY).matches;
}

function readStoredTheme(): Theme {
  if (typeof globalThis.localStorage === "undefined") {
    return "dark";
  }
  const stored = globalThis.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "system" ? stored : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = globalThis.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved = resolveTheme(theme, systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const setTheme = useCallback((next: Theme) => {
    globalThis.localStorage.setItem(THEME_STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}
