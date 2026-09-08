# Deploy no Railway

A infraestrutura é definida em `railway.ts`, usando o IaC TypeScript oficial (`railway/iac`). Não há `railway.json` nem `railway.toml`. O SDK é uma dependência de desenvolvimento da raiz; todas as operações remotas usam o CLI global `railway`.

## Serviços

```text
Navegador → HTTPS → client:3001 → rede privada → server:3000 → postgres
```

| Serviço | Execução | Healthcheck |
| --- | --- | --- |
| `postgres` | Provisionado pelo helper oficial do Railway, com persistência gerenciada | Gerenciado pelo Railway |
| `server` | Executável standalone Bun; imagem mantém Bun para migrations | `/ready`, verifica PostgreSQL |
| `client` | Imagem Bun; serve o build Vite e faz proxy para a API | `/_health`, verifica o processo e a presença do build |

O único serviço que precisa de domínio público é `client`. `/api`, `/rpc`, `/openapi`, `/health` e `/ready` são encaminhados à API. A autenticação continua usando cookies da mesma origem. Os serviços escutam em `::` para atender a rede privada IPv6 e IPv4.

Os dois builds usam a **raiz do monorepo**, com Dockerfiles separados em `apps/server` e `apps/client`. Não use essas subpastas como Root Directory: o build precisa do lockfile, workspaces, tsconfig compartilhado e tipos do servidor. As imagens fixam Bun 1.4.2; atualize ambas ao mudar o runtime.

## Preparar o ambiente

Requer Bun, Docker para testes locais e Railway CLI 5.42.1 ou superior (implementação validada com 5.49.2 e SDK 3.11.0).

```sh
bun install --frozen-lockfile
railway login
railway link
railway status --json
```

Selecione o projeto e o ambiente que serão gerenciados. Se ainda não existir um projeto, crie um projeto vazio com `railway init` antes de vinculá-lo. O nome usado pelo IaC vem do contexto do CLI, sem IDs de conta ou de projeto no repositório.

Esta definição gerencia o ambiente inteiro. Se o projeto já tiver outros recursos, incorpore-os ao arquivo antes de aplicar: recursos omitidos podem aparecer como remoções no plano.

Configure duas **variáveis compartilhadas do ambiente**, não variáveis locais do frontend:

| Variável compartilhada | Valor |
| --- | --- |
| `PUBLIC_URL` | Origem HTTPS pública do cliente, sem caminho ou barra final; exemplo: `https://app.seudominio.com` |
| `BETTER_AUTH_SECRET` | Segredo aleatório de pelo menos 32 caracteres, persistente entre deploys |

Gere o segredo com `openssl rand -base64 48` e armazene-o no Railway. Não o copie para o IaC, commits ou scripts. `ctx.shared` referencia as variáveis já existentes; o arquivo não cria esses valores. Não use `preserve()` como gerador de um segredo inicial.

Com domínio próprio, você pode definir `PUBLIC_URL` antes do primeiro apply. Para usar um domínio gerado pelo Railway, aplique primeiro a criação dos serviços, gere o domínio do `client` e configure `PUBLIC_URL` antes de enviar o código. O arquivo não declara uma fonte de código por padrão, portanto os serviços de aplicação aguardam `railway up`.

## Planejar, aplicar e publicar

```sh
bun run railway:typecheck
bun run railway:plan
# Revise os recursos, variáveis e possíveis remoções antes de continuar.
bun run railway:apply
```

`plan` compara o arquivo com o ambiente selecionado sem modificá-lo. `apply` altera a infraestrutura após confirmação. Alterar o arquivo ou publicar código não aplica automaticamente o IaC.

Crie o domínio público do cliente, escolhendo uma das opções:

```sh
# Domínio gerado pelo Railway:
railway domain --service client --port 3001
# Ou domínio próprio, seguindo os registros DNS retornados:
railway domain app.seudominio.com --service client --port 3001
```

Garanta que `PUBLIC_URL` tenha a origem correspondente e `BETTER_AUTH_SECRET` esteja configurada. Não gere domínios públicos para `server` ou PostgreSQL apenas para conectar os serviços; as referências do IaC usam a rede privada.

