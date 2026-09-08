# Guia de trabalho do projeto

Este arquivo descreve as convenções de arquitetura, os fluxos técnicos e os acordos de desenvolvimento do monorepo. Regras de negócio e decisões de produto pertencem à documentação do domínio, não às convenções da base.

Antes de implementar uma mudança:

- Leia `README.md` para operação local e `docs/architecture.md` para detalhes da implementação.
- Consulte `CONTEXT.md` para o vocabulário, as regras e os limites do domínio. Confronte essa documentação com os módulos, casos de uso e testes envolvidos na mudança.
- Confira os manifests, as rotas e as configurações antes de presumir nomes, versões ou comportamentos. Uma funcionalidade existente não estabelece requisitos para todos os outros módulos.
- Se houver divergência entre documentação, código e pedido do usuário, identifique-a e ajuste o contexto junto com a implementação; não perpetue regras antigas por estarem documentadas aqui.

`CLAUDE.md` é um link simbólico relativo para `AGENTS.md`. Edite este arquivo como fonte única das instruções; não substitua o link por uma cópia independente.

## Acordos de desenvolvimento

- Use Bun como runtime, gerenciador de pacotes e executor de scripts. Não introduza npm, pnpm, Yarn ou seus lockfiles.
- Mantenha um único `bun.lock` na raiz. Instale dependências no workspace que as utiliza; preserve versões exatas como nos manifests existentes.
- Peça confirmação antes de adicionar novas dependências de produção. Ferramentas de build, tipos e ferramentas locais de banco ficam em `devDependencies`.
- Mantenha TypeScript estrito e ESM. Use `import type` para tipos; não enfraqueça o `tsconfig` para contornar erros.
- Prefira funções, interfaces e composição explícita. Não acrescente camadas, abstrações genéricas ou dependências sem uma necessidade concreta.
- Preserve alterações existentes e configurações locais. Não sobrescreva `.env` nem exponha segredos em código, logs, documentação ou respostas.
- Para documentação atual de bibliotecas e CLIs, use a skill global `find-docs` com o CLI instalado `ctx7` diretamente: primeiro `ctx7 library`, depois `ctx7 docs`. Não use Context7 MCP nem `npx ctx7`. Se a ferramenta não estiver disponível, informe a limitação e consulte fontes oficiais.
- Ao alterar arquitetura, comandos ou fluxos, atualize a documentação correspondente e este guia quando necessário.

## Stack e organização

A raiz contém os workspaces nativos do Bun (`apps/*`), os comandos comuns, `bun.lock`, `tsconfig.base.json` e `compose.yaml`.

- `apps/server`: Bun, TypeScript 7, Elysia, Drizzle ORM, oRPC, Better Auth e PostgreSQL.
- `apps/client`: React, TypeScript 7, Vite 8, TanStack Router, TanStack Query, Tailwind CSS 4, componentes shadcn/ui adaptados e Phosphor Icons.
- As versões exatas ficam nos respectivos `package.json`. Não atualize versões incidentalmente ao implementar uma funcionalidade.

```text
apps/server/
  src/
    domain/<modulo>/
      entities/                     # Estado e invariantes
      contracts/                    # Interfaces necessárias aos casos de uso
      application/                  # Casos de uso
    infrastructure/
      auth/better-auth.ts           # Better Auth e adapter Drizzle
      database/
        client.ts                   # Pool Bun SQL + Drizzle
        schema/                     # Tabelas de autenticação e negócio
        migrations/                 # SQL, snapshots e meta/_journal.json
      repositories/                 # Implementações Drizzle dos contratos
    interfaces/http/
      authentication.ts             # Contrato de autenticação do transporte
      rpc/                          # Router, procedures, contexto e schemas
      openapi/                      # Documento OpenAPI e organização do Scalar
      app.ts                        # Elysia e handlers
    config/env.ts                   # Validação das variáveis de ambiente
    bootstrap.ts                    # Composição das implementações
    client.ts                       # Exportação pública somente de tipos
    main.ts                         # Inicialização HTTP e encerramento
  scripts/migrate.ts
  drizzle.config.ts
  tests/{unit,http,integration,helpers}/
apps/client/
  src/
    app/                            # Inicialização do router e layouts com sessão
    routes/                         # Rotas por arquivo
    features/<funcionalidade>/      # Telas, consultas e componentes da funcionalidade
    components/layout/              # Shell, sidebar e cabeçalhos
    components/ui/                  # Primitivos compartilhados
    components/brand.tsx            # Marca em SVG e tipografia
    lib/                            # Clientes de auth, RPC, Query e utilitários
    styles.css                      # Tailwind e tokens visuais
  components.json                   # Configuração shadcn/ui
  tsr.config.json                   # Geração de rotas
  vite.config.ts                    # Plugins, alias e proxy local
```

