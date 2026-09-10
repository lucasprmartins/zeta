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
  return (
    <Button
      aria-label={description}
      className="relative size-11 cursor-pointer text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(next)}
      size="icon"
      title={description}
      variant="ghost"
    >
      <SunIcon
        aria-hidden="true"
        className={`pointer-events-none absolute transition-opacity duration-150 ${theme === "light" ? "opacity-100" : "opacity-0"}`}
        weight="regular"
      />
      <MoonIcon
        aria-hidden="true"
        className={`pointer-events-none absolute transition-opacity duration-150 ${theme === "dark" ? "opacity-100" : "opacity-0"}`}
        weight="regular"
      />
    </Button>
  );
}
