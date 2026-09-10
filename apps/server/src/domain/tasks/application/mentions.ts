import type { TaskUser } from "../contracts/user-directory";
import { InvalidTaskError } from "../entities/task";

// Só indica quem existe: o identificador vem do navegador e não é confiável.
// Recebe as contas já resolvidas para a gravação não repetir a mesma consulta.
export function assertKnownMentions(
  mentions: readonly string[],
  known: ReadonlyMap<string, TaskUser>
): void {
  if (mentions.some((mention) => !known.has(mention))) {
    throw new InvalidTaskError(
      "Conta indicada como responsável não encontrada."
    );
  }
}