`<modulo>` e `<funcionalidade>` representam nomes definidos pelo domínio; não são diretórios literais. Consulte os `package.json` para os nomes dos workspaces.

## Servidor: direção das dependências

O domínio usa apenas TypeScript, sem Bun, Node, Elysia, Drizzle, oRPC ou Better Auth. `tsconfig.domain.json` verifica essa separação sem tipos de runtime.

- Entidades validam invariantes e controlam o estado. Não são tabelas Drizzle nem DTOs HTTP.
- Contratos descrevem as necessidades da aplicação. Não exponha queries, tabelas, sessões ou tipos de bibliotecas nesses contratos.
- Aplicação coordena entidades e contratos. Repositórios, relógio e geração de IDs são injetados por parâmetros; não acesse banco, relógio global ou runtime diretamente nos casos de uso.
- Infraestrutura implementa os contratos e converte registros em entidades. A persistência fica em `infrastructure/repositories`.
- HTTP valida entradas, resolve a identidade e traduz erros de domínio para erros RPC. As procedures recebem casos de uso, não o banco.
- `bootstrap.ts` é o ponto de composição: cria banco, repositórios, casos de uso, autenticação e aplicação HTTP. `main.ts` cuida do processo.

Não há container de DI, repository base, bus ou hierarquia de classes abstratas. Não introduza essas estruturas por convenção. O domínio se organiza em entidades, contratos e aplicação.

Use `@server/` para imports entre camadas do servidor; ele aponta para `apps/server/src`. Imports locais podem continuar relativos. Dentro do domínio, preserve imports relativos e sua independência.

## Domínio e autorização

Organize cada módulo de negócio em `domain/<modulo>`, usando entidades, contratos e aplicação conforme a necessidade. Defina nomes, invariantes, transições de estado e casos de uso a partir dos requisitos do produto. Não presuma que todo módulo possui proprietário individual, estados de conclusão, operações CRUD ou as mesmas regras de validação.

Mantenha o vocabulário e as regras de negócio em `CONTEXT.md`; use os testes do domínio para verificar invariantes e comportamentos. Ao introduzir ou substituir um módulo, atualize esse contexto e os fluxos afetados. Não replique limites de campos, estados ou indicadores de uma funcionalidade sem que façam sentido para a nova.

A identidade do chamador vem da sessão validada no transporte. Nos recursos privados por usuário, derive o proprietário dessa identidade, nunca de um campo enviado pelo navegador. Caso o produto tenha organizações, equipes ou permissões, estabeleça e valide esse escopo explicitamente antes de acessar os recursos. Outros chamadores, como jobs, também precisam estabelecer uma identidade ou escopo confiável.

Aplique a autorização em cada operação, inclusive listagens. Não exponha a existência de recursos privados fora do escopo autorizado; use a resposta apropriada à política da API. Autenticação por si só não concede acesso a todos os dados, e esconder controles na interface não substitui a autorização no servidor.

## HTTP, oRPC e OpenAPI

- `/rpc/*` usa `RPCHandler` e é consumido pelo cliente React.
- Endpoints de negócio sob `/api` usam `OpenAPIHandler`, com JSON convencional e caminhos definidos nas procedures.
- Os dois handlers utilizam as mesmas procedures e casos de uso; não duplique a implementação REST/RPC.
- `/api/auth/*` é atendido pelo Better Auth.
- `/health` verifica o processo; `/ready` verifica a conexão com PostgreSQL.
- `/openapi` apresenta o Scalar; `/openapi/json` serve a especificação.

As procedures definem método, caminho, resumo e tags com `.route()`. Os schemas de entrada e saída combinam validação em runtime e JSON Schema por meio de `documented()`. Ao mudar um endpoint, mantenha os validadores e a documentação coerentes. Traduza erros de domínio para códigos como `BAD_REQUEST` e `NOT_FOUND` no transporte.

`interfaces/http/openapi` combina os documentos de oRPC, Better Auth e Elysia. `auth-sections.ts` organiza o grupo Auth em Acesso, Sessões, Conta e outras seções; novos endpoints de autenticação podem exigir atualização desse agrupamento. Não edite documentos gerados para mudar endpoints.

