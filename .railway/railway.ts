import { defineRailway, postgres, project, service } from "railway/iac";

// Execute plan/apply no projeto e ambiente selecionados pelo CLI.
// As variáveis compartilhadas PUBLIC_URL e BETTER_AUTH_SECRET são configuradas no Railway.
export default defineRailway((ctx) => {
  const database = postgres("postgres");

  const server = service("server", {
    root: "/",
    build: { builder: "DOCKERFILE", dockerfilePath: "apps/server/Dockerfile" },
    preDeploy: "bun run --cwd apps/server db:migrate",
    healthcheck: "/ready",
    env: {
      NODE_ENV: "production",
      PORT: "3000",
      DATABASE_URL: database.env.DATABASE_URL,
      BETTER_AUTH_URL: ctx.shared.PUBLIC_URL,
      TRUSTED_ORIGINS: ctx.shared.PUBLIC_URL,
      BETTER_AUTH_SECRET: ctx.shared.BETTER_AUTH_SECRET,
    },
  });

  const client = service("client", {
    root: "/",
    build: { builder: "DOCKERFILE", dockerfilePath: "apps/client/Dockerfile" },
    healthcheck: "/_health",
    env: {
      NODE_ENV: "production",
      PORT: "3001",
      PUBLIC_URL: ctx.shared.PUBLIC_URL,
      API_HOST: server.env.RAILWAY_PRIVATE_DOMAIN,
      API_PORT: server.env.PORT,
    },
  });

  // Sem source: permite enviar este repositório com railway up --service <nome>.
  // Para deploy via GitHub, defina source: github("owner/repo", { branch: "main" })
  // nos dois serviços, mantendo a raiz do monorepo como contexto do build.
  return project(ctx.projectName ?? "zeta", { resources: [database, server, client] });
});
