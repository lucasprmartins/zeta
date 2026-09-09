// Adaptado do shadcn/ui (MIT), usando o tema local e Phosphor Icons.
import type { CSSProperties } from "react";
import { CheckCircleIcon, InfoIcon, SpinnerGapIcon, WarningCircleIcon, WarningIcon } from "@phosphor-icons/react";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function Toaster() {
  const { theme } = useTheme();
  return <Sonner theme={theme} position="top-right" closeButton duration={5000}
    containerAriaLabel="Notificações" className="toaster group"
    offset="max(20px, env(safe-area-inset-top))"
    mobileOffset={{ top: "max(16px, env(safe-area-inset-top))", left: "16px", right: "16px" }}
    icons={{
      success: <CheckCircleIcon className="size-[18px]" aria-hidden="true" />,
      error: <WarningCircleIcon className="size-[18px]" aria-hidden="true" />,
      info: <InfoIcon className="size-[18px]" aria-hidden="true" />,
      warning: <WarningIcon className="size-[18px]" aria-hidden="true" />,
      loading: <SpinnerGapIcon className="size-[18px] animate-spin" aria-hidden="true" />,
    }}
    toastOptions={{ closeButtonAriaLabel: "Fechar notificação" }}
    style={{ "--normal-bg": "var(--card)", "--normal-text": "var(--card-foreground)", "--normal-border": "var(--border)", "--border-radius": "var(--radius)" } as CSSProperties}
  />;
}
