import Markdown from "react-markdown";

const allowedElements = [
  "p",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "a",
  "code",
  "pre",
  "blockquote",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
];

export function HelpAnswer({ text }: { text: string }) {
  return (
    <div className="chat-markdown">
      <Markdown
        allowedElements={allowedElements}
        components={{
          a: ({ href, children }) =>
            href ? <a href={href}>{children}</a> : <span>{children}</span>,
        }}
        skipHtml
      >
        {text}
      </Markdown>
    </div>
  );
}
