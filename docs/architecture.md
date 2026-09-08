# Arquitetura

O monorepo usa os workspaces nativos do Bun: `apps/server` e `apps/client`. A raiz concentra comandos, lockfile e opções TypeScript compartilhadas. Cada app declara suas próprias dependências e scripts.

No servidor, o domínio é uma pasta independente de runtime, HTTP, autenticação e banco de dados. Cada módulo de negócio contém somente entidades, contratos e aplicação. As dependências são recebidas por parâmetros; `bootstrap.ts` conecta as implementações.

```text
apps/server/src/
  domain/
    tasks/
      entities/       # Estado e regras da tarefa
      contracts/      # Interfaces necessárias aos casos de uso
      application/    # Casos de uso das tarefas
  infrastructure/
    auth/             # Implementação Better Auth
    database/
      schema/         # Tabelas de autenticação e negócio
      client.ts       # Pool Bun SQL + Drizzle
    repositories/     # Implementações dos contratos de persistência
  interfaces/
    http/
      rpc/            # Procedures, validação de entrada e autenticação
      authentication.ts
      app.ts          # Elysia e montagem dos handlers
  config/env.ts       # Validação de configuração
  bootstrap.ts        # Montagem explícita das dependências
  main.ts             # Processo HTTP e encerramento
```

## Direção das dependências

```text
HTTP/oRPC ──→ aplicação ──→ entidades
                  │
                  └──────→ contratos ←── repositórios Drizzle

Better Auth ──→ contrato de autenticação do HTTP
bootstrap ──→ conecta todos os componentes
```

- **Entidades** preservam invariantes. `Task` valida título e descrição, controla a conclusão e protege seu estado. A edição preserva o estado; reabrir remove a data de conclusão.
- **Contratos** descrevem necessidades do domínio, sem tipos de query, tabelas ou sessões. O repositório recebe e devolve entidades.
- **Aplicação** coordena entidades e contratos. Relógio e IDs são funções injetadas para tornar o comportamento determinístico.
- **Infraestrutura** traduz entidades para registros e implementa autenticação. As tabelas Better Auth não são entidades de negócio.
- **HTTP** valida o formato da entrada, resolve a sessão e converte erros do domínio para códigos RPC. Recebe funções dos casos de uso, nunca um banco.

Os casos de uso recebem `ownerId` de um chamador confiável. No HTTP, ele vem exclusivamente da sessão Better Auth. Um `ownerId` enviado pelo cliente é ignorado. Qualquer entrada futura, como um job ou CLI, deve estabelecer a identidade antes de chamar a aplicação.

Não há container de DI, base repository, bus, eventos, aggregates ou classes abstratas comuns. Funções e interfaces bastam para esta base. Extraia algo compartilhado apenas quando houver uso real em mais de um módulo.

## Adicionar uma funcionalidade

1. Crie `domain/<modulo>/entities`, `contracts` e `application`, usando apenas as pastas necessárias.
2. Implemente e teste as regras e os casos de uso com um repositório em memória.
3. Adicione tabelas em `infrastructure/database/schema` e implemente os contratos em `infrastructure/repositories`.
4. Gere e revise a migration com `bun run db:generate`; aplique com `bun run db:migrate`.
5. Crie as procedures em `interfaces/http/rpc` e registre o módulo no router.
6. Conecte as dependências em `bootstrap.ts` e execute `bun run check`.

Para reutilizar a base, copie a configuração, a infraestrutura e a interface HTTP; substitua o módulo `tasks`, seu repositório, suas procedures e sua tabela. Em um projeto novo, gere uma nova migration inicial; em banco existente, preserve o histórico e crie uma migration incremental.

## Limites deliberados

A listagem usa páginas de 20 tarefas, ordenadas pela criação decrescente com desempate por ID, e filtro opcional por estado. Edições concorrentes seguem a última gravação; a base não implementa controle de versão ou histórico de alterações. O cliente usa a mesma origem do navegador: o Vite encaminha as requisições no desenvolvimento e um proxy reverso cumpre esse papel em produção. `TRUSTED_ORIGINS` autoriza origens explícitas no Better Auth. CORS para acesso direto entre origens deve ser configurado se esse modelo mudar. O cadastro por email e senha está habilitado; envio de email, recuperação de senha e verificação de endereço precisam de um provedor e configuração próprios.

`/health` indica que o processo responde; `/ready` verifica conectividade com PostgreSQL. Migrations são executadas separadamente, antes de iniciar a API. Os arquivos SQL, snapshots e o journal ficam em `apps/server/src/infrastructure/database/migrations`. O Drizzle Kit gera novas migrations nesse diretório, também usado pelo migrador e pelos testes de integração.

