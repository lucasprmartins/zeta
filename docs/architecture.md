# Arquitetura

Este documento descreve a implementação e seus pontos de extensão. As convenções de trabalho ficam em [AGENTS.md](../AGENTS.md), a operação em [README.md](../README.md) e as regras de negócio em [CONTEXT.md](../CONTEXT.md).

## Visão geral

O monorepo usa workspaces Bun: `apps/server` contém a API e `apps/client`, a aplicação React e seu runtime de produção. A raiz concentra scripts, lockfile e configuração TypeScript compartilhada; cada app declara suas dependências.

`packages/access` compartilha o catálogo público de ações. `domain/authorization` implementa papéis globais e atribuições por contratos independentes de frameworks; o repositório Drizzle persiste `console.access_role` e o vínculo em `auth.auth_user.role`. A API resolve permissões atuais após validar a sessão Better Auth. O cliente consome `/api/access/me`, sem deduzir concessões pelo nome do papel. Política, transações e extensão estão em [authorization.md](authorization.md).

```text
React → cliente oRPC → HTTP → aplicação → entidades
                               ↓
                            contratos ← repositórios Drizzle → PostgreSQL
Better Auth → sessão validada no HTTP
bootstrap.ts → composição das implementações
```

O domínio usa apenas TypeScript. Entidades preservam estado e invariantes; contratos expressam necessidades de persistência; casos de uso recebem repositórios, relógio e geração de IDs. Não há container de DI, bus ou hierarquia de classes base.

### Schemas PostgreSQL

`schema/namespaces.ts` centraliza `auth` e `console`. As tabelas do Better Auth usam `auth`; configurações administrativas da aplicação usam `console`; tabelas de negócio permanecem em `public`. O schema `console` pode receber novas configurações administrativas conforme o projeto evoluir; papéis e política de cadastro são exemplos atuais. Drizzle qualifica as consultas e as referências entre schemas, sem alterar `search_path`. Os nomes das tabelas foram preservados.

O histórico permanece em `drizzle.__drizzle_migrations`. `drizzle.config.ts` limita introspecção aos três schemas da aplicação e mantém o schema de migrations separado. A migration `0007_separate_schemas` move tabelas com `ALTER TABLE ... SET SCHEMA`, preservando dados, índices e chaves estrangeiras; migrations anteriores continuam intactas.

## Servidor

Caminhos relativos a `apps/server/src`:

| Local | Responsabilidade |
| --- | --- |
| `domain/<modulo>/{entities,contracts,application}` | Regras e casos de uso independentes de bibliotecas |
| `infrastructure/repositories` | Implementação dos contratos e conversão entre registros e entidades |
| `infrastructure/database` | Pool Bun SQL, schema Drizzle e migrations |
| `infrastructure/auth/better-auth.ts` | Better Auth e adapter Drizzle |
| `interfaces/http` | Identidade, validação, tradução de erros e handlers |
| `config/env.ts` | Validação do ambiente |
| `bootstrap.ts` / `main.ts` | Composição / ciclo de vida do processo |

O HTTP deriva a identidade da sessão e passa o escopo confiável aos casos de uso. As operações privadas aplicam autorização também nas listagens. O domínio não recebe objetos de sessão nem tipos HTTP.

### Transporte e persistência

| Endpoint | Implementação |
| --- | --- |
| `/rpc/*` | `RPCHandler`, consumido pelo cliente tipado |
| `/api` | `OpenAPIHandler`, JSON convencional |
| `/api/auth/*` | Better Auth |
| `/openapi` / `/openapi/json` | Scalar / especificação combinada |
| `/health` / `/ready` | Processo / conexão com PostgreSQL |

REST e RPC compartilham procedures e casos de uso. `.route()` define método, caminho e tags; `documented()` reúne validação e JSON Schema. `interfaces/http/openapi` combina oRPC, Better Auth e Elysia e organiza as seções do Scalar.

`createApp` e `bootstrap` aguardam a geração dos schemas. O pool fecha em falhas de inicialização e no encerramento. API e migrador usam Drizzle sobre Bun SQL; `postgres` atende apenas às ferramentas de desenvolvimento. SQL, snapshots e journal ficam em `infrastructure/database/migrations`; alterações de schema geram migrations incrementais.

Imports entre camadas usam `@server/`; o domínio mantém imports relativos. A entrada pública `@zeta/server/rpc` exporta apenas os tipos `AppClient` e `AppRouter` para o navegador.

## Autenticação e perfil

Better Auth controla contas, senhas e sessões em cookies. O cliente usa `lib/auth.ts` com `usernameClient()`; o servidor habilita `username()`. Login com `@` chama `signIn.email`; demais identificadores usam `signIn.username`. O cadastro envia username via `signUp.email`; normalização e unicidade são validadas no servidor.

`username` e `displayUsername` são opcionais para preservar contas anteriores. No perfil, `updateUser` envia ambos ao alterar o identificador. A leitura usa o username canônico quando um nome de exibição antigo diverge dele. O nome pessoal também é editável; o email não.

`changePassword` exige a senha atual, valida a confirmação na interface e revoga as outras sessões. Após sucesso, os campos são limpos. “Lembrar-me” guarda somente o identificador após entrar; desmarcar remove a preferência, sem alterar a duração da sessão.

`app/workspace.tsx` verifica a sessão e conecta `AppShell` ao `Outlet`. `app/root-layout.tsx` cancela consultas e limpa o cache quando o ID ou papel da sessão muda, inclusive entre abas. `AccessProvider` consulta as concessões na entrada, no foco e a cada 15 segundos enquanto a aba está ativa. Mudanças na definição do papel também cancelam e reiniciam consultas afetadas. Não existe uma segunda cópia da sessão em store.

