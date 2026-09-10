import { expect, test } from "bun:test";
import {
  profileUpdate,
  profileUsername,
} from "../src/features/profile/profile-fields";

test("alterar username envia também o nome de exibição", () => {
  const user = {
    name: "Pessoa",
    username: "before",
    displayUsername: "Before",
  };
  expect(profileUpdate(user, " Pessoa ", " After ")).toEqual({
    name: "Pessoa",
    username: "After",
    displayUsername: "After",
  });
  expect(profileUpdate(user, "Novo nome", "Before")).toEqual({
    name: "Novo nome",
  });
  expect(profileUpdate(user, "Pessoa", "BEFORE")).toEqual({
    name: "Pessoa",
    username: "BEFORE",
    displayUsername: "BEFORE",
  });
});

test("perfil exibe o identificador válido em contas com displayUsername antigo", () => {
  expect(
    profileUsername({
      name: "Pessoa",
      username: "after",
      displayUsername: "Before",
    })
  ).toBe("after");
  expect(
    profileUsername({
      name: "Pessoa",
      username: "after",
      displayUsername: "After",
    })
  ).toBe("After");
  expect(profileUsername({ name: "Pessoa" })).toBe("");
  expect(profileUpdate({ name: "Pessoa" }, "Pessoa", "")).toEqual({
    name: "Pessoa",
  });
});
