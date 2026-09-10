# Arquitetura

## Organização

Monorepo Bun com dependências por workspace, configuração compartilhada e lockfile único na raiz.

| Área | Responsabilidade |
| --- | --- |
| `apps/server/src/domain/<modulo>` | Entidades, contratos e casos de uso em TypeScript puro |
| `apps/server/src/infrastructure` | Autenticação, banco e implementação dos contratos |
| `apps/server/src/interfaces/http` | Identidade, autorização, validação, RPC e OpenAPI |
| `apps/server/src/bootstrap.ts` / `main.ts` | Composição / ciclo de vida do processo |
| `apps/client/src/app` / `routes` | Sessão, layouts e rotas por arquivo |
| `apps/client/src/features` | Telas, formulários e consultas por funcionalidade |
| `apps/client/src/components` / `lib` | UI compartilhada / clientes auth, RPC e Query |
| `apps/client/server` | Estáticos e proxy Bun de produção |
| `packages/access` | Catálogo público de permissões |
| `packages/guide-content` | Conversão de conteúdo dos guias |
| `scripts` | Setup, publicação e seus testes |

```text
React → oRPC → HTTP → casos de uso → entidades
                          ↓
                       contratos ← repositórios Drizzle → PostgreSQL
Better Auth → identidade validada no HTTP
bootstrap.ts → composição das implementações
```

Uma funcionalidade atravessa domínio e testes → persistência/migration → procedures/bootstrap → feature/rota → navegação e invalidação. Convenções transversais ficam em [AGENTS.md](../AGENTS.md); vocabulário em [CONTEXT.md](../CONTEXT.md).

## Servidor e banco

| Endpoint | Responsabilidade |
| --- | --- |
| `/rpc/*` / `/api` | `RPCHandler` / `OpenAPIHandler`, com as mesmas procedures e casos de uso |
| `/api/auth/*` | Better Auth |
| `/openapi` / `/openapi/json` | Scalar / especificação combinada |
| `/health` / `/ready` | Processo / conexão com PostgreSQL |

`.route()` define método, caminho e tags; `documented()` mantém validação e JSON Schema coerentes. Altere schemas e agrupamento em `interfaces/http/openapi`, não documentos gerados. `createApp` e `bootstrap` são assíncronos; aguarde ambos e preserve o fechamento do pool em falhas de inicialização e encerramento.

Drizzle usa Bun SQL na API e no migrador; `postgres` atende às ferramentas de desenvolvimento. Namespaces de `schema/namespaces.ts` organizam tabelas com nomes simples:

- `auth`: Better Auth e controle de acesso, como `auth.user` e `auth.access`.
- `console`: configurações administrativas, como `console.registration`.
- `public`: domínio.
- `drizzle.migrations`: exclusivamente o histórico de migrations.

SQL, snapshots e journal ficam em `apps/server/src/infrastructure/database/migrations`. Use nomes qualificados em SQL manual e migrations incrementais para mover tabelas. `bun run db:migrate` usa o helper que converte o histórico legado sob lock antes de consultar pendências; interrompe se os dois históricos coexistirem. Não substitua esse fluxo pelo migrador Drizzle direto nem crie um segundo histórico vazio.

RLS permanece desativado: a API autoriza as operações e os repositórios aplicam o escopo da funcionalidade. Schemas não substituem autorização. API e migrador compartilham `DATABASE_URL`; uma futura adoção de RLS exige revisar credenciais, privilégios, políticas e identidade por transação.

## Autenticação e acesso

Better Auth controla contas, senhas e sessões em cookies, sem duplicação em stores ou tokens no localStorage. `username()` / `usernameClient()` encaminham login com `@` para email e os demais identificadores para username, sem tentar ambos nem consultar existência da conta. O servidor normaliza e garante unicidade.

Contas antigas podem não ter username. Ao alterá-lo no perfil, envie também `displayUsername`; na leitura, preserve sua capitalização somente quando equivalente ao canônico. O perfil permite editar nome e senha, mas não email. Trocar senha exige a atual e revoga outras sessões; limpe os campos após sucesso. “Lembrar-me” salva apenas o identificador após login bem-sucedido; desmarcar o remove imediatamente, sem alterar a duração da sessão.

`app/workspace.tsx` valida sessão e conecta shell e rota. Mudanças de identidade cancelam consultas e limpam o cache, inclusive entre abas. Sem sessão, o login preserva o destino em `redirect`, aceitando somente caminhos internos. Regras, atualização de concessões e transações estão em [authorization.md](authorization.md).

## Rotas e dados do cliente

- Rotas por arquivo validam parâmetros e conectam telas de `features`; páginas autenticadas ficam em `routes/_authenticated/`. Registre navegação em `app-sidebar.tsx` quando necessário.
- Cada rota autenticada declara a trilha completa em `staticData.crumbs`; intermediários têm `to`. Rótulos carregados por consulta usam `usePageCrumb`; retornos usam `BackLink`. Não derive trilhas do pathname nem passe títulos pelo `AppShell`.
- `tsr.config.json` centraliza geração e code splitting. `routes:generate` e o plugin Vite produzem a árvore não versionada.
- TanStack Query guarda dados de negócio. Chaves incluem identidade, formato e filtros; consultas comuns incluem página e não compartilham chaves com infinitas. Filtros compartilháveis ficam na URL.
- Mutations não têm repetição automática; invalidam o prefixo afetado no escopo do usuário, incluindo detalhes e resumos. Totais vêm da API.

