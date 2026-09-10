// Equivalente ao Avatar do shadcn/ui sem Radix: a troca por iniciais usa o
// onError nativo da imagem, evitando uma dependência de produção só para isso.

import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, useState } from "react";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border bg-muted font-medium text-muted-foreground uppercase",
  {
    variants: {
      size: {
        sm: "size-6 text-[10px]",
        default: "size-8 text-xs",
        lg: "size-10 text-sm",
      },
    },
    defaultVariants: { size: "default" },
  }
);
// A classe dimensiona; os atributos evitam deslocamento enquanto a foto carrega.
const pixels = { sm: 24, default: 32, lg: 40 } as const;

export function Avatar({
  name,
  image,
  size,
  className,
  ...props
}: Omit<ComponentProps<"span">, "children"> &
  VariantProps<typeof avatarVariants> & {
    name: string;
    image?: string | null;
  }) {
  const [broken, setBroken] = useState(false);
  const side = pixels[size ?? "default"];
  return (
    <span
      className={cn(avatarVariants({ size, className }))}
      data-slot="avatar"
      {...props}
    >
      {image && !broken ? (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError não é interação do usuário, é o fallback da imagem.
        <img
          alt=""
          className="size-full object-cover"
          height={side}
          loading="lazy"
          onError={() => setBroken(true)}
          src={image}
          width={side}
        />
      ) : (
        // O nome acessível vem do texto ao lado; aqui a inicial é decorativa.
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