## Cliente: rotas e consultas

Caminhos relativos a `apps/client/src`:

- `app/`: inicialização do router e layouts com sessão.
- `routes/`: rotas por arquivo, validação de parâmetros e conexão com telas.
- `features/`: telas, formulários e consultas por funcionalidade.
- `components/`: UI e layouts compartilhados.
- `lib/`: clientes de auth, RPC e Query; imports internos usam `@/`.

```text
routes/
  __root.tsx                  # Layout raiz e fallbacks
  login.tsx / register.tsx    # Acesso público
  _authenticated.tsx         # Layout sem segmento na URL
  _authenticated/
    index.tsx                # / → /dashboard
    dashboard.tsx
    tasks.tsx                # Filtro status na URL
    profile.tsx
    admin/users.tsx           # Usuários, papéis e aprovações; view/q na URL
    admin/console.tsx         # Política de cadastro e aprovação
```

`tsr.config.json` centraliza geração e code splitting. O plugin TanStack no Vite e o script `routes:generate` produzem `routeTree.gen.ts`, importado por `app/router.tsx`; a árvore não é versionada.

TanStack Query armazena dados de negócio com chaves por identidade, formato e filtros. Consultas comuns incluem a página; infinitas usam uma chave distinta. Mutations não são repetidas automaticamente e invalidam o escopo afetado, incluindo resumos.

### Listagens e módulo de tarefas

`infiniteQueryOptions` define a consulta na feature e `useInfiniteQuery` mantém as páginas na tela. `InfiniteScroll` fornece observação de proximidade e botão acessível, sem conhecer o endpoint. O sinal de cancelamento chega ao RPC; a continuação bloqueia buscas concorrentes e exige tentativa manual após erro.

Os itens permanecem visíveis durante atualização e continuação. Cada tipo de erro tem feedback próprio; falha de atualização pausa a continuação. Após mutations, a invalidação recompõe as páginas carregadas.

Em tarefas, a API usa páginas de 20 itens, ordenadas por criação decrescente e ID. A tela deduplica IDs, mas paginação por offset pode omitir itens sob alterações concorrentes até atualizar a lista. Edições seguem a última gravação, sem versionamento.

`/tasks` mantém apenas `status` na URL e usa `ToggleGroup` de seleção única. Criação e edição compartilham `TaskForm` em modal. `/dashboard` consulta totais e cinco pendentes recentes; os cards abrem a lista com o filtro correspondente.

## Interface

Os componentes locais adaptam shadcn/ui conforme `components.json`. Formulários usam `Field`, labels, descrições, `Input` e `Textarea`; `Card`, `Empty` e skeletons organizam superfícies e estados. `Button` é nativo, sem `asChild`; links usam `buttonVariants`. Phosphor fornece os ícones.

### Layout e mobile

- `AppShell` contém sidebar, cabeçalho de 64 px e área principal; `AppSidebar` centraliza navegação e acesso ao perfil pelo bloco da conta.
- `PageContent` limita páginas a 1280 px, com padding horizontal de 20/32 px, vertical de 28/36 px e espaço de 28 px entre blocos. `PageHeader` organiza título e ações; `AuthLayout` centraliza os formulários de acesso.
- A sidebar mede 240/72 px no desktop, a partir de 1024 px. Ícones permanecem fixos e rótulos desaparecem por opacidade. No mobile, um dialog nativo apresenta a gaveta, controla foco e rolagem e fecha na navegação.
- `Modal` apresenta formulários em tela cheia abaixo de 640 px e confirmações em painel inferior; no desktop, ambos ficam centralizados. Cabeçalho fixo, rolagem interna, áreas seguras e `visualViewport` acomodam o teclado. O foco inicial vai ao título no mobile ou a Cancelar nas confirmações; mutations bloqueiam o fechamento.
- Controles mantêm alvos de toque de 44 px, campos de 16 px no mobile, foco visível e suporte a movimento reduzido.

### Tema e feedback

`styles.css` centraliza os tokens claro/escuro. O `ThemeProvider` segue o sistema até existir uma escolha manual, persistida e sincronizada entre abas. O script em `index.html` aplica o tema antes da renderização; o setup renomeia o namespace nos dois pontos.

Sonner fica uma vez dentro do provider e comunica resultados de ações. `ErrorNotice` compõe `Alert` para falhas persistentes no conteúdo; skeletons preservam a estrutura na busca inicial.

`RouteError` e `RouteNotFound` são fallbacks globais do TanStack Router. `RouteFeedback` centraliza explicação, mensagem técnica em vermelho e ações na viewport, descontando o cabeçalho quando estiver no shell. A recuperação invalida o router e reseta os boundaries para repetir loaders; stack e objetos de resposta não são exibidos.

## Execução e extensão

Em desenvolvimento, Vite serve o cliente em 3001 e encaminha API/RPC/docs/saúde à API em 3000. Em produção, `apps/client/server` serve o build, faz fallback SPA e proxy para a API privada, preservando cookies e origem. O código desse runtime tem configuração TypeScript própria com tipos Bun, separada do navegador.

A API é compilada em executável Bun na plataforma de destino. No Railway, `.railway/railway.ts` define PostgreSQL, API privada e cliente público, com builds a partir da raiz. Migrations rodam no pré-deploy; os healthchecks são `/ready` na API e `/_health` no cliente. Operação e variáveis estão no [guia de deploy](../.railway/README.md).

Para adicionar uma funcionalidade, o fluxo é: domínio e testes → schema/repositório e migration → procedures e composição no bootstrap → feature, consultas e rota → navegação e invalidação. Regras de negócio e decisões do produto são documentadas em [CONTEXT.md](../CONTEXT.md); comandos e verificações estão no [README](../README.md).
