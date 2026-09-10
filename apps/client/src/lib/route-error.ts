export function routeErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  // Exiba apenas a mensagem: nunca serialize stack, cause ou o objeto de resposta.
  return (
    message.trim().slice(0, 2000) ||
    "Não foi possível concluir o carregamento da página."
  );
}
