import { expect, test } from "bun:test";
import { initials, shortName } from "../src/lib/names";

test("as iniciais do avatar cobrem nomes de uma, várias e nenhuma palavra", () => {
  expect(initials("Ana Souza")).toBe("AS");
  // Nomes do meio não entram: primeira e última palavra bastam para distinguir.
  expect(initials("Ana Maria de Souza")).toBe("AS");
  expect(initials("Ana")).toBe("A");
  expect(initials("  Ana   Souza  ")).toBe("AS");
  // Uma conta sem nome ainda precisa renderizar algo estável.
  expect(initials("   ")).toBe("?");
  expect(initials("")).toBe("?");
  // Acentos e caracteres fora do ASCII são preservados; a caixa vem do CSS.
  expect(initials("Ângela Ótimo")).toBe("ÂÓ");
});

test("o rótulo curto distingue contas que compartilham o primeiro nome", () => {
  // O caso real: duas contas diferentes apareciam como "Lucas" no mesmo eixo.
  expect(shortName("Lucas")).toBe("Lucas");
  expect(shortName("Lucas juvenal")).toBe("Lucas J.");
  expect(shortName("Lucas")).not.toBe(shortName("Lucas juvenal"));
  expect(shortName("Ana Maria de Souza")).toBe("Ana S.");
  expect(shortName("  Bruno  ")).toBe("Bruno");
  expect(shortName("Extraordinariamente Longo")).toBe("Extraordinar… L.");
});