Envie os dois serviços a partir da raiz do repositório:

```sh
railway up --service server
railway up --service client
```

O processo HTTP inicia diretamente por `./apps/server/dist/server`, compilado dentro do Docker com bytecode, minificação e sourcemaps. O executável incorpora runtime e dependências; a imagem mantém Bun e dependências externos exclusivamente para o fluxo de migrations.

O pré-deploy de `server` executa `bun run --cwd apps/server db:migrate`, usando Bun SQL e `src/infrastructure/database/migrations`. O banco precisa estar pronto; uma falha na migration impede a entrada da nova versão. Migrations rodam no pré-deploy, não no build nem a cada início de réplica.

Depois, confira os dois serviços com `railway deployment list --service server --json` e `railway deployment list --service client --json`. Um upload enfileirado não confirma sucesso: aguarde `SUCCESS`. Verifique `/ready`, `/login`, `/dashboard` e o fluxo de autenticação no domínio público.

## GitHub e domínios como código

Para autodeploy, importe `github` de `railway/iac` e adicione aos dois serviços:

```ts
source: github("sua-organizacao/seu-repositorio", { branch: "main" }),
```

Mantenha `root: "/"` e os Dockerfiles de cada serviço. A integração Railway/GitHub deve ter acesso ao repositório. Se houver código-fonte vinculado, aplicar mudanças pode disparar deploys; configure as variáveis compartilhadas antes.

Domínios próprios também podem ser declarados no serviço `client`:

```ts
domains: [{ domain: "app.seudominio.com", port: 3001 }],
```

Use valores reais e mantenha `PUBLIC_URL` coerente. Não versione domínios gerados pelo Railway. Não use `railway config init --force` ou `pull --force` sobre este arquivo sem revisar o conteúdo que seria substituído.

## Runtime do cliente

`apps/client/server/main.ts` inicia um servidor Bun de produção, independente do Vite. `handler.ts`:

- Serve somente os arquivos presentes em `dist`, com cache imutável para `/assets/*` e revalidação para HTML.
- Faz fallback para `index.html` nas navegações HTML, permitindo recarregar rotas como `/tasks`.
- Mantém corpo, query, cookies, origem, status e redirecionamentos no proxy; respostas da API não são cacheadas.
- Usa apenas `API_HOST` e `API_PORT` do ambiente como destino, com timeout de 30 segundos. Falhas de conexão retornam 502.
- Usa `PUBLIC_URL` para os cabeçalhos de origem pública. A API usa essa mesma origem no Better Auth e em `TRUSTED_ORIGINS`.

Para testar o runtime localmente após `bun run build`:

```sh
API_HOST=localhost API_PORT=3000 PORT=3001 PUBLIC_URL=http://localhost:3001 bun run --filter @zeta/client start
```

Nesse teste, configure também a API com `BETTER_AUTH_URL=http://localhost:3001` e inclua essa origem em `TRUSTED_ORIGINS`. `API_PROXY_TARGET` continua sendo exclusivo do Vite; não é usado pelo runtime de produção.

## Validação e manutenção

```sh
bun run check
bun run db:check
docker build -f apps/server/Dockerfile -t zeta-server .
docker build -f apps/client/Dockerfile -t zeta-client .
```

`bun run check` inclui tipos do IaC, testes do servidor e do proxy do cliente e os dois builds. Os testes do proxy usam uma porta local temporária; não dependem da conta Railway. As imagens são construídas sem `.env` e sem dependências de desenvolvimento no runtime. O runtime do cliente não precisa de `node_modules`.

`.dockerignore` e `.railwayignore` excluem dependências locais, builds locais e arquivos de ambiente. Não envie credenciais de desenvolvimento no deploy. O plano remoto depende de um projeto vinculado e não é substituído pela validação TypeScript.

Referências oficiais: [IaC](https://docs.railway.com/infrastructure-as-code), [DSL TypeScript](https://docs.railway.com/infrastructure-as-code/reference), [pré-deploy](https://docs.railway.com/guides/pre-deploy-command).