## OpenAPI

`interfaces/http/openapi` reúne a documentação gerada pelas procedures oRPC e pelo Better Auth. O plugin `@elysiajs/openapi` acrescenta as rotas Elysia e serve o Scalar em `/openapi` e a especificação em `/openapi/json`.

Cada procedure define seu método, caminho e descrição com `.route()`. `OpenAPIHandler` publica esses métodos sob `/api`; `RPCHandler` continua atendendo `/rpc`. Ambos recebem o mesmo router, os mesmos casos de uso e a mesma autenticação. Ao criar uma nova procedure, descreva seu input e output com `documented()` e JSON Schema, junto ao validador usado em runtime. Esses metadados existem apenas no transporte; o domínio não conhece OpenAPI.

`createApp` e `bootstrap` são assíncronos para concluir a geração dos schemas antes de iniciar o servidor. Uma falha na montagem encerra o pool de banco. Nos testes HTTP, aguarde `createApp` antes de chamar `app.handle`.

## Cliente

`apps/client/src/routes` define as rotas por arquivo do TanStack Router. `app/router.tsx` inicializa o router a partir da árvore gerada; os layouts ficam em `app`. As telas e consultas continuam nas respectivas `features`.

```text
routes/
  __root.tsx              # Layout raiz, erros e página não encontrada
  login.tsx              # /login, pública
  register.tsx           # /register, pública
  _authenticated.tsx     # Layout autenticado com sidebar, sem segmento na URL
  _authenticated/
    index.tsx            # / → /dashboard
    dashboard.tsx        # /dashboard
    tasks.tsx            # /tasks, validação de status e page
```

O prefixo `_` cria um layout sem acrescentar um segmento à URL. Os arquivos dentro de `_authenticated/` compartilham a verificação de sessão e a sidebar. A proteção real continua no servidor.

`tsr.config.json` centraliza os caminhos e a separação automática do código das páginas. O plugin do Vite gera `src/routeTree.gen.ts` durante o desenvolvimento; o script `routes:generate` executa a mesma geração antes da checagem de tipos e do build. Esse arquivo é ignorado pelo Git e não deve ser editado manualmente.

As funcionalidades ficam em `features/auth`, `features/dashboard` e `features/tasks`. Componentes de interface reutilizáveis ficam em `components`; os componentes shadcn/ui em `components/ui` são copiados e adaptados, com o código e a licença no repositório. `components.json` e o alias `@/` estão configurados para continuar essa biblioteca. O botão usa somente HTML nativo, sem a opção `asChild`.

`lib/auth.ts` configura Better Auth, `lib/rpc.ts` cria o cliente oRPC e `lib/query.ts` configura TanStack Query. O React nunca importa runtime, infraestrutura ou entidade de negócio do servidor. A entrada pública `@zeta/server/rpc` exporta somente `AppClient` e `AppRouter` como tipos.

TanStack Query usa a identidade na chave das consultas e limpa o cache quando a sessão muda. Mutations não são repetidas automaticamente. Após cada alteração, todas as consultas de tarefas do usuário são invalidadas. As chaves distinguem consultas comuns (`page`) das infinitas (`infinite`) e incluem usuário e filtro. Apenas consultas comuns incluem a página na chave. Dados de sessão ficam sob responsabilidade do Better Auth, sem duplicação em um estado de autenticação próprio.

Para adicionar um módulo no cliente, crie `features/<modulo>` com a tela e suas consultas, use os componentes compartilhados e crie o arquivo de rota em `routes` com `createFileRoute`. Para uma página autenticada, use `routes/_authenticated/<modulo>.tsx` e importe a tela da feature. O gerador atualiza a árvore e seus tipos automaticamente. Se a página precisar aparecer na navegação, acrescente o item em `components/layout/app-sidebar.tsx`. Adicione a procedure correspondente no servidor; a exportação tipada propaga sua assinatura ao cliente.

## Referências

