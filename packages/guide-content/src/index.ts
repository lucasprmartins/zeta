// Subconjunto inicial: parágrafos e títulos H1/H2/H3, sem HTML executável.
export type GuideBlock = { type: "paragraph" | "heading"; text: string; level?: 1 | 2 | 3 };
const unescapeText = (text: string) => text.replace(/\\([\\!#>*+\-\d`~])/g, "$1");
export function parseMarkdown(markdown: string): GuideBlock[] {
  if (markdown.length > 50000) throw new Error("O conteúdo deve ter até 50 mil caracteres.");
  const blocks: GuideBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => { if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ") }); paragraph = []; };
  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    if (!line.trim()) { flush(); continue; }
    if (/^(?:#{4,}\s|```|~~~|>\s|[-*+]\s|\d+[.)]\s)/.test(line) || /(?<!\\)!\[[^\]]*\]\(/.test(line)) throw new Error("Use somente texto e títulos H1, H2 e H3. Imagens, listas e outros blocos ainda não são suportados.");
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) { flush(); blocks.push({ type: "heading", level: heading[1]!.length as 1 | 2 | 3, text: unescapeText(heading[2]!) }); }
    else paragraph.push(unescapeText(line));
  }
  flush();
  if (blocks.length > 1000) throw new Error("Use até 1000 blocos por guia.");
  return blocks;
}
export function toMarkdown(blocks: GuideBlock[]): string {
  return blocks.map((block) => {
    const text = block.text.replace(/\r?\n/g, " ").replace(/\\/g, "\\\\").replace(/!\[/g, "\\![");
    if (block.type === "heading") return `${"#".repeat(block.level ?? 1)} ${text}`;
    return text.replace(/^([#>*+\-\d`~])/, "\\$1");
  }).join("\n\n");
}
export function parseGuideFile(source: string) {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n"));
  if (!match) throw new Error("O arquivo precisa de metadados entre linhas --- no início.");
  const metadata: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    if (!line.trim()) continue;
    const field = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!field || !["slug", "title", "section", "order", "permission"].includes(field[1]!) || field[1]! in metadata) throw new Error("Metadado inválido ou duplicado.");
    const value: unknown = field[2]!.startsWith('"') ? JSON.parse(field[2]!) : field[2]!;
    if (typeof value !== "string") throw new Error("Metadados textuais inválidos.");
    metadata[field[1]!] = value;
  }
  const markdown = toMarkdown(parseMarkdown(match[2]!));
  return { slug: metadata.slug ?? "", draft: { title: metadata.title ?? "", section: metadata.section ?? "", order: metadata.order ? Number(metadata.order) : 0, permission: metadata.permission || null, markdown } };
}
