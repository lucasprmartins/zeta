import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  // Rótulo curto acima do título, como a seção de um guia.
  eyebrow?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        {description && (
          <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
          {actions}
        </div>
      )}
    </div>
  );
}
