import { expect, test } from "bun:test";
import type { GuideRepository } from "@server/domain/guides/contracts/guide-repository";
import type { Guide } from "@server/domain/guides/entities/guide";
import { type HelpSettings, helpService } from "@server/domain/help/help";
import { secretCipher } from "@server/infrastructure/ai/secret";

function guide(slug: string, permissions: string[] = []): Guide {
  const fields = {
    title: slug,
    section: "Uso",
    order: 0,
    permissions,
    markdown: `Conteúdo ${slug}`,
  };
  return {
    slug,
    draft: { ...fields, markdown: "rascunho privado" },
    published: fields,
    version: 1,
    updatedAt: "2026-09-10T00:00:00Z",
  };
}

function setup(items: Guide[], initialKey: string | null = "test-key") {
  let apiKey = initialKey;
  const settings: HelpSettings = {
    configured: () => Promise.resolve(apiKey !== null),
    apiKey: () => Promise.resolve(apiKey),
    save: (_actorId, key) => {
      apiKey = key;
      return Promise.resolve();
    },
  };
  const repository: GuideRepository = {
    find: () => Promise.resolve(null),
    insert: () => Promise.resolve(false),
    replace: () => Promise.resolve(false),
    list: (page) =>
      Promise.resolve({
        items: items.slice(page - 1, page),
        hasMore: page < items.length,
      }),
  };
  return helpService(settings, repository);
}

test("a ajuda filtra publicações por acesso mesmo com repositório permissivo e percorre páginas", async () => {
  const draft = { ...guide("oculto"), published: null };
  const service = setup([
    guide("público"),
    guide("restrito", ["tasks:delete"]),
    draft,
    guide("final"),
  ]);
  const input = await service.prepare("Como uso?", []);
  expect(input.instructions).toContain("Conteúdo público");
  expect(input.instructions).toContain("Conteúdo final");
  expect(input.instructions).not.toContain("Conteúdo restrito");
  expect(input.instructions).not.toContain("rascunho privado");
  expect(
    (await service.prepare("Como excluir?", ["tasks:delete"])).instructions
  ).toContain("Conteúdo restrito");
});

test("perguntas não geram memória e revogação retira conteúdo na próxima requisição", async () => {
  const service = setup([
    guide("público"),
    guide("restrito", ["tasks:delete"]),
  ]);
  await service.prepare("primeira pergunta", ["tasks:delete"]);
  const second = await service.prepare("segunda pergunta", []);
  expect(second.prompt).toBe("segunda pergunta");
  expect(second.instructions).not.toContain("primeira pergunta");
  expect(second.instructions).not.toContain("Conteúdo restrito");
});

test("recusa perguntas inválidas, ausência de guias/chave e contexto excessivo", async () => {
  const service = setup([guide("público")]);
  await expect(service.prepare(" ", [])).rejects.toThrow("até 2000");
  await expect(service.prepare("x".repeat(2001), [])).rejects.toThrow(
    "até 2000"
  );
  await expect(setup([]).prepare("ajuda", [])).rejects.toThrow(
    "Ainda não há guias"
  );
  await expect(setup([], null).prepare("ajuda", [])).rejects.toThrow(
    "não foi configurada"
  );
  const huge = guide("grande");
  if (huge.published) {
    huge.published.markdown = "x".repeat(250_001);
  }
  await expect(setup([huge]).prepare("ajuda", [])).rejects.toThrow(
    "excede o limite"
  );
});

test("status nunca retorna a chave e remoção desativa o chat", async () => {
  const service = setup([]);
  expect(await service.status()).toEqual({ configured: true });
  await expect(service.save("admin", "curta")).rejects.toThrow(
    "chave de API válida"
  );
  expect(await service.save("admin", null)).toEqual({ configured: false });
  expect(await service.status()).toEqual({ configured: false });
});

test("segredo usa IV aleatório e rejeita chave ou conteúdo adulterado", async () => {
  const cipher = await secretCipher(
    "test-secret-at-least-thirty-two-characters"
  );
  const first = await cipher.encrypt("sk-private-test-key");
  const second = await cipher.encrypt("sk-private-test-key");
  expect(first).not.toBe(second);
  expect(first).not.toContain("sk-private-test-key");
  expect(await cipher.decrypt(first)).toBe("sk-private-test-key");
  await expect(
    (await secretCipher("different-secret")).decrypt(first)
  ).rejects.toThrow();
  await expect(cipher.decrypt(first.slice(0, -8))).rejects.toThrow();
});