### Listagens incrementais

Defina `infiniteQueryOptions` na feature e use `useInfiniteQuery` na tela, com `initialPageParam` explícito, `getNextPageParam` retornando `undefined` no fim e `signal` encaminhado ao RPC. `InfiniteScroll` oferece gatilho e botão acessível: bloqueie durante `isFetching` e use `fetchNextPage({ cancelRefetch: false })`.

Preserve itens nas atualizações e diferencie erro inicial, atualização e continuação. Falha de atualização pausa novas páginas; erro de continuação exige tentativa manual. Invalide após mutations, sem append manual nem `maxPages` que desloque a rolagem. Ordenação e paginação pertencem à API; deduplicar IDs não garante consistência de paginação por offset sob concorrência.

### Tarefas e indicadores

Tarefas são compartilhadas: cada ação autorizada alcança qualquer tarefa, sem filtro por proprietário. `authorId` aceita nulo e a chave estrangeira usa `on delete set null`. Responsáveis ainda usam `mention`, `task_mentions` e `tasks:mention` internamente; uma renomeação deve atualizar o contrato inteiro. A entidade guarda IDs e a aplicação resolve nomes, usernames e fotos por `UserDirectory`.

`tasks:mention` protege busca de contas e gravação de responsáveis. Criar/editar sem menções não exige essa ação; enviá-las sem permissão retorna 403. Aceite apenas contas existentes e respeite `MAX_MENTIONS`, também declarado no cliente.

A lista usa páginas de 20 itens, por criação decrescente e ID. Edições seguem a última gravação, sem versionamento. `/tasks` mantém `status` e `task` na URL; o [painel lateral](side-panel.md) consulta detalhes independentemente da lista. `TaskForm` serve criação/edição e inclui `MentionPicker` conforme permissão, com busca adiada em 250 ms e termo na chave da consulta.

O dashboard consulta um agregado calculado em transação `repeatable read`: totais por status, responsáveis com mais tarefas e recorte sem responsável. Os cards abrem filtros da lista. Uma tarefa com vários responsáveis conta uma vez por pessoa; a soma por responsável pode exceder o total.

## Interface

Reutilize `AppShell`, `AppSidebar`, `PageContent`, `PageHeader` e `AuthLayout`; medidas e paddings pertencem aos layouts. `PageContent` é obrigatório em páginas autenticadas. Os componentes adaptam shadcn/ui conforme `components.json`; confira suas props locais:

- `Button` e `Badge` são nativos, sem `asChild`; links usam `buttonVariants`.
- `Avatar` usa `<Avatar name image size />`, com fallback por `onError`, sem Radix. Toda `img` precisa de `width` e `height`.
- Formulários usam `Field`; superfícies e estados usam `Card`, `Empty` e skeletons adequados ao conteúdo.
- Phosphor usa sufixo `Icon`, peso `regular` e 18 px em navegação/botões; configure `weight`, não `strokeWidth`.
- Gráficos usam Recharts por `chart.tsx`, `config` e `--color-<chave>`. Séries usam `--chart-1`/`--chart-2` por categoria, nunca por ranking; mantenha legenda com duas ou mais séries. Mudanças de cores exigem validação da skill `dataviz` nas duas superfícies.

### Layout e acessibilidade

Na sidebar desktop, preserve posições dos ícones/avatar e mantenha rótulos montados, ocultos por opacidade. A gaveta mobile controla Escape, foco e rolagem; fecha ao navegar ou mudar para desktop. Menus internos ficam dentro do dialog.

`Modal` usa tela cheia no mobile para formulários e painel inferior para confirmações; centraliza no desktop. Preserve cabeçalho visível, rolagem interna, áreas seguras e `visualViewport`. Foco inicial vai ao título no mobile e a Cancelar nas confirmações; mutations bloqueiam fechamento. `SidePanel` compartilha o controle de diálogo e tem seu contrato em [side-panel.md](side-panel.md).

Mantenha alvos de 44 px, campos de 16 px no mobile, foco visível, nomes acessíveis, `aria-current`, link para pular navegação e movimento reduzido, sem rolagem horizontal.

### Tema e feedback

`styles.css` centraliza tokens semânticos. Sem escolha salva, o tema segue o sistema; escolha manual prevalece e sincroniza entre abas. Preserve a mesma chave e resolução no `ThemeProvider` e no script inicial de `index.html`. Textos de autenticação tratam do acesso à conta, sem acoplamento ao domínio.

Sonner aparece uma vez no provider e comunica resultados de ações; erros persistentes usam `ErrorNotice`/`Alert`. `RouteError`, `RouteNotFound` e `RouteFeedback` centralizam recuperação por `router.invalidate()` e reset dos boundaries. Exiba apenas a mensagem técnica em vermelho, sem stack, cause, objetos de resposta ou segredos.

## Guias e execução

Autoria, leitura e formato compartilhado dos guias estão em [guides-authoring.md](guides-authoring.md). Setup e comandos ficam no [README](../README.md); build de produção, proxy e operação no [guia Railway](../.railway/README.md).
