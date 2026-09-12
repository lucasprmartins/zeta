FROM oven/bun:1.4.2 AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/client/package.json ./apps/client/package.json
COPY packages/access/package.json ./packages/access/package.json
COPY packages/guide-content/package.json ./packages/guide-content/package.json
COPY packages/logger/package.json ./packages/logger/package.json
RUN bun install --frozen-lockfile
COPY . .
RUN bun run --filter @zeta/server build

FROM oven/bun:1.4.2 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/client/package.json ./apps/client/package.json
COPY packages/access/package.json ./packages/access/package.json
COPY packages/guide-content/package.json ./packages/guide-content/package.json
COPY packages/logger/package.json ./packages/logger/package.json
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.4.2 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/ ./
COPY --from=build /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build /app/apps/server/tsconfig.json ./apps/server/tsconfig.json
COPY --from=build /app/apps/server/dist ./apps/server/dist
# Bun e as dependências são usados pelo migrador no pré-deploy.
# A API inicia diretamente pelo executável com runtime e dependências incorporados.
COPY --from=build /app/apps/server/src ./apps/server/src
COPY --from=build /app/apps/server/scripts ./apps/server/scripts
COPY --from=build /app/packages/access/src ./packages/access/src
COPY --from=build /app/packages/guide-content/src ./packages/guide-content/src
COPY --from=build /app/packages/logger/src ./packages/logger/src
USER bun
EXPOSE 3000
CMD ["./apps/server/dist/server"]
