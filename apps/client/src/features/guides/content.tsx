import { parseMarkdown } from "@zeta/guide-content";
export function GuideContent({ markdown }: { markdown: string }) {
  let blocks;
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
          return <p key={index}>{block.text}</p>;
        }
        if (block.level === 1) {
          return <h1 key={index}>{block.text}</h1>;
        }
        if (block.level === 2) {
          return <h2 key={index}>{block.text}</h2>;
        }
        return <h3 key={index}>{block.text}</h3>;
      })}
    </div>
  );
}
