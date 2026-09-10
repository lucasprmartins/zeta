import { type GuideBlock, parseMarkdown } from "@zeta/guide-content";
import { useMemo } from "react";

// O índice e o corpo compartilham a mesma âncora; a posição garante unicidade entre títulos repetidos.
function headingId(text: string, index: number) {
  const slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "secao"}-${index + 1}`;
}

// Índice e corpo compartilham o mesmo resultado: a página interpreta uma vez.
export function useGuideBlocks(markdown: string) {
  return useMemo(() => {
    try {
      return { blocks: parseMarkdown(markdown), error: null };
    } catch (error) {
      return {
        blocks: [] as GuideBlock[],
        error: error instanceof Error ? error.message : "Conteúdo inválido.",
      };
    }
  }, [markdown]);
}

export type GuideBlocks = ReturnType<typeof useGuideBlocks>;

export function GuideContent({ parsed }: { parsed: GuideBlocks }) {
  const { blocks, error } = parsed;
  if (error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {error}
      </p>
    );
  }
  return (
    <div className="guide-content break-words">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          // biome-ignore lint/suspicious/noArrayIndexKey: os blocos vêm do Markdown a cada render, sem reordenação.
          return <p key={index}>{block.text}</p>;
        }
        const Heading = headingTags[block.level ?? 1];
        const id = headingId(block.text, index);
        return (
          <Heading id={id} key={id}>
            {block.text}
          </Heading>
        );
      })}
    </div>
  );
}

const headingTags = { 1: "h1", 2: "h2", 3: "h3" } as const;
const indent = { 1: "", 2: "pl-3", 3: "pl-6" } as const;

// Guias curtos não ganham nada com um índice: ele só aparece a partir de dois títulos.
export function GuideOutline({ parsed }: { parsed: GuideBlocks }) {
  const { blocks } = parsed;
  const headings = blocks.flatMap((block, index) =>
    block.type === "heading"
      ? [
          {
            id: headingId(block.text, index),
            text: block.text,
            level: block.level ?? 1,
          },
        ]
      : []
  );
  if (headings.length < 2) {
    return null;
  }
  const list = (
    <ul className="space-y-2.5">
      {headings.map((heading) => (
        <li className={indent[heading.level]} key={heading.id}>
          <a
            className="block rounded-sm text-muted-foreground text-sm leading-snug transition-colors hover:text-foreground"
            href={`#${heading.id}`}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <details className="rounded-lg border p-4 lg:hidden">
        <summary className="cursor-pointer font-medium text-sm">
          Nesta página
        </summary>
        <div className="mt-4">{list}</div>
      </details>
      <aside
        aria-label="Nesta página"
        className="hidden lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:block lg:self-start"
      >
        <p className="mb-4 font-medium text-[11px] text-muted-foreground uppercase tracking-widest">
          Nesta página
        </p>
        <nav className="border-l pl-4">{list}</nav>
      </aside>
    </>
  );
}
