<div align="center">

<img src="docs/assets/logo.svg" alt="Zeta" width="88" />

<br><br>

**Uma base full-stack em TypeScript para começar seu próximo projeto.**

Bun de ponta a ponta · Domínio independente · Autenticação pronta · Interface responsiva

<br>

<a href="https://bun.com"><img src="https://img.shields.io/badge/Bun-171717?style=flat-square&logo=bun&logoColor=white" alt="Bun" /></a>
<a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript_7-171717?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 7" /></a>
<a href="https://elysiajs.com"><img src="https://img.shields.io/badge/Elysia-171717?style=flat-square" alt="Elysia" /></a>
<a href="https://orm.drizzle.team"><img src="https://img.shields.io/badge/Drizzle-171717?style=flat-square&logo=drizzle&logoColor=white" alt="Drizzle ORM" /></a>
<a href="https://orpc.dev"><img src="https://img.shields.io/badge/oRPC-171717?style=flat-square" alt="oRPC" /></a>
<a href="https://www.better-auth.com"><img src="https://img.shields.io/badge/Better_Auth-171717?style=flat-square" alt="Better Auth" /></a>
<br>
<a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/PostgreSQL-171717?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
<a href="https://vite.dev"><img src="https://img.shields.io/badge/Vite_8-171717?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" /></a>
<a href="https://react.dev"><img src="https://img.shields.io/badge/React-171717?style=flat-square&logo=react&logoColor=white" alt="React" /></a>
<a href="https://tanstack.com"><img src="https://img.shields.io/badge/TanStack_Router_%2B_Query-171717?style=flat-square" alt="TanStack Router e Query" /></a>
<a href="https://ui.shadcn.com"><img src="https://img.shields.io/badge/shadcn%2Fui-171717?style=flat-square" alt="shadcn/ui" /></a>
<a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS_4-171717?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" /></a>

<br><br>

