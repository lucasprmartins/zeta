// Adaptado do ThemeProvider para Vite do shadcn/ui (MIT).
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const storageKey = "zeta:theme";
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | undefined>(undefined);

function readTheme(): Theme | null {
  try {
    const value = localStorage.getItem(storageKey);
    if (value === "light" || value === "dark") return value;
  } catch { /* O tema continua funcionando sem armazenamento. */ }
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setThemeState] = useState<Theme | null>(readTheme);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const theme = preference ?? (systemDark ? "dark" : "light");

  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemDark(system.matches);
    sync();
    system.addEventListener("change", sync);
    return () => system.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setThemeState(readTheme());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function setTheme(value: Theme) {
    setThemeState(value);
    try { localStorage.setItem(storageKey, value); }
    catch { /* A preferência vale nesta aba mesmo sem persistência. */ }
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme deve estar dentro de ThemeProvider.");
  return context;
}