`createApp` e `bootstrap` são assíncronos, pois aguardam a geração dos schemas. Nos testes, aguarde a criação antes de usar `app.handle`. Preserve o fechamento do pool na falha de inicialização e no encerramento do processo.

## Autenticação e identidade

Better Auth gerencia usuários, senhas e sessões em cookies. As tabelas de autenticação são infraestrutura, não entidades de negócio. Não guarde tokens de sessão em localStorage nem crie uma segunda implementação de autenticação.

O servidor habilita `username()` e o cliente registra `usernameClient()`. O login usa um único campo: entradas com `@` chamam `signIn.email`; as demais chamam `signIn.username`. Não tente os dois métodos sequencialmente nem consulte a existência pública da conta antes do login.

O cadastro da interface exige username de 3 a 30 caracteres, com letras ASCII, números, ponto ou sublinhado, enviado por `signUp.email`. O plugin valida e normaliza no servidor; o banco garante unicidade. `username` e `displayUsername` são opcionais na tabela para preservar contas anteriores, que continuam entrando por email. O domínio recebe o ID da sessão, nunca o username como substituto da identidade.

Recuperação de senha, verificação de email e provedores sociais precisam de configuração própria. Um endpoint aparecer no Scalar não significa que seu provedor esteja configurado.

## Banco e migrations

PostgreSQL é acessado por Drizzle sobre Bun SQL na API e no migrador. O pacote `postgres` é uma dependência de desenvolvimento para Drizzle Kit/Studio; não o use para substituir o pool da API.

Todas as migrations ficam em `apps/server/src/infrastructure/database/migrations`, incluindo `meta/`, snapshots e journal. `drizzle.config.ts`, `scripts/migrate.ts` e os testes de integração apontam para esse local. Não crie migrations em uma pasta `drizzle/` separada.

Altere as tabelas em `schema/`, execute `db:generate`, revise o SQL e aplique com `db:migrate`. Preserve migrations já aplicadas; faça mudanças incrementais. Não renumere, apague ou regenere o histórico para resolver uma divergência de schema.

`db:push` altera o banco diretamente sem gerar migrations: use apenas quando esse fluxo for solicitado, normalmente em experimentos locais. `db:pull` introspecta o banco e gera arquivos; revise os resultados. Não execute esses comandos como simples validação sem efeitos colaterais.

## Cliente: rotas e dados

Use `@/` para imports do cliente. A exportação pública `/rpc` do workspace do servidor é exclusiva para `import type` de `AppClient`/`AppRouter`; não importe runtime ou implementações do servidor no navegador. O alias `@server/` no TypeScript do cliente resolve referências desses tipos, não é uma API de acesso à infraestrutura.

O código do navegador usa `apps/client/tsconfig.json`. O runtime de produção e seus testes usam `tsconfig.server.json`, com tipos do Bun; os arquivos `server/tsconfig.json` e `tests/tsconfig.json` herdam essa configuração para descoberta automática pelo editor. Preserve essa separação: não adicione tipos globais do Bun ao frontend para corrigir avisos do editor.

O TanStack Router usa rotas por arquivo. A organização abaixo representa o padrão; as páginas de negócio e o destino inicial são definidos pelo produto:

```text
src/routes/
  __root.tsx                # Layout raiz, erro e página não encontrada
  login.tsx                 # /login
  register.tsx              # /register
  _authenticated.tsx        # Layout com sessão e sidebar, sem segmento na URL
  _authenticated/
    index.tsx               # Entrada autenticada; destino definido pelo produto
    <pagina>.tsx            # Página autenticada e validação dos parâmetros
```

Os arquivos de rota conectam telas de `features`, parâmetros e layouts. Mantenha consultas e formulários nas funcionalidades. Para uma nova página autenticada, crie `routes/_authenticated/<pagina>.tsx` com `createFileRoute` e registre a navegação em `components/layout/app-sidebar.tsx`, se necessário.

`app/router.tsx` importa `routeTree.gen.ts`. O plugin TanStack vem antes do plugin React no Vite. `tsr.config.json` centraliza a geração e o code splitting. O Vite gera a árvore durante o desenvolvimento; `routes:generate` roda antes do typecheck/build. Não edite nem versione `routeTree.gen.ts` ou `.tanstack/`.

`app/workspace.tsx` verifica a sessão e conecta `AppShell` ao `Outlet`; a autorização real permanece no servidor. `app/root-layout.tsx` cancela consultas e limpa o cache quando muda a identidade da sessão, incluindo mudanças entre abas.

