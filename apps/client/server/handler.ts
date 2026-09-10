import { join } from "node:path";

const apiPaths = ["/api", "/rpc", "/openapi", "/health", "/ready"];
const hopHeaders = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

function endToEndHeaders(source: Headers) {
  const headers = new Headers(source);
  for (const name of (headers.get("connection") ?? "").split(",")) {
    if (name.trim()) {
      headers.delete(name.trim());
    }
  }
  for (const name of hopHeaders) {
    headers.delete(name);
  }
  return headers;
}

export async function createClientHandler(options: {
  directory: string;
  apiOrigin: string;
  publicOrigin: string;
}) {
  const apiOrigin = new URL(options.apiOrigin);
  const publicOrigin = new URL(options.publicOrigin);
  if (
    !(
      ["http:", "https:"].includes(apiOrigin.protocol) &&
      ["http:", "https:"].includes(publicOrigin.protocol)
    )
  ) {
    throw new Error("As origens do cliente e da API devem usar HTTP(S).");
  }
  // Só arquivos presentes no build entram no mapa; URLs nunca viram caminhos de disco.
  const files = new Map<string, ReturnType<typeof Bun.file>>();
  for await (const path of new Bun.Glob("**/*").scan({
    cwd: options.directory,
    onlyFiles: true,
  })) {
    if (path.split("/").some((part) => part.startsWith("."))) {
      continue;
    }
    files.set(`/${path}`, Bun.file(join(options.directory, path)));
  }
  const index = files.get("/index.html");
  if (!index) {
    throw new Error("Build do cliente não encontrado. Execute bun run build.");
  }

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (
      url.pathname === "/_health" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      return new Response(
        request.method === "HEAD" ? null : '{"status":"ok"}',
        { headers: { "content-type": "application/json" } }
      );
    }
    if (
      apiPaths.some(
        (path) => url.pathname === path || url.pathname.startsWith(`${path}/`)
      )
    ) {
      const target = new URL(apiOrigin.origin);
      target.pathname = url.pathname;
      target.search = url.search;
      const headers = endToEndHeaders(request.headers);
      headers.delete("host");
      headers.delete("content-length");
      headers.delete("forwarded");
      headers.delete("x-forwarded-for");
      headers.set("x-forwarded-host", publicOrigin.host);
      headers.set("x-forwarded-proto", publicOrigin.protocol.slice(0, -1));
      try {
        const response = await fetch(target, {
          method: request.method,
          headers,
          body:
            request.method === "GET" || request.method === "HEAD"
              ? null
              : request.body,
          redirect: "manual",
          decompress: false,
          signal: AbortSignal.any([
            request.signal,
            AbortSignal.timeout(30_000),
          ]),
        });
        const responseHeaders = endToEndHeaders(response.headers);
        responseHeaders.set("cache-control", "no-store");
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } catch {
        return Response.json(
          { message: "API indisponível." },
          { status: 502, headers: { "cache-control": "no-store" } }
        );
      }
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    const asset = files.get(pathname);
    if (asset) {
      return new Response(request.method === "HEAD" ? null : asset, {
        headers: {
          "content-type": asset.type,
          "cache-control": pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "no-cache",
        },
      });
    }
    // Arquivos ausentes retornam 404; somente navegações HTML recebem o fallback SPA.
    if (
      !pathname.split("/").some((part) => part.includes(".")) &&
      request.headers.get("accept")?.includes("text/html")
    ) {
      return new Response(request.method === "HEAD" ? null : index, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-cache",
        },
      });
    }
    return new Response("Not found", { status: 404 });
  };
}
