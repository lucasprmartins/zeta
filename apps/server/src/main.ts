import { createLogger } from "@zeta/logger";
import { bootstrap } from "./bootstrap";
import { readEnv } from "./config/env";

const env = readEnv(process.env);
const logger = createLogger({
  service: "zeta-api",
  level: env.logLevel,
  pretty: process.env.NODE_ENV !== "production",
});
const { app, closeDatabase } = await bootstrap(env, logger);

try {
  app.listen({ port: env.port, hostname: "::" });
} catch (error) {
  await closeDatabase();
  throw error;
}
logger.info({ port: env.port }, "API disponível");

let stopping = false;
async function shutdown() {
  if (stopping) {
    return;
  }
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  try {
    logger.info("Encerrando API");
    await app.stop();
    await closeDatabase();
    clearTimeout(timeout);
  } catch (error) {
    logger.error({ err: error }, "Falha ao encerrar a API");
    process.exit(1);
  }
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