- [Elysia com Better Auth](https://elysiajs.com/integrations/better-auth)
- [oRPC com Elysia](https://orpc.dev/docs/adapters/elysia)
- [Drizzle com Bun SQL](https://orm.drizzle.team/docs/connect-bun-sql)
- [Better Auth com Drizzle](https://www.better-auth.com/docs/adapters/drizzle)

## Imports

No servidor, `@server/` aponta para `apps/server/src`. Use esse alias entre camadas e módulos, por exemplo `@server/domain/tasks/entities/task`. Imports locais continuam relativos; dentro do domínio, imports relativos preservam sua portabilidade.

O cliente mantém `@/` para seu próprio `src` e reconhece `@server/` apenas para resolver as referências do contrato tipado `@zeta/server/rpc`. Continue consumindo esse contrato com `import type`, sem importar implementações do servidor no navegador. O Bun resolve o alias nativamente, sem plugins adicionais.

## Layout e diagramação

`components/layout` define a estrutura visual compartilhada:

- `AppShell`: sidebar fixa, cabeçalho de 64 px, localização da página e área principal. Recebe conteúdo, título, usuário e ação de saída; não consulta autenticação nem dados de negócio.
- `AppSidebar`: marca, navegação e identificação do usuário. A lista `navigation` centraliza os módulos; o link ativo recebe `aria-current`.
- `PageHeader`: título, descrição e ações da página, com quebra de linha nas telas menores.

`app/workspace.tsx` verifica a sessão e conecta o layout às páginas filhas via `Outlet`. As funcionalidades continuam em `features`; evite colocar consultas e regras de negócio nos componentes de layout.

A sidebar usa 240 px expandida e 72 px recolhida no desktop (a partir de 1024 px). A preferência é salva em `localStorage` na chave `zeta:sidebar-collapsed`, com fallback caso o armazenamento não esteja disponível. Essa chave armazena apenas uma preferência visual.

No celular, a navegação usa um `dialog` nativo, com fundo sobreposto, foco contido, fechamento por Escape, botão ou clique externo e retorno do foco ao acionador. Ao mudar para desktop, o menu móvel fecha e libera a rolagem. O link “Ir para o conteúdo” permite pular a navegação pelo teclado.

Padrão para novas páginas autenticadas: `PageContent` e `PageHeader`. O container compartilhado limita o conteúdo a 1280 px, com padding horizontal de 20/32 px, vertical de 28/36 px e espaçamento entre blocos de 28 px (celular/telas a partir de `sm`). Features não repetem essas classes. Formulários podem usar uma grade interna de descrição e campos, mantendo os cabeçalhos alinhados entre rotas. No perfil, cada seção ocupa a largura do container com descrição à esquerda e formulário à direita a partir de `md`; no celular, os blocos ficam empilhados. Títulos usam 24 px; textos de apoio, 14 px; controles usam as variantes de `Button`. A tela de tarefas usa a largura inteira para a lista. Criação e edição abrem o mesmo formulário em `Modal`, com foco inicial no campo de título no desktop e no cabeçalho no celular, evitando abrir o teclado automaticamente. O dialog nativo contém o foco, fecha por Escape ou clique externo e bloqueia o fechamento durante a gravação. A exclusão usa uma confirmação com o título da tarefa e foco inicial em Cancelar. No celular, metadados ficam abaixo do título e as ações mantêm rótulos acessíveis.

As cores estão nos tokens de `styles.css`, incluindo `sidebar` e `sidebar-active`. Os componentes respeitam a preferência de movimento reduzido. Para replicar, personalize marca e tokens, registre a navegação e use os mesmos componentes de layout nas novas funcionalidades.

## Dashboard e rotas de tarefas

`/dashboard` consulta os totais de pendentes e concluídas usando as consultas já existentes, sem um novo endpoint ou dependências. Os cards abrem `/tasks` com o filtro correspondente. A barra de progresso aparece acima das cinco tarefas pendentes mais recentes. Os totais representam todas as tarefas, não apenas a página retornada.

Em `/tasks`, `status` (`all`, `pending`, `completed`) fica na URL, validado pelo router. `useInfiniteQuery` mantém as páginas no cache de cada filtro; um filtro ainda não consultado começa na página 1. Os botões do navegador recuperam os filtros anteriores. Criar uma tarefa retorna ao filtro Todas. Todas as mutações invalidam as consultas do usuário, incluindo as usadas no dashboard.

`AuthLayout` centraliza a apresentação de login e cadastro: marca, título, descrição, formulário e link alternativo. Essas páginas usam os mesmos tokens, tipografia, bordas e controles do restante da aplicação. Após autenticar, o usuário entra no dashboard.

## Username no Better Auth

O nome de usuário é um identificador de autenticação, separado do nome de exibição e do domínio de tarefas. `infrastructure/auth/better-auth.ts` habilita `username()` com as regras padrão do Better Auth. `infrastructure/database/schema/auth.ts` declara `username` único e opcional e `displayUsername` opcional; a migration preserva usuários anteriores.

`lib/auth.ts` registra `usernameClient()`. A tela de acesso seleciona `signIn.email` para entradas com `@` e `signIn.username` para as demais, sem tentar autenticar duas vezes nem consultar publicamente a conta antes do login. O cadastro envia o username via `signUp.email`. Formato, normalização e unicidade são responsabilidade do plugin no servidor; a validação HTML serve apenas como ajuda imediata.

Os endpoints de username aparecem nas seções Acesso e Conta do Scalar. O domínio continua recebendo exclusivamente o ID de usuário da sessão, sem depender do username ou do Better Auth.

## Ícones

O cliente usa `@phosphor-icons/react`, com peso `regular` como padrão. Importe os componentes com sufixo `Icon` diretamente do pacote e controle o tamanho com as classes `size-*`. Use `weight` para variar o estilo, em vez de `strokeWidth`. O `components.json` declara `phosphor` como biblioteca de ícones do shadcn/ui.

## Infraestrutura Railway

`.railway/railway.ts` descreve o ambiente com três serviços: PostgreSQL, API privada e cliente público. O SDK Railway é exclusivo do desenvolvimento; os runtimes são Bun. O build de cada app usa seu Dockerfile com contexto na raiz do monorepo.

`apps/client/server` serve o build Vite e encaminha os endpoints da API para a rede privada, preservando cookies e origem pública. Não contém regras de negócio. O servidor continua sendo a autoridade de autenticação e autorização. As variáveis compartilhadas `PUBLIC_URL` e `BETTER_AUTH_SECRET` são referências do IaC; os segredos ficam no Railway.

As migrations são aplicadas pelo pré-deploy da API; `/ready` verifica o banco. O cliente usa `/_health` para verificar sua própria disponibilidade. Os procedimentos de plan, apply, domínio e envio de código estão em [`.railway/README.md`](../.railway/README.md).

## Comportamento mobile

A navegação abaixo de 1024 px usa uma gaveta lateral animada de até 320 px, com fundo sobreposto, itens de 48 px e espaço para as áreas seguras do dispositivo. Selecionar uma rota fecha a gaveta; Escape e o botão de fechar devolvem o foco ao acionador. A preferência de recolhimento do desktop é independente do menu mobile.

`Modal` mantém uma API compartilhada: formulários ocupam a tela abaixo de 640 px e `variant="confirmation"` apresenta um painel inferior. Acima desse breakpoint, ambos ficam centralizados. Cabeçalho e fechamento permanecem visíveis; o corpo rola internamente. Os formulários mantêm as ações no rodapé e adaptam a altura ao `visualViewport`, inclusive quando o teclado reduz a área disponível. Ao abrir no celular, o foco vai ao cabeçalho do formulário; na confirmação, vai a Cancelar.

Botões têm áreas de toque de pelo menos 44 px no celular e em dispositivos com ponteiro de toque. Inputs e textareas usam 16 px no mobile. Os filtros ocupam uma linha própria, a ação principal da página usa a largura disponível e as tarefas mostram Editar/Excluir abaixo dos detalhes. O body não impõe largura mínima; preserve a ausência de rolagem horizontal em telas estreitas.

### Rolagem infinita

Listagens incrementais usam `infiniteQueryOptions` na feature, consumido por `useInfiniteQuery`. `features/tasks/queries.ts` é o exemplo: começa na página 1, encaminha o sinal de cancelamento e calcula a próxima página usando `page`, `pageSize` e `total`. A API mantém seu contrato de paginação; não é necessário um endpoint específico para rolagem.

`components/infinite-scroll.tsx` observa a proximidade do fim com `IntersectionObserver` e mantém um botão para carregamento manual e acesso por teclado. A feature fornece `hasNextPage`, estados de busca/erro e callback. Não há nova busca durante outra requisição, nem repetição automática após falha. Sem IntersectionObserver, o botão continua funcionando.

A tela preserva os itens ao carregar outra página e apresenta erros iniciais, de atualização e de continuação separadamente. Uma falha de atualização pausa a continuação até a nova tentativa pelo aviso superior. Após mutations, a invalidação do prefixo do usuário atualiza as páginas carregadas sequencialmente e também os totais do dashboard. IDs repetidos são deduplicados na apresentação, mas alterações concorrentes com paginação por offset ainda podem causar omissões até atualizar a lista.

### Perfil da conta

A rota autenticada `/profile` conecta `features/profile` ao layout comum. O acesso fica no bloco de avatar, nome e email acima de Sair, inclusive com sidebar recolhida e no celular. Nome exibido e username são atualizados por `authClient.updateUser({ name, username })`, com validação de formato e unicidade pelo plugin e a senha por `authClient.changePassword`, exigindo a senha atual e confirmação local da nova senha. A troca revoga outras sessões, mantém a sessão corrente renovada e limpa os campos de senha após sucesso. A interface não edita email. Contas antigas sem username podem manter o campo vazio ou definir um; um username existente não pode ser apagado pelo formulário. Os dados continuam sob responsabilidade do Better Auth; não há entidade de usuário no domínio nem endpoint RPC duplicado.
