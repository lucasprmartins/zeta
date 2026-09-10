# Guia de trabalho do projeto

## Contexto e fontes

Este guia reúne convenções de desenvolvimento. Consulte os documentos conforme a mudança:

- [docs/architecture.md](docs/architecture.md): estrutura, fluxos e comportamentos da interface.
- [CONTEXT.md](CONTEXT.md): vocabulário e regras do domínio.
- [.railway/README.md](.railway/README.md): infraestrutura e deploy.

O README da raiz pertence à apresentação do produto e pode ser reescrito. Consulte-o quando relevante ao pedido, sem depender dele para convenções técnicas. Para comandos e ambiente, confira os `package.json`, os `.env.example` e as configurações dos apps.

Confira código, manifests e configurações antes de presumir versões ou comportamentos. Resolva divergências com o pedido do usuário e atualize a documentação correspondente. Não trate regras de uma funcionalidade como requisitos universais.

`CLAUDE.md` é um symlink relativo para este arquivo; preserve-o. Mantenha aqui apenas convenções transversais, sem repetir tutoriais ou registrar cada alteração de implementação.

## Acordos

- Use Bun para runtime, dependências e scripts, com um único `bun.lock` na raiz. Instale no workspace consumidor, com versões exatas; não atualize versões incidentalmente nem introduza outros gerenciadores.
- Peça confirmação antes de adicionar dependências de produção. Build, tipos e ferramentas locais de banco ficam em `devDependencies`.
- Use TypeScript estrito, ESM e `import type`. Não enfraqueça tipos ou configurações para contornar erros.
- Prefira funções, interfaces e composição explícita. Não introduza DI containers, repositories base, buses ou abstrações genéricas sem necessidade concreta.
- Preserve alterações existentes, arquivos locais e segredos. Não sobrescreva `.env` nem exponha credenciais em código, logs ou respostas.
- Para documentação atual, use `find-docs` com o CLI global: `ctx7 library`, depois `ctx7 docs`. Não use Context7 MCP nem `npx ctx7`; se indisponível, informe e consulte fontes oficiais.

## Organização e dependências

Monorepo com workspaces Bun em `apps/*` e `packages/*`:

| Área | Responsabilidade |
| --- | --- |
| `apps/server` | Bun, Elysia, Drizzle, oRPC, Better Auth e PostgreSQL |
| `server/src/domain/<modulo>` | Entidades, contratos e aplicação em TypeScript puro |
| `server/src/infrastructure` | Autenticação, banco e implementações dos repositórios |
| `server/src/interfaces/http` | Validação, autorização, RPC e OpenAPI |
| `apps/client` | React, Vite, TanStack Router/Query, Tailwind, shadcn/ui e Phosphor |
| `client/src/{app,routes,features}` | Layouts com sessão, rotas por arquivo e funcionalidades |
| `client/src/components` | Layouts e primitivas de UI compartilhadas |
| `packages/guide-content` | Conversão compartilhada dos blocos Markdown do Guia de Uso |
| `packages/access` | Catálogo público de permissões e configuração das operações nativas do Better Auth |

Os caminhos `server/` e `client/` da tabela são relativos a `apps/`; versões e nomes dos workspaces estão nos manifests.

- O domínio não importa runtime, frameworks, banco ou tipos de transporte. Entidades preservam invariantes; contratos descrevem necessidades; aplicação coordena ambos com repositórios, relógio e IDs injetados. `tsconfig.domain.json` verifica essa independência.
- Infraestrutura converte registros em entidades. HTTP recebe casos de uso, resolve identidade e traduz erros. `bootstrap.ts` conecta as implementações; `main.ts` controla o processo.
- Use `@server/` entre camadas do servidor e imports relativos dentro do domínio. No cliente, use `@/`; a entrada pública `/rpc` do workspace do servidor é exclusiva para `import type` de `AppClient`/`AppRouter`.
- Separe os tipos do navegador dos tipos Bun do runtime de produção: `apps/client/tsconfig.json` e `tsconfig.server.json`, respectivamente. Preserve os tsconfigs locais de `server/` e `tests/` para descoberta pelo editor.

## Domínio, HTTP e autenticação

