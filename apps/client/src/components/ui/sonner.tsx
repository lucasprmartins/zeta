import {
  CheckCircleIcon,
  InfoIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function Toaster() {
  const { theme } = useTheme();
  return (
    <Sonner
      className="toaster group"
      closeButton
      containerAriaLabel="Notificações"
      duration={5000}
      icons={{
        success: <CheckCircleIcon aria-hidden="true" className="size-icon" />,
        error: <WarningCircleIcon aria-hidden="true" className="size-icon" />,
        info: <InfoIcon aria-hidden="true" className="size-icon" />,
        warning: <WarningIcon aria-hidden="true" className="size-icon" />,
        loading: (
          <SpinnerGapIcon
            aria-hidden="true"
            className="size-icon animate-spin"
          />
        ),
      }}
      mobileOffset={{
        top: "max(16px, env(safe-area-inset-top))",
        left: "16px",
        right: "16px",
      }}
      offset="max(20px, env(safe-area-inset-top))"
      position="top-right"
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      theme={theme}
      toastOptions={{ closeButtonAriaLabel: "Fechar notificação" }}
    />
  );
}