Better Auth cuida da sessão; TanStack Query cuida dos dados de negócio. As chaves incluem usuário, formato da consulta e filtro; consultas comuns também incluem a página. Nunca compartilhe uma chave entre consultas comuns e infinitas. Mutations não são repetidas automaticamente e invalidam as consultas afetadas no escopo autorizado, inclusive resumos e indicadores que dependam dos mesmos dados. Não mantenha uma cópia da sessão em um store próprio.

Filtros compartilháveis pertencem à URL e são validados pela rota de acordo com o domínio. Em listagens infinitas, as páginas ficam no cache do TanStack Query, separadas por identidade e filtros. Indicadores devem usar totais retornados pela API ou consultas específicas, nunca presumir que o tamanho da página representa o total de registros.

### Padrão de listagens incrementais

Use rolagem infinita como padrão para listagens que carregam mais registros conforme a navegação.

- Use `infiniteQueryOptions` na feature e `useInfiniteQuery` na tela, com identidade e filtros na chave, `initialPageParam` explícito e `getNextPageParam` retornando `undefined` no fim. Encaminhe o `signal` ao cliente RPC.
- Reutilize `components/infinite-scroll.tsx` como gatilho de proximidade e botão acessível. A feature controla a consulta; o componente não conhece endpoints ou o domínio. Bloqueie novas buscas durante `isFetching`, use `fetchNextPage({ cancelRefetch: false })` e pause após erro de atualização.
- Preserve itens já carregados durante novas buscas e erros. Diferencie erro inicial, erro de atualização e erro da próxima página; este último exige tentativa manual, sem loop automático. Não remova páginas antigas com `maxPages` sem planejar o efeito na posição da rolagem.
- Invalide o prefixo da funcionalidade no escopo afetado após mutations. O Query atualiza as páginas carregadas em sequência; não faça append manual no cache. Consultas comuns de resumos ou indicadores usam chaves distintas das listagens infinitas.
- O contrato da API define tamanho de página, ordenação determinística e continuação por página ou cursor. A tela une `data.pages` e evita IDs repetidos. Paginação por offset pode omitir itens sob alterações concorrentes; a atualização da lista recompõe as páginas. Não trate a deduplicação como garantia de snapshot consistente nem imponha o mesmo tamanho de página a todos os módulos.

## Interface e acessibilidade

Os textos de login e cadastro devem se limitar ao acesso e à criação da conta, sem acoplamento às funcionalidades de negócio.

A identidade visual é centralizada nos tokens de `styles.css`; a configuração existente usa preto, branco e cinzas. Mudanças de marca devem partir desses tokens, preservando contraste, hierarquia visual e adaptação a telas menores. A marca fica em `components/brand.tsx`, o favicon em `public/favicon.svg` e o título em `index.html`.

- Use `AppShell`, `AppSidebar`, `PageHeader` e `AuthLayout` para a estrutura comum. Layouts não consultam dados de negócio.
- Componentes shadcn/ui são código local em `components/ui`, com licença preservada. Use as variantes existentes de `Button`; ele é um botão nativo e não implementa `asChild`. Para links com aparência de botão, use `buttonVariants`.
- Use Phosphor (`@phosphor-icons/react`), imports com sufixo `Icon` e peso padrão `regular`. Navegação e botões usam 18 px; ilustrações de estado vazio podem ser maiores. Use `weight`, não `strokeWidth`; não reintroduza Lucide.
- A sidebar mede 240 px expandida e 72 px recolhida no desktop. Sua preferência fica no localStorage, em uma chave com namespace da aplicação definida no layout. Ícones e avatar mantêm a posição; textos continuam montados e desaparecem por opacidade, sem alterar o layout. “Workspace” dá lugar a uma linha discreta no estado recolhido.
- No celular, a navegação usa `dialog` nativo. Preserve Escape, contenção e retorno do foco, bloqueio da rolagem e fechamento ao mudar para desktop.
- `Modal` usa tela cheia abaixo de 640 px para formulários e painel inferior para `variant="confirmation"`. No desktop, ambos ficam centralizados. Preserve o cabeçalho fixo, a rolagem interna, as áreas seguras e o ajuste ao `visualViewport`. No celular, formulários começam com foco no título para evitar abrir o teclado automaticamente; confirmações focam Cancelar. Preserve o bloqueio de fechamento durante uma mutation.
- Use alvos de toque de pelo menos 44 px e campos com texto de 16 px no celular. Em listagens, mantenha as ações identificadas e acessíveis no celular; filtros e ações de página devem se adaptar à largura disponível. Não imponha largura mínima ao body que provoque rolagem horizontal.
- Controles só com ícones precisam de nomes acessíveis. Preserve `aria-current`, foco visível, link para pular a navegação e suporte a movimento reduzido.

