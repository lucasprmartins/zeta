// Aceita somente destinos internos; nunca redireciona o login para outra origem.
export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    [...value].some((character) => character.charCodeAt(0) <= 32)
  ) {
    return "/dashboard";
  }
  const url = new URL(value, "https://app.invalid");
  if (
    url.origin !== "https://app.invalid" ||
    ["/login", "/register"].includes(url.pathname)
  ) {
    return "/dashboard";
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
