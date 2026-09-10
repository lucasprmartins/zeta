import type { ReactNode } from "react";

export const pagePadding = "px-5 py-7 sm:px-8 sm:py-9";

// Espaçamento único para as páginas autenticadas, independente da funcionalidade.
export function PageContent({ children }: { children: ReactNode }) {
  return (
    <div className={`mx-auto w-full max-w-7xl space-y-7 ${pagePadding}`}>
      {children}
    </div>
  );
}