## Ambiente e execução

Use os `.env.example` como referência e preserve `.env` existentes. O Bun carrega o ambiente do servidor quando o comando roda em `apps/server`.

O servidor exige `DATABASE_URL`, `BETTER_AUTH_URL` e `BETTER_AUTH_SECRET` (aleatório, pelo menos 32 caracteres; o placeholder é recusado). `PORT` usa 3000 por padrão. `TRUSTED_ORIGINS` contém origens HTTP(S) explícitas separadas por vírgula. Nunca desabilite a proteção de origem para contornar um erro de login.

O cliente local roda em 3001. O Vite encaminha `/api`, `/rpc`, `/openapi`, `/health` e `/ready` para a API; `API_PROXY_TARGET` pode alterar o destino e é exclusivo do processo Vite. Não coloque segredos em variáveis públicas do frontend.

Em produção, sirva `apps/client/dist` com fallback de SPA e proxy para a API na mesma origem; o proxy do Vite não está no bundle. O servidor gera `apps/server/dist/server`, executável standalone Bun com dependências incorporadas. O build usa ESM, bytecode, minificação, nomes preservados e sourcemaps; não incorpore variáveis de ambiente ou segredos. `start` executa o binário e `dev` mantém watch no código-fonte. Compile na plataforma de destino (Linux no Docker); não copie um binário macOS para produção. Bun e dependências externos continuam na imagem para o migrador do pré-deploy. Aplique migrations antes de iniciar a API. HTTPS e origens autorizadas devem refletir os endereços reais. Desenvolvimento, preview e runtime do cliente usam 3001 por padrão; desenvolvimento e preview não rodam simultaneamente nessa porta. Mantenha a origem pública autorizada para autenticação.

## Inicialização e publicação

`scripts/setup.ts` prepara o ambiente local e usa `setup-project.ts` para renomear os pontos explícitos de identidade e criar `.env` ausentes com segredo aleatório. Preserve arquivos existentes integralmente, mantenha comandos como arrays de argumentos e não registre segredos. `--dry-run` não modifica arquivos; `--database skip` não acessa banco. A opção Docker só migra a URL local do Compose fornecido, após validação, e sobrepõe a variável de banco herdada do terminal com o ambiente validado. O setup não remove domínio, README, migrations ou histórico Git.

`scripts/publish.ts` é opcional e exige terminal interativo. Mostra destino, visibilidade e arquivos antes de confirmar criação, commit e push; preserva `origin` e usa o remoto `publish`. Não permita publicação implícita por `--yes` no setup. Não faça force push, não sobrescreva repositórios existentes e bloqueie arquivos `.env` candidatos ao commit. Falhas parciais exigem conferir o estado local/remoto antes de prosseguir. Os testes dos scripts usam diretórios temporários; nunca execute o setup mutável na própria base apenas para validá-lo.

## Comandos e validação

Execute na raiz:

| Comando | Finalidade |
| --- | --- |
| `bun run setup` | Preparar o projeto localmente |
| `bun run publish:github` | Publicação opcional com revisão interativa |
| `bun run db` | Iniciar PostgreSQL do Compose |
| `bun install --frozen-lockfile` | Instalar as dependências existentes |
| `bun run dev` | API e cliente em paralelo |
| `bun run dev:server` / `bun run dev:client` | Executar um app |
| `bun run typecheck` | Tipos dos apps e independência do domínio |
| `bun run test` | Testes unitários, HTTP e proxy do cliente sem banco |
| `bun run test:integration` | Integração real com PostgreSQL |
| `bun run build` | Build dos dois apps |
| `bun run check` | Typecheck, testes sem banco e build |
| `bun run db:generate` / `bun run db:migrate` | Gerar/aplicar migrations |
| `bun run db:studio` | Iniciar Drizzle Studio |
| `bun run db:check` | Verificar consistência das migrations |
| `bun run db:push` / `bun run db:pull` | Sincronização direta/introspecção |
| `bun run --cwd apps/client routes:generate` | Gerar a árvore de rotas manualmente |

