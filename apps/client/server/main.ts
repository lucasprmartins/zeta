import { createLogger, readLogLevel } from "@zeta/logger";
import { createClientHandler } from "./handler";

const apiHost = process.env.API_HOST;
const apiPort = Number(process.env.API_PORT ?? "3000");
const port = Number(process.env.PORT ?? "3001");
const publicUrl = process.env.PUBLIC_URL;
const logger = createLogger({
  service: "zeta-client",
  level: readLogLevel(process.env.LOG_LEVEL),
  pretty: process.env.NODE_ENV !== "production",
});
if (!(apiHost && publicUrl)) {
  throw new Error("API_HOST e PUBLIC_URL são obrigatórias.");
}
if (!/^[a-zA-Z0-9.-]+$/.test(apiHost)) {
  throw new Error("API_HOST deve ser um hostname.");
}
for (const value of [port, apiPort]) {
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error("As portas devem estar entre 1 e 65535.");
  }
}
const server = Bun.serve({
  hostname: "::",
  port,
  fetch: await createClientHandler({
    directory: new URL("../dist", import.meta.url).pathname,
    apiOrigin: `http://${apiHost}:${apiPort}`,
    publicOrigin: publicUrl,
    logger,
  }),
});
logger.info({ port: server.port }, "Cliente disponível");
let stopping = false;
async function shutdown() {
  if (stopping) {
    return;
  }
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  try {
    logger.info("Encerrando cliente");
    await server.stop();
    clearTimeout(timeout);
  } catch (error) {
    logger.error({ err: error }, "Falha ao encerrar o cliente");
    process.exit(1);
  }
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
