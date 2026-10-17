import { createContext, use } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type ThemeContextValue = {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

export const THEME_STORAGE_KEY = "nueslify-theme";

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return context;
}

export function resolveTheme(theme: Theme, systemDark: boolean): ResolvedTheme {
  if (theme !== "system") {
    return theme;
  }
  return systemDark ? "dark" : "light";
}
