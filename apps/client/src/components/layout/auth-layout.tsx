import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { ModeToggle } from "@/components/mode-toggle";
import { Card } from "@/components/ui/card";
import { pagePadding } from "./page-content";

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main
      className={`flex min-h-svh flex-col items-center justify-center bg-sidebar ${pagePadding}`}
    >
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-5 sm:right-8">
        <ModeToggle />
      </div>
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <section aria-labelledby="auth-title">
          <Card className="p-6 shadow-none sm:p-8">
            <h1
              className="font-semibold text-2xl tracking-tight"
              id="auth-title"
            >
              {title}
            </h1>
            <p className="mt-2 mb-7 text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
            {children}
            <div className="mt-6 border-t pt-5 text-center text-muted-foreground text-sm">
              {footer}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
