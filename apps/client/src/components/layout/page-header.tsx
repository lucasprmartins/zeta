import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></div>
    {actions && <div className="flex w-full shrink-0 items-center gap-2 [&>*]:flex-1 sm:w-auto sm:[&>*]:flex-none">{actions}</div>}
  </div>;
}
