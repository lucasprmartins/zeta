import { ArrowLeftIcon } from "@phosphor-icons/react";
import { createLink, type LinkComponent } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Retorno padrão das páginas internas: botão fantasma alinhado à margem do conteúdo.
function BackAnchor({ className, children, ...props }: ComponentProps<"a">) {
  return (
    <a
      className={cn(
        buttonVariants({
          variant: "ghost",
          size: "sm",
          className:
            "-ml-3 w-fit self-start px-3 text-muted-foreground hover:text-foreground",
        }),
        className
      )}
      {...props}
    >
      <ArrowLeftIcon aria-hidden="true" size={18} />
      {children}
    </a>
  );
}

const CreatedBackLink = createLink(BackAnchor);
export const BackLink: LinkComponent<typeof BackAnchor> = (props) => (
  <CreatedBackLink {...props} />
);