`bun run test` executa o script; `bun test` faz descoberta própria e pode incluir integração. Para comandos interativos do Drizzle, execute dentro de `apps/server`, pois `--filter` pode não repassar o TTY.

Os testes de domínio usam repositório em memória e dependências determinísticas. Os testes HTTP usam a aplicação Elysia sem banco. A integração exige `TEST_DATABASE_URL` apontando para PostgreSQL de desenvolvimento/testes com permissão `CREATEDB`: cria um banco aleatório, valida migrations, autenticação e isolamento e remove esse banco ao terminar. Não execute contra infraestrutura de produção. A suíte também verifica a preservação de registros do schema anterior.

Faça verificações proporcionais à mudança. Para regras, transporte ou autenticação, rode os testes correspondentes; para mudanças de banco, valide migrations e integração quando o ambiente estiver disponível. `bun run check` não inclui integração. Informe quais verificações passaram e qualquer bloqueio real, sem afirmar que testes não executados passaram.

## Adicionar funcionalidades

1. Consulte os requisitos e o contexto do domínio; defina regras e contratos usando só as pastas necessárias.
2. Implemente casos de uso e verifique seu comportamento com dependências em memória.
3. Adicione schema e repositório; gere e revise migrations quando necessário.
4. Exponha procedures com validação, documentação e autorização no transporte.
5. Conecte as dependências em `bootstrap.ts` e registre o módulo no router.
6. No cliente, crie a feature, consultas e rota por arquivo; reutilize o layout e os componentes compartilhados.
7. Mantenha invalidação do cache, estados de carregamento/erro e acessibilidade.
8. Execute as verificações relevantes. Atualize `CONTEXT.md` quando mudar regras ou vocabulário, `README.md` quando mudar a operação e `docs/architecture.md` quando mudar a implementação. Registre neste guia apenas convenções transversais.

Ao mudar a identidade ou o escopo do produto, revise também nomes dos workspaces e seus imports, marca e metadados, namespace das preferências locais, navegação, rota inicial, variáveis de ambiente e identificação da infraestrutura. Faça essas alterações quando estiverem no escopo solicitado; não renomeie a aplicação nem remova módulos ou migrations apenas para adequá-los a este guia.

## Railway: infraestrutura e deploy

`.railway/railway.ts` é a fonte de infraestrutura do ambiente inteiro e usa o SDK oficial `railway/iac`, instalado somente como dependência de desenvolvimento na raiz. Não use `railway.json` ou `railway.toml`. Leia `.railway/README.md` antes de alterar o deploy.

- Use exclusivamente o CLI global `railway` para operações Railway. Não instale nem configure Railway MCP e não execute `railway setup agent`. Avisos sobre MCP ausente são intencionais. Atualizações da skill global usam `skills update -g use-railway`.
- O IaC define `postgres`, `server` e `client`. Os builds usam a raiz do monorepo e os Dockerfiles em cada app; não altere a Root Directory para uma subpasta.
- Apenas `client` precisa de domínio público. Ele serve `dist` e encaminha `/api`, `/rpc`, `/openapi`, `/health` e `/ready` à API privada usando Bun. O Vite não é servidor de produção.
- `PUBLIC_URL` e `BETTER_AUTH_SECRET` são variáveis compartilhadas previamente configuradas no Railway e referenciadas por `ctx.shared`. Não coloque valores secretos no IaC. `DATABASE_URL`, `API_HOST` e `API_PORT` usam referências entre recursos.
- A API executa migrations no pré-deploy e usa `/ready` como healthcheck. O cliente usa `/_health`. Ambos escutam em `::`, para a rede privada IPv6 e IPv4.
- `bun run railway:typecheck` valida os tipos; `bun run railway:plan` lê o estado remoto e compara mudanças. Confirme o projeto e ambiente antes de qualquer operação remota. Não aplique o plano sem solicitação explícita; recursos omitidos podem ser removidos.
- Não use `apply --yes` ou `--confirm-destructive` sem aprovação do plano exato. Configuração aplicada e código publicado são etapas distintas; só reporte deploy concluído após verificar `SUCCESS`.
- `apps/client/server` contém o runtime Bun de produção; `apps/client/tests` verifica estáticos, fallback SPA, proxy, cookies e erros de conexão. Preserve esses comportamentos ao alterar o runtime. `bun run check` inclui esses testes e o typecheck do IaC.
- `.dockerignore` e `.railwayignore` impedem o envio de `.env`, dependências e builds locais. Preserve essas exclusões.