- Defina módulos e regras a partir do produto, usando apenas as pastas necessárias. Não imponha CRUD, proprietário individual ou estados herdados de outro módulo. Atualize `CONTEXT.md` quando mudar regras ou vocabulário.
- Autorize cada operação, inclusive listagens. Identidade e escopo vêm de uma sessão validada ou de outro chamador confiável, nunca de um proprietário enviado pelo navegador. Não revele recursos privados fora do escopo autorizado.
- `/rpc/*` e `/api` usam as mesmas procedures e casos de uso via `RPCHandler` e `OpenAPIHandler`. Defina rotas com `.route()` e mantenha validação e JSON Schema coerentes com `documented()`.
- `/api/auth/*` pertence ao Better Auth. `/health` verifica o processo; `/ready`, o banco. `/openapi` e `/openapi/json` servem Scalar e especificação. Altere a origem dos schemas e o agrupamento em `interfaces/http/openapi`, não documentos gerados.
- Aguarde `createApp` e `bootstrap`; são assíncronos. Preserve o fechamento do pool na falha de inicialização e no encerramento.
- Better Auth controla usuários, senhas e sessões em cookies. Não duplique a sessão em stores nem armazene tokens/senhas em localStorage. As tabelas de autenticação são infraestrutura.
- Preserve `username()`/`usernameClient()`: login com `@` usa email; demais entradas usam username, sem tentar ambos nem consultar a existência da conta. O servidor valida, normaliza e garante unicidade; contas antigas sem username continuam válidas.
- Ao alterar username, envie também `displayUsername`. Na leitura, use o username canônico se o nome de exibição antigo divergir dele; preserve capitalização quando equivalentes.
- “Lembrar-me” salva somente o identificador após login bem-sucedido; desmarcar o remove imediatamente, sem mudar a duração da sessão.
- Recuperação de senha, verificação de email e provedores sociais exigem configuração própria; aparecer no Scalar não significa estar operacional.

## Autorização por permissões

`packages/access` define ações e rótulos públicos; concessões dos papéis ficam no banco. Use permissões, não nomes de papéis, nas funcionalidades. Procedures aplicam `requirePermission`; navegação, páginas e controles usam `usePermissions`, `PermissionBoundary` e `Can` dentro de `AccessProvider`. A API consulta as concessões atuais em cada requisição. O cliente consulta `/access/me` e limpa dados afetados quando elas mudam. `admin` recebe automaticamente todas as ações do catálogo; `user` e papéis personalizados usam concessões explícitas. Esse acesso total não altera o escopo dos dados: papéis não concedem acesso aos registros de outro proprietário.

O módulo `domain/authorization` administra papéis globais e atribuições; o plugin Admin do Better Auth mantém operações nativas limitadas de contas/sessões. Todas as atribuições, inclusive via CLI, passam pelo mesmo fluxo transacional para preservar o último administrador. Não reabilite mutações alternativas do plugin que contornem essas regras. Política de cadastro e aprovação são independentes e persistidas; preserve a aplicação no Better Auth e o bloqueio de sessões pendentes, sem depender da visibilidade dos controles no cliente. Consulte [docs/authorization.md](docs/authorization.md) para extensão e operação.

## Guia de Uso

Guias mantêm rascunho e publicação separados, com controle de versão e autorização também na listagem. O conteúdo usa o subconjunto Markdown de `packages/guide-content`; amplie editor, conversão e leitor em conjunto. A importação cria somente rascunhos ausentes, sem sobrescrever edições nem publicar automaticamente. Consulte [docs/guides-authoring.md](docs/guides-authoring.md) para formato e operação.

## Banco

- Schemas PostgreSQL: `auth` para Better Auth e controle de acesso, `console` para configurações administrativas da aplicação, `public` para domínio e `drizzle.migrations` exclusivamente para o histórico de migrations. Use nomes de tabela simples, sem repetir o schema como prefixo (ex.: `auth.user`, `auth.access`, `console.registration`). Use os namespaces de `schema/namespaces.ts`; preserve nomes qualificados em SQL manual e faça movimentações por migrations incrementais.
- API e migrador usam Drizzle sobre Bun SQL. `postgres` é dependência de desenvolvimento para Drizzle Kit/Studio.
- Aplique migrations com `bun run db:migrate`; o helper compartilhado converte o histórico legado para `drizzle.migrations` antes de consultar pendências. Não renomeie esse histórico por uma migration SQL comum nem crie um segundo histórico vazio.
- Todas as migrations, snapshots e metadados ficam em `apps/server/src/infrastructure/database/migrations`.
- Altere o schema, execute `db:generate`, revise o SQL e aplique `db:migrate`. Preserve o histórico aplicado; não apague, renumere ou regenere migrations existentes.
- `db:push` altera o banco diretamente e só deve ser usado quando solicitado. `db:pull` gera arquivos por introspecção. Não use nenhum deles como verificação sem efeitos colaterais.

