export function supportPagePath(value: string, origin: string) {
  if (!value.trim()) {
    return;
  }
  let url: URL;
  try {
    url = new URL(value.trim(), origin);
  } catch (cause) {
    throw new Error("Informe uma página válida deste sistema.", { cause });
  }
  if (url.origin !== origin || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("Informe uma página deste sistema.");
  }
  return url.pathname;
}

export function supportAttachmentsError(files: readonly { size: number }[]) {
  if (
    files.length > 3 ||
    files.some((file) => file.size < 1 || file.size > 2 * 1024 * 1024) ||
    files.reduce((sum, file) => sum + file.size, 0) > 5 * 1024 * 1024
  ) {
    return "Selecione até 3 anexos, com até 2 MB cada e 5 MB no total.";
  }
  return null;
}
