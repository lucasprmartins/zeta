import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

const themes = {
  light: { label: "Claro", next: "dark", nextLabel: "escuro" },
  dark: { label: "Escuro", next: "light", nextLabel: "claro" },
} as const;

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const { label, next, nextLabel } = themes[theme];
  const description = `Tema: ${label}. Usar tema ${nextLabel}`;
  return <Button variant="ghost" size="icon" className="relative size-11 cursor-pointer text-muted-foreground hover:text-foreground"
    aria-label={description} title={description} onClick={() => setTheme(next)}>
    <SunIcon weight="regular" aria-hidden="true" className={`pointer-events-none absolute transition-opacity duration-150 ${theme === "light" ? "opacity-100" : "opacity-0"}`} />
    <MoonIcon weight="regular" aria-hidden="true" className={`pointer-events-none absolute transition-opacity duration-150 ${theme === "dark" ? "opacity-100" : "opacity-0"}`} />
  </Button>;
}
