import { expect, test } from "bun:test";
import { routeErrorMessage } from "../src/lib/route-error";

test("extrai mensagem sem serializar stack ou dados extras", () => {
  const error = new Error("Falha ao abrir a página", {
    cause: { token: "private" },
  });
  expect(routeErrorMessage(error)).toBe("Falha ao abrir a página");
  expect(routeErrorMessage({ response: { token: "private" } })).toBe(
    "Não foi possível concluir o carregamento da página."
  );
  expect(routeErrorMessage("   ")).toBe(
    "Não foi possível concluir o carregamento da página."
  );
  expect(routeErrorMessage("x".repeat(3000))).toHaveLength(2000);
});
