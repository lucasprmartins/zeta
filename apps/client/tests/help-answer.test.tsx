import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HelpAnswer } from "../src/features/help/help-answer";

test("respostas renderizam negrito, itálico e listas dentro do balão", () => {
  const html = renderToStaticMarkup(
    <HelpAnswer
      text={
        "**Importante**: use *Tarefas*.\n\n- Primeiro item\n- Segundo item\n\n1. Abra o menu\n2. Salve"
      }
    />
  );
  expect(html).toContain("<strong>Importante</strong>");
  expect(html).toContain("<em>Tarefas</em>");
  expect(html).toContain("<ul>");
  expect(html).toContain("<ol>");
  expect(html).toContain("<li>Primeiro item</li>");
  expect(html).not.toContain("**Importante**");
});

test("HTML, imagens e links executáveis não são renderizados", () => {
  const html = renderToStaticMarkup(
    <HelpAnswer
      text={
        '<script>alert(1)</script>\n\n<img src="https://example.com/tracker" onerror="alert(1)">\n\n![imagem](https://example.com/image)\n\n[Perigoso](javascript:alert%281%29)\n\n[Guia](/help/guides)'
      }
    />
  );
  expect(html).not.toContain("<script");
  expect(html).not.toContain("<img");
  expect(html).not.toContain("onerror");
  expect(html).not.toContain("javascript:");
  expect(html).toContain("<span>Perigoso</span>");
  expect(html).toContain('<a href="/help/guides">Guia</a>');
});

test("Markdown parcial durante streaming continua renderizável", () => {
  const source = "**Importante**\n\n- Abra o menu\n- Salve";
  for (let end = 1; end <= source.length; end++) {
    expect(() =>
      renderToStaticMarkup(<HelpAnswer text={source.slice(0, end)} />)
    ).not.toThrow();
  }
});
