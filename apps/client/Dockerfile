FROM oven/bun:1.4.2 AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/client/package.json ./apps/client/package.json
COPY packages/access/package.json ./packages/access/package.json
RUN bun install --frozen-lockfile
COPY . .
RUN bun run --filter @zeta/client build

FROM oven/bun:1.4.2 AS runtime
WORKDIR /app/apps/client
ENV NODE_ENV=production
COPY --from=build /app/apps/client/dist ./dist
COPY --from=build /app/apps/client/server ./server
USER bun
EXPOSE 3001
CMD ["bun", "server/main.ts"]
