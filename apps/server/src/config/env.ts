import { readLogLevel } from "@zeta/logger";

export function readEnv(env: Record<string, string | undefined>) {
  const required = (key: string) => {
    const value = env[key]?.trim();
    if (!value) {
      throw new Error(`Variável obrigatória ausente: ${key}`);
    }
    return value;
  };

  const databaseUrl = required("DATABASE_URL");
  if (!["postgres:", "postgresql:"].includes(new URL(databaseUrl).protocol)) {
    throw new Error("DATABASE_URL deve apontar para PostgreSQL.");
  }
  const authUrl = new URL(required("BETTER_AUTH_URL"));
  if (!["http:", "https:"].includes(authUrl.protocol)) {
    throw new Error("BETTER_AUTH_URL deve ser uma URL HTTP(S).");
  }
  const authSecret = required("BETTER_AUTH_SECRET");
  if (
    authSecret.length < 32 ||
    authSecret === "replace-with-a-random-secret-at-least-32-characters"
  ) {
    throw new Error(
      "BETTER_AUTH_SECRET deve ser um segredo aleatório com pelo menos 32 caracteres."
    );
  }
  const port = Number(env.PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT deve ser um inteiro entre 1 e 65535.");
  }
  const logLevel = readLogLevel(env.LOG_LEVEL);
  const trustedOrigins = (env.TRUSTED_ORIGINS ?? authUrl.origin)
    .split(",")
    .map((value) => {
      const origin = new URL(value.trim());
      if (
        !["http:", "https:"].includes(origin.protocol) ||
        origin.pathname !== "/" ||
        origin.search ||
        origin.hash
      ) {
        throw new Error(
          "TRUSTED_ORIGINS deve conter origens HTTP(S) separadas por vírgula."
        );
      }
      return origin.origin;
    });
  return {
    databaseUrl,
    authUrl: authUrl.origin,
    authSecret,
    logLevel,
    port,
    trustedOrigins,
  };
}

export type Env = ReturnType<typeof readEnv>;