## Rotas e dados do cliente

- Rotas TanStack por arquivo conectam parâmetros e telas de `features`. Páginas autenticadas ficam em `routes/_authenticated/`; registre a navegação em `app-sidebar.tsx` quando necessário.
- Preserve o plugin TanStack antes do React no Vite e a configuração em `tsr.config.json`. Não edite nem versione `routeTree.gen.ts` ou `.tanstack/`; a geração roda antes de typecheck/build.
- Reutilize `RouteError`, `RouteNotFound` e `RouteFeedback`: conteúdo centralizado, mensagem técnica em vermelho e recuperação via `router.invalidate()` e reset dos boundaries. Exiba apenas a mensagem, sem stack, cause, objetos de resposta ou segredos.
- Better Auth cuida da sessão; TanStack Query, dos dados de negócio. Preserve cancelamento e limpeza do cache quando a identidade muda, inclusive entre abas.
- Chaves de consulta incluem identidade, formato e filtros; consultas comuns também incluem página. Nunca compartilhe chaves entre consultas comuns e infinitas.
- Filtros compartilháveis ficam na URL e são validados pela rota. Mutations não têm repetição automática; invalidam todas as consultas afetadas no escopo do usuário, inclusive resumos. Totais vêm da API, não do tamanho da página carregada.

### Listagens incrementais

Use rolagem infinita para carregamento progressivo:

- `infiniteQueryOptions` na feature, `useInfiniteQuery` na tela, `initialPageParam` explícito, `getNextPageParam` retornando `undefined` no fim e `signal` encaminhado ao RPC.
- Reutilize `InfiniteScroll` como gatilho e botão acessível. Bloqueie buscas durante `isFetching`, use `fetchNextPage({ cancelRefetch: false })` e pause após erro de atualização.
- Preserve itens durante buscas/erros; separe erro inicial, atualização e próxima página. Erro de continuação exige tentativa manual. Não remova páginas com `maxPages` sem considerar a rolagem.
- Após mutations, invalide o prefixo da feature; não faça append manual. Ordenação e paginação pertencem ao contrato da API. Deduplicar IDs não evita omissões por concorrência com offset nem garante snapshot consistente.

## UI/UX

### shadcn/ui como primeira escolha

- Antes de criar UI, confira `components/ui`, componentes compartilhados e composições existentes. Reutilize-os; quando faltar comportamento, consulte o catálogo oficial via `find-docs`, incluindo opções além de botões, inputs e cards.
- Incorpore apenas componentes utilizados, adaptando o código oficial conforme `components.json`, licença, tokens e Phosphor. Uma implementação própria precisa de uma necessidade que essas opções não atendam.
- Componha telas nas features; primitivas e layouts não conhecem regras de negócio ou consultas. Centralize variantes e confira as props locais antes de copiar exemplos: `Button` é nativo, sem `asChild`; links usam `buttonVariants`.
- Use `Field` para formulários, `Card` para superfícies, `Empty` para estados vazios e skeletons adequados ao conteúdo. Mantenha IDs, descrições e validações acessíveis.
- Sonner fica uma vez dentro do `ThemeProvider`. Toasts comunicam resultados de ações; erros persistentes de carregamento usam `ErrorNotice`/`Alert`. Notificações não substituem instruções dos campos.
- Use Phosphor com sufixo `Icon`, peso `regular` e 18 px em navegação/botões. Use `weight`, não `strokeWidth`; não reintroduza Lucide.

### Layout, tema e acessibilidade

