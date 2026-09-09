import { ModeToggle } from "@/components/mode-toggle";
import type { ReactNode } from "react";
import { pagePadding } from "./page-content";
import { Brand } from "@/components/brand";

export function AuthLayout({ title, description, children, footer }: {
  title: string; description: string; children: ReactNode; footer: ReactNode;
}) {
  return <main className={`flex min-h-svh flex-col items-center justify-center bg-sidebar ${pagePadding}`}>
    <div className="fixed right-5 top-[max(1rem,env(safe-area-inset-top))] sm:right-8"><ModeToggle /></div>
    <div className="w-full max-w-[400px]">
      <div className="mb-8 flex justify-center"><Brand className="[&_svg]:size-8 [&_span]:text-2xl" /></div>
      <section className="rounded-xl border bg-background p-6 sm:p-8" aria-labelledby="auth-title">
        <h1 id="auth-title" className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mb-7 mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {children}
        <div className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">{footer}</div>
      </section>
    </div>
  </main>;
}