[Começar](#começar) · [O que vem pronto](#o-que-vem-pronto) · [Estrutura](#estrutura) · [Seu projeto](#transformar-a-base-no-seu-projeto) · [Deploy](#deploy)

</div>

---

O Zeta reúne a infraestrutura comum de uma aplicação web para você concentrar o trabalho nas regras do seu produto. O monorepo usa workspaces nativos do Bun, composição explícita de dependências e um domínio que não importa frameworks ou banco de dados.

O gerenciador de tarefas é um **exemplo completo de implementação**: entidade, contrato, caso de uso, persistência, API e interface. As tarefas são compartilhadas entre as contas autorizadas e podem indicar quem está relacionado a elas, mostrando como modelar um recurso coletivo com autoria e permissões próprias. Use-o para entender o fluxo e desenvolver seu próprio domínio.

## Começar

Você precisa de [Bun](https://bun.com) **1.4.2 ou superior** e Git. Para o banco local, instale Docker com Compose e deixe o Docker em execução. O [GitHub CLI](https://cli.github.com) é opcional, usado somente para publicar pelo assistente.

```sh
git clone https://github.com/lucasprmartins/zeta.git meu-projeto
cd meu-projeto
bun install --frozen-lockfile
bun run setup
```

O assistente:

1. Pergunta o nome do projeto e se deseja preparar o PostgreSQL local.
2. Atualiza workspaces, scripts, imports, textos da marca, namespace da sidebar e referências de build.
3. Cria os `.env` a partir dos exemplos, com um segredo de autenticação aleatório. Arquivos existentes são preservados integralmente.
4. Atualiza o lockfile, inicia o banco local quando escolhido, aplica migrations e verifica os tipos.
5. Oferece a publicação opcional em um novo repositório GitHub, com revisão e confirmação próprias.

```sh
bun run dev
```

| Acesso | Endereço |
| --- | --- |
| Aplicação | [localhost:3001](http://localhost:3001) |
| API | [localhost:3000](http://localhost:3000) |
| Referência interativa — Scalar | [localhost:3001/openapi](http://localhost:3001/openapi) |

Crie sua primeira conta na tela de cadastro. O setup não cria usuários nem senhas padrão.

### Controle do setup

```sh
# Ver o plano sem alterar arquivos ou serviços
bun run setup --name meu-projeto --database docker --dry-run

# Preparar o ambiente local sem perguntas; não publica no GitHub
bun run setup --name meu-projeto --database docker --yes

# Usar PostgreSQL configurado por você, sem iniciar banco ou executar migrations
bun run setup --name meu-projeto --database skip
```

O nome aceita letras minúsculas, números e hífens, começando com letra, até 50 caracteres. Se uma etapa falhar, corrija a causa e execute novamente com o mesmo nome. O assistente permanece no projeto, preserva o segredo existente e não apaga o histórico de migrations.

A opção `docker` só aceita a `DATABASE_URL` do Compose fornecido: `postgresql://app:app@localhost:5432/app`. Para outro banco, escolha `skip`, configure `apps/server/.env` e aplique `bun run db:migrate` conscientemente. Um `.env` existente com segredo inválido precisa ser corrigido manualmente; o setup não o substitui.

O Compose usa a porta local 5432 e um volume persistente. Para voltar ao desenvolvimento depois de parar o Docker, execute `bun run db` antes de `bun run dev`. Não há inicialização implícita do banco ao executar o frontend.

### Publicar no GitHub

A publicação é opcional e também pode ser executada depois:

```sh
gh auth login
bun run publish:github
```

Configure sua identidade Git para poder fazer commits. O assistente pede `proprietário/repositório`, usa visibilidade privada por padrão e mostra os arquivos candidatos antes de solicitar a confirmação pelo nome completo do destino.

Após confirmar, ele faz o commit das alterações, cria um repositório novo e envia a branch atual usando o remoto **`publish`**. O remoto `origin` e o histórico existente são preservados; o histórico também será enviado.

Arquivos `.env` candidatos ao commit bloqueiam a publicação; revise também outros arquivos e o histórico antes de confirmar. O assistente não faz force push nem sobrescreve repositórios existentes. Se a publicação falhar parcialmente, confira `git status` e `git remote -v` para finalizar manualmente; o setup local continua disponível. `--yes` no setup nunca autoriza publicação automática.

## O que vem pronto

- **API modular:** Elysia, domínio em TypeScript puro e Drizzle sobre PostgreSQL, com migrations versionadas.
- **Contratos tipados:** oRPC conecta cliente e servidor; REST e Scalar usam as mesmas procedures.
- **Autenticação:** Better Auth com sessão em cookies, cadastro, login por email ou nome de usuário e edição de perfil em `/profile` (nome exibido, username e senha, pelo bloco da conta na sidebar).
- **Interface:** React, Vite 8, rotas por arquivo, componentes shadcn/ui, Phosphor Icons e Tailwind CSS 4.
- **Experiência mobile:** navegação em painel lateral, formulários adaptados, áreas de toque e foco acessível.
- **Dados:** TanStack Query, rolagem infinita reutilizável, invalidação e isolamento do cache por identidade.
- **Produção:** API compilada em executável Bun e infraestrutura Railway definida em TypeScript.

As versões exatas estão nos manifests e no `bun.lock`. Use Bun para instalar dependências e executar os comandos.

## Estrutura

```text
apps/
  server/
    src/
      domain/                 # Entidades, contratos e aplicação
      infrastructure/         # Auth, banco e repositórios
        database/migrations/  # SQL e metadados versionados
      interfaces/http/        # Elysia, oRPC e OpenAPI
      bootstrap.ts            # Composição das dependências
      main.ts                 # Processo HTTP
    scripts/migrate.ts
    tests/
  client/
    src/
      app/                    # Router, sessão e layouts
      routes/                 # Rotas por arquivo
      features/               # Telas, formulários e consultas
      components/             # Marca, layout e componentes compartilhados
      lib/                    # Clientes de auth, RPC e Query
      styles.css              # Tokens e Tailwind
    server/                   # Estáticos e proxy Bun de produção
    tests/
scripts/                      # Setup, publicação e testes do assistente
.railway/                      # IaC e guia de deploy
compose.yaml                  # PostgreSQL local
bun.lock                      # Lockfile único
```

O domínio depende apenas de TypeScript. A infraestrutura implementa seus contratos; o HTTP valida entradas, resolve a identidade e chama os casos de uso. `bootstrap.ts` conecta as implementações, sem container de DI ou camadas genéricas.

## Transformar a base no seu projeto

Depois do setup, personalize o produto gradualmente:

1. **Descreva o domínio:** substitua o vocabulário e as regras do exemplo em [CONTEXT.md](CONTEXT.md).
2. **Implemente um módulo:** siga o fluxo de entidades, contratos, aplicação, repositório e procedures em [docs/architecture.md](docs/architecture.md).
3. **Conecte a interface:** crie a feature, a rota por arquivo e a navegação. Reutilize a sessão, o layout e o padrão de rolagem infinita.
4. **Substitua o exemplo:** remova tarefas e dashboard quando suas funcionalidades estiverem prontas, incluindo seus testes e registros no router. Faça migrations incrementais; não apague histórico aplicado.
5. **Defina a identidade:** o setup troca os textos da marca, mas o símbolo em blocos permanece. Personalize `brand.tsx`, `public/favicon.svg`, `index.html`, `styles.css` e o cabeçalho deste README.
6. **Escreva seu README:** descreva seu produto, seus requisitos e sua operação. O assistente preserva este guia para consulta durante a adaptação.
7. **Valide:** execute `bun run check` e os testes de integração antes de publicar.

[AGENTS.md](AGENTS.md) concentra as convenções técnicas para trabalhar no projeto. `CLAUDE.md` é um symlink para o mesmo arquivo. Mantenha regras específicas do seu negócio no `CONTEXT.md`.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `bun run setup` | Preparar e personalizar o projeto localmente |
| `bun run publish:github` | Publicar em novo repositório após revisão interativa |
| `bun run db` | Iniciar PostgreSQL local e aguardar disponibilidade |
| `bun run dev` | Executar API e cliente |
| `bun run dev:server` / `bun run dev:client` | Executar apenas um app |
| `bun run typecheck` | Validar apps, domínio, scripts e IaC |
| `bun run test` | Testes unitários, HTTP, proxy e setup, sem PostgreSQL |
| `bun run test:integration` | Testar banco, migrations e autenticação reais |
| `bun run build` | Gerar executável da API e arquivos do frontend |
| `bun run check` | Tipos, testes sem banco e build |
| `bun run db:generate` / `bun run db:migrate` | Gerar e aplicar migrations |
| `bun run db:studio` | Explorar o banco com Drizzle Studio |
| `bun run db:check` | Validar consistência das migrations |
| `bun run db:push` / `bun run db:pull` | Sincronização direta / introspecção; use deliberadamente |

Para gerar rotas manualmente, execute `bun run --cwd apps/client routes:generate`. Não edite `routeTree.gen.ts`. Para comandos interativos do Drizzle, execute dentro de `apps/server`, onde o terminal é repassado diretamente.

## Ambiente, cookies e API

Os `.env.example` são a referência de configuração. O servidor exige `DATABASE_URL`, `BETTER_AUTH_URL` e `BETTER_AUTH_SECRET`; `TRUSTED_ORIGINS` contém as origens permitidas. Nunca coloque segredos em variáveis públicas do frontend.

O cliente usa caminhos relativos. No desenvolvimento, Vite encaminha `/api`, `/rpc`, `/openapi`, `/health` e `/ready` para a API em 3000; `API_PROXY_TARGET` permite alterar esse destino. Em produção, o runtime do cliente faz o proxy na mesma origem pública. Better Auth valida sessão e origem no servidor; não é necessário guardar tokens no localStorage. A opção “Lembrar-me” salva somente o email ou username após entrar com sucesso; desmarcar apaga essa preferência. Senhas não são armazenadas e a duração da sessão permanece a do Better Auth.

A referência interativa fica em `/openapi` e a especificação em `/openapi/json`. Entre pelo cliente e teste os endpoints no Scalar usando a mesma origem. A configuração atual disponibiliza a documentação também em produção; restrinja-a conforme o público da sua API. Recuperação de senha, envio de email e provedores sociais precisam de configuração própria.

## Validação com PostgreSQL

```sh
TEST_DATABASE_URL=postgresql://app:app@localhost:5432/app bun run test:integration
```

Use uma instância de desenvolvimento/testes com permissão `CREATEDB`. A suíte cria um banco temporário, verifica migrations, autenticação e isolamento, e o remove ao terminar. `bun run check` não executa essa integração.

## Deploy

O [guia do Railway](.railway/README.md) descreve PostgreSQL, API privada e cliente público, com Dockerfiles e IaC TypeScript. Configure `PUBLIC_URL` e `BETTER_AUTH_SECRET` no ambiente de destino, revise o plano e aplique explicitamente. O setup local não altera recursos Railway.

A API é compilada em `apps/server/dist/server`, com runtime e dependências incorporados, bytecode, minificação, nomes preservados e sourcemaps. Execute `bun run --cwd apps/server start` após o build. O binário é específico da plataforma; o Docker o compila para Linux. A imagem mantém Bun para o migrador executado no pré-deploy.

O frontend gera `apps/client/dist`; seu runtime Bun serve estáticos, faz fallback de SPA e encaminha as chamadas à API. O Vite não é o servidor de produção. Desenvolvimento, preview e runtime do cliente usam 3001 por padrão; não os execute simultaneamente nessa porta. A API usa 3000.

### Guia de Uso

Usuários consultam `/help/guides`; administradores editam e publicam em `/admin/guides`. Desenvolvedores podem importar arquivos Markdown com `bun run guides:import`, sem sobrescrever conteúdo existente. Veja o [guia de autoria](docs/guides-authoring.md).
