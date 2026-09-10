import { parseMarkdown } from "@zeta/guide-content";
export function GuideContent({ markdown }: { markdown: string }) {
  let blocks: ReturnType<typeof parseMarkdown>;
  try {
    blocks = parseMarkdown(markdown);
  } catch (error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {error instanceof Error ? error.message : "Conteúdo inválido."}
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
        if (block.level === 1) {
          // biome-ignore lint/suspicious/noArrayIndexKey: os blocos vêm do Markdown a cada render, sem reordenação.
          return <h1 key={index}>{block.text}</h1>;
        }
        if (block.level === 2) {
          // biome-ignore lint/suspicious/noArrayIndexKey: os blocos vêm do Markdown a cada render, sem reordenação.
          return <h2 key={index}>{block.text}</h2>;
        }
        // biome-ignore lint/suspicious/noArrayIndexKey: os blocos vêm do Markdown a cada render, sem reordenação.
        return <h3 key={index}>{block.text}</h3>;
      })}
    </div>
  );
}