- Reutilize `AppShell`, `AppSidebar`, `PageContent`, `PageHeader` e `AuthLayout`. Páginas autenticadas usam `PageContent`; não replique medidas e paddings nas features.
- Use tokens semânticos de `styles.css`. O toggle alterna claro/escuro: sem preferência salva segue o sistema; escolha manual prevalece. Preserve a mesma chave e resolução de tema no provider e no script inicial de `index.html`.
- Preserve posições de ícones/avatar durante expansão da sidebar; textos permanecem montados e somem por opacidade. A gaveta mobile mantém Escape, foco contido e restaurado, bloqueio de rolagem e fechamento ao mudar para desktop.
- Preserve `Modal` em tela cheia no mobile para formulários e painel inferior para confirmação, centralizado no desktop. Mantenha cabeçalho visível, rolagem interna, áreas seguras e `visualViewport`; foco inicial no título no mobile e em Cancelar nas confirmações. Bloqueie fechamento durante mutations.
- Mantenha alvos de toque de 44 px, campos de 16 px no mobile, foco visível, nomes acessíveis em ícones, `aria-current`, link para pular navegação e movimento reduzido. Não provoque rolagem horizontal.
- Textos de login/cadastro tratam apenas do acesso à conta. Ao mudar marca, revise tokens, `brand.tsx`, favicon e metadados, sem acoplar a autenticação ao domínio.

## Ambiente, setup e publicação

- Use os `.env.example` e a validação em `config/env.ts`. API usa 3000 e cliente 3001; o Vite encaminha API/RPC/docs/saúde à API. `API_PROXY_TARGET` é exclusivo do Vite.
- Não desabilite proteção de origem ou exponha segredos em variáveis públicas. URLs e origens autorizadas devem refletir o ambiente real.
- Produção usa o runtime Bun em `apps/client/server` para estáticos, fallback SPA e proxy na mesma origem. Preserve cookies, origem, cache e erros de conexão; Vite não serve produção.
- Compile o binário da API na plataforma de destino, sem incorporar ambiente/segredos. Mantenha Bun e dependências necessários ao migrador na imagem e aplique migrations antes da API.
- Setup preserva arquivos existentes e histórico. `--dry-run` não modifica nada; `--database skip` não acessa banco. Docker só migra a URL local validada do Compose, sobrepondo a variável herdada do terminal. Teste setup em diretórios temporários.
- Publicação é opcional e interativa: revise destino, visibilidade e arquivos antes de criar/commitar/enviar. Preserve `origin`, use `publish`, bloqueie `.env` candidatos e não permita publicação implícita por `--yes`, force push ou sobrescrita de repositórios. Confira estado local/remoto após falhas parciais.
- Ao alterar identidade do produto, revise nomes/imports dos workspaces, marca, namespaces locais (incluindo a lista explícita do setup), navegação, entrada, ambiente e infraestrutura. Não renomeie ou remova módulos/migrations fora do escopo solicitado.

## Validação

Execute na raiz; os scripts disponíveis e seus detalhes estão nos `package.json` da raiz e dos apps.

- `bun run typecheck`: apps, domínio, scripts e IaC.
- `bun run test`: testes sem banco. `bun test` faz descoberta própria e pode incluir integração.
- `bun run build`: ambos os apps. `bun run check`: tipos, testes sem banco e build.
- `bun run test:integration`: exige `TEST_DATABASE_URL` de desenvolvimento/testes com permissão `CREATEDB`; cria e remove um banco temporário. Nunca use produção. Não faz parte de `check`.
- Para alterações no banco, confira migrations e integração; em regras, transporte e autenticação, execute os testes correspondentes. Testes de domínio usam dependências determinísticas e repositórios em memória.
- Faça verificações proporcionais, relate o que executou e os bloqueios reais. Comandos interativos Drizzle devem rodar em `apps/server` para preservar o TTY.

## Railway

Leia [.railway/README.md](.railway/README.md) antes de alterar infraestrutura.

- `.railway/railway.ts` define o ambiente inteiro via `railway/iac`, dependência de desenvolvimento. Não use `railway.json` ou `railway.toml`.
- Use somente o CLI global `railway`; nunca instale/configure Railway MCP nem execute `railway setup agent`. Avisos de MCP ausente são intencionais. A skill global é atualizada com `skills update -g use-railway`.
- Builds usam a raiz do monorepo. Apenas o cliente tem domínio público; API e PostgreSQL usam rede privada. Segredos ficam nas variáveis compartilhadas, referenciadas por `ctx.shared`.
- Preserve migrations no pré-deploy, healthchecks e exclusões de segredos, dependências e builds locais em `.dockerignore`/`.railwayignore`.
- Confira projeto e ambiente antes de operações remotas. `railway:typecheck` valida tipos; `railway:plan` compara o estado remoto. Não aplique sem solicitação explícita: recursos omitidos podem ser removidos.
- `apply --yes` e `--confirm-destructive` exigem aprovação do plano exato. Aplicar IaC e publicar código são etapas distintas; só declare deploy concluído após verificar `SUCCESS`.
