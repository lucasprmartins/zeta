# Deploy no Railway

[railway.ts](railway.ts) define o ambiente inteiro via `railway/iac`, dependência de desenvolvimento. Não use `railway.json` ou `railway.toml`. Operações usam o CLI global, conforme [AGENTS.md](../AGENTS.md).

```text
Navegador → HTTPS → client:3001 → rede privada → server:3000 → postgres
```

| Serviço | Runtime | Healthcheck |
| --- | --- | --- |
| `postgres` | PostgreSQL com persistência gerenciada | Railway |
| `server` | Executável Bun; imagem mantém Bun e dependências do migrador | `/ready` verifica o banco |
| `client` | Bun serve estáticos e proxy da API | `/_health` verifica processo e build |

Somente `client` recebe domínio público. Os serviços escutam em `::` para IPv6/IPv4; ambos os builds usam a raiz do monorepo e seus Dockerfiles em `apps/`. Preserve lockfile/workspaces no contexto de build e a mesma versão Bun nas imagens.

## Preparação

Requer Bun e Railway CLI compatível com IaC (mínimo documentado: 5.42.1). As versões fixadas estão nos manifests e Dockerfiles.

```sh
bun install --frozen-lockfile
railway login
railway link
railway status --json
```

Para projeto inexistente, execute `railway init` antes do vínculo. Confira projeto e ambiente antes de operações remotas. A definição gerencia **todo o ambiente**: incorpore recursos existentes antes de aplicar, pois omissões podem virar remoções.

Configure variáveis **compartilhadas do ambiente**, referenciadas por `ctx.shared`:

| Variável | Valor |
| --- | --- |
| `PUBLIC_URL` | Origem HTTPS do cliente, sem caminho nem barra final |
| `BETTER_AUTH_SECRET` | Segredo aleatório persistente, com pelo menos 32 caracteres |

Gere o segredo com `openssl rand -base64 48` e armazene no Railway, nunca em código ou commits. `ctx.shared` referencia valores existentes; `preserve()` não gera segredo inicial.

Com domínio próprio, configure `PUBLIC_URL` antes de aplicar. Com domínio gerado, crie os serviços, gere o domínio e ajuste a variável antes de publicar código. Sem `source` na definição, os serviços aguardam `railway up`.

## Plano, aplicação e código

```sh
bun run railway:typecheck
bun run railway:plan
# Revise o plano antes de executar:
bun run railway:apply
```

`plan` compara o estado remoto sem alterá-lo. Aplique somente com solicitação explícita; `apply --yes` e `--confirm-destructive` exigem aprovação do plano exato. Não sobrescreva o IaC com `config init --force` ou `pull --force` sem revisar a substituição. Validação TypeScript não substitui o plano remoto.

Crie um domínio para o cliente e alinhe `PUBLIC_URL`:

```sh
railway domain --service client --port 3001
# Ou domínio próprio; siga os registros DNS retornados:
railway domain app.seudominio.com --service client --port 3001
```

Envie ambos os serviços **a partir da raiz**:

```sh
railway up --service server
railway up --service client
```

O pré-deploy da API executa `bun run --cwd apps/server db:migrate`; falha impede a nova versão. Preserve essa etapa fora do build e do início de cada réplica. O binário `apps/server/dist/server` é compilado na plataforma de destino e executado diretamente.

Confira os deploys com `railway deployment list --service server --json` e o equivalente para `client`. Upload/enfileiramento não confirma deploy: aguarde `SUCCESS` e verifique `/ready`, `/login`, `/dashboard` e autenticação no domínio público. Aplicar IaC e publicar código são etapas distintas.

### Autodeploy e domínio próprio em código

Importe `github` de `railway/iac` e adicione `source` aos dois serviços, mantendo `root: "/"` e os Dockerfiles:

```ts
source: github("sua-organizacao/seu-repositorio", { branch: "main" }),
```

A integração precisa de acesso ao repositório; com fonte vinculada, mudanças aplicadas podem disparar deploy. Para declarar domínio próprio no cliente:

```ts
domains: [{ domain: "app.seudominio.com", port: 3001 }],
```

Use o destino real e mantenha `PUBLIC_URL` coerente; não versione domínios gerados pelo Railway.

## Runtime e validação local

`apps/client/server` serve `dist` com cache imutável para assets e revalidação de HTML, fallback SPA e proxy de `/api`, `/rpc`, `/openapi`, `/health` e `/ready`. Preserva corpo, query, cookies, origem, status e redirecionamentos; não cacheia a API. Destino vem de `API_HOST`/`API_PORT`; timeout de 30 segundos e falhas retornam 502. `PUBLIC_URL` define a origem pública, também usada no Better Auth e `TRUSTED_ORIGINS`.

Após build, com a API em execução:

```sh
API_HOST=localhost API_PORT=3000 PORT=3001 PUBLIC_URL=http://localhost:3001 bun run --cwd apps/client start
```

Configure a API com `BETTER_AUTH_URL=http://localhost:3001` e essa origem em `TRUSTED_ORIGINS`. `API_PROXY_TARGET` é exclusivo do Vite; Vite não serve produção. Não rode desenvolvimento e runtime simultaneamente na porta 3001.

```sh
bun run check
bun run db:check
docker build -f apps/server/Dockerfile -t zeta-server .
docker build -f apps/client/Dockerfile -t zeta-client .
```

Os testes do proxy usam portas locais e não dependem da conta Railway. Preserve `.dockerignore` e `.railwayignore` excluindo segredos, dependências e builds locais; as imagens não incorporam `.env`.
