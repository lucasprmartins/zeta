import { CaretRightIcon } from "@phosphor-icons/react";
import { Link, type LinkProps, useMatches } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { cn } from "@/lib/utils";

// Cada rota declara a trilha inteira até ela; o último item é a página aberta.
export type Crumb = { label: string; to?: LinkProps["to"] };
declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    crumbs?: Crumb[];
  }
}

const PageCrumbContext = createContext<{
  label: string | undefined;
  setLabel: (label: string | undefined) => void;
} | null>(null);

export function PageCrumbProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | undefined>(undefined);
  return (
    <PageCrumbContext value={{ label, setLabel }}>{children}</PageCrumbContext>
  );
}

// Páginas cujo título só existe depois da consulta nomeiam o último item da trilha.
export function usePageCrumb(label: string | undefined) {
  const setLabel = useContext(PageCrumbContext)?.setLabel;
  useEffect(() => {
    setLabel?.(label);
    return () => setLabel?.(undefined);
  }, [label, setLabel]);
}

export function Breadcrumbs() {
  const matches = useMatches();
  const override = useContext(PageCrumbContext)?.label;
  const crumbs = matches.flatMap((match) => match.staticData.crumbs ?? []);
  if (crumbs.length === 0) {
    return null;
  }
  const last = crumbs.length - 1;
  return (
    <nav aria-label="Localização" className="min-w-0 text-xs">
      <ol className="flex items-center gap-2">
        {crumbs.map((crumb, index) => {
          const current = index === last;
          return (
            <li
              className={cn(
                "items-center gap-2",
                // Abaixo de 640 px só a página atual cabe ao lado do menu.
                current ? "flex min-w-0" : "hidden sm:flex"
              )}
              key={crumb.to ?? crumb.label}
            >
              {index > 0 && (
                <CaretRightIcon
                  aria-hidden="true"
                  className="hidden size-3 shrink-0 text-muted-foreground sm:block"
                />
              )}
              {current ? (
                <span aria-current="page" className="truncate font-medium">
                  {override ?? crumb.label}
                </span>
              ) : crumb.to ? (
                <Link
                  className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
                  to={crumb.to}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-muted-foreground">{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
