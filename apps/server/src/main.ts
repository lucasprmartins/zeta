import { bootstrap } from "./bootstrap";
import { readEnv } from "./config/env";

const env = readEnv(process.env);
const { app, closeDatabase } = await bootstrap(env);

try {
  app.listen({ port: env.port, hostname: "::" });
} catch (error) {
  await closeDatabase();
  throw error;
}
console.info(`API disponível em http://localhost:${env.port}`);

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  try {
    await app.stop();
    await closeDatabase();
    clearTimeout(timeout);
  } catch (error) {
    console.error("Falha ao encerrar a API", error);
    process.exit(1);
  }
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
