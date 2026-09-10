// Sem Radix: a troca por iniciais usa o onError nativo da imagem, para não
// custar uma dependência de produção.

import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, useState } from "react";
import { initials } from "@/lib/names";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border bg-muted font-medium text-muted-foreground uppercase",
  {
    variants: {
      size: {
        sm: "size-6 text-[10px]",
        default: "size-8 text-xs",
      },
    },
    defaultVariants: { size: "default" },
  }
);
// A classe dimensiona; os atributos evitam deslocamento enquanto a foto carrega.
const pixels = { sm: 24, default: 32 } as const;

export function Avatar({
  name,
  image,
  size,
  className,
  ...props
}: Omit<ComponentProps<"span">, "children"> &
  VariantProps<typeof avatarVariants> & {
    name: string;
    image?: string | null | undefined;
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

// O anel separa os avatares sobrepostos: passe a cor da superfície de fundo.
export function AvatarStack({
  people,
  limit,
  ring = "ring-background",
}: {
  people: readonly {
    id: string;
    name: string;
    image?: string | null | undefined;
  }[];
  limit: number;
  ring?: string;
}) {
  return (
    <span className="flex shrink-0 -space-x-1.5">
      {people.slice(0, limit).map((person) => (
        <Avatar
          className={cn("ring-2", ring)}
          image={person.image}
          key={person.id}
          name={person.name}
          size="sm"
        />
      ))}
    </span>
  );
}
