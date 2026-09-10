import { useEffect, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { parseMarkdown, toMarkdown, type GuideBlock } from "@zeta/guide-content";
import { ArrowCounterClockwiseIcon, ArrowClockwiseIcon, PlusIcon } from "@phosphor-icons/react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
function document(markdown: string): JSONContent {
  const content = parseMarkdown(markdown).map((block) => ({ type: block.type, ...(block.type === "heading" ? { attrs: { level: block.level } } : {}), ...(block.text ? { content: [{ type: "text", text: block.text }] } : {}) }));
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}
export function BlockEditor({ initial, disabled, onChange }: { initial: string; disabled: boolean; onChange: (markdown: string) => void }) {
  const [blockType, setBlockType] = useState("paragraph");
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] }, blockquote: false, bold: false, bulletList: false, code: false, codeBlock: false, hardBreak: false, horizontalRule: false, italic: false, link: false, listItem: false, listKeymap: false, orderedList: false, strike: false, underline: false })],
    content: document(initial),
    editorProps: { attributes: { class: "guide-content min-h-80 p-5 sm:p-8 outline-none", role: "textbox", "aria-label": "Conteúdo do guia", "aria-multiline": "true" } },
    onSelectionUpdate: ({ editor }) => setBlockType(editor.isActive("heading") ? String(editor.getAttributes("heading").level) : "paragraph"),
    onUpdate: ({ editor }) => {
      const blocks: GuideBlock[] = (editor.getJSON().content ?? []).map((block) => ({ type: block.type === "heading" ? "heading" : "paragraph", ...(block.type === "heading" ? { level: block.attrs?.level as 1 | 2 | 3 } : {}), text: (block.content ?? []).map((text) => "text" in text ? text.text : "").join("") }));
      onChange(toMarkdown(blocks));
      setBlockType(editor.isActive("heading") ? String(editor.getAttributes("heading").level) : "paragraph");
    },
  });
  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);
  return <div className="overflow-hidden rounded-lg border focus-within:ring-2 focus-within:ring-ring/20">
    <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 p-2" role="toolbar" aria-label="Blocos do guia">
      <NativeSelect aria-label="Tipo do bloco" className="w-36" value={blockType} disabled={disabled || !editor} onChange={(event) => {
        const value = event.target.value; setBlockType(value);
        if (value === "paragraph") editor?.chain().focus().setParagraph().run(); else editor?.chain().focus().setHeading({ level: Number(value) as 1 | 2 | 3 }).run();
      }}><NativeSelectOption value="paragraph">Texto</NativeSelectOption><NativeSelectOption value="1">Título H1</NativeSelectOption><NativeSelectOption value="2">Título H2</NativeSelectOption><NativeSelectOption value="3">Título H3</NativeSelectOption></NativeSelect>
      <Button variant="ghost" size="sm" disabled={disabled || !editor} onClick={() => editor?.chain().focus().insertContentAt(editor.state.doc.content.size, { type: "paragraph" }).focus("end").run()}><PlusIcon size={18} />Novo bloco</Button>
      <Button variant="ghost" size="icon" aria-label="Desfazer" disabled={disabled || !editor} onClick={() => editor?.chain().focus().undo().run()}><ArrowCounterClockwiseIcon size={18} /></Button>
      <Button variant="ghost" size="icon" aria-label="Refazer" disabled={disabled || !editor} onClick={() => editor?.chain().focus().redo().run()}><ArrowClockwiseIcon size={18} /></Button>
    </div>
    <EditorContent editor={editor} />
    <p className="border-t px-4 py-3 text-xs text-muted-foreground">Enter cria um novo bloco. Digite #, ## ou ### e espaço para criar um título.</p>
  </div>;
}
