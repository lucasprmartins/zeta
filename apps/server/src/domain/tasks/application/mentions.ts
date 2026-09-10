import type { UserDirectory } from "../contracts/user-directory";
import { InvalidTaskError } from "../entities/task";

// Só indica quem existe: o identificador vem do navegador e não é confiável.
export async function assertKnownMentions(
  mentions: readonly string[],
  directory: UserDirectory
): Promise<void> {
  if (mentions.length === 0) {
    return;
  }
  const known = await directory.byIds(mentions);
  if (known.length !== mentions.length) {
    throw new InvalidTaskError(
      "Conta indicada como responsável não encontrada."
    );
  }
}
