<div align="center">

<img src="docs/assets/logo.svg" alt="Zeta" width="88" />

# Zeta

Tarefas compartilhadas, controle de acesso e guias de uso.

Bun · TypeScript · PostgreSQL · React

</div>

O Zeta organiza tarefas da equipe com responsáveis, filtros e indicadores de acompanhamento. A administração gerencia contas, papéis, permissões e aprovação de cadastros; o Guia de Uso publica orientações conforme o acesso de cada pessoa.

## Desenvolvimento local

Requer Bun na versão indicada em [package.json](package.json), Git e Docker com Compose em execução para o PostgreSQL local.

```sh
bun install --frozen-lockfile
bun run setup
bun run dev
```

O setup permite definir o nome do projeto, atualiza as referências de identidade e cria os `.env` ausentes com segredo aleatório. Preserva arquivos existentes, prepara o banco quando escolhido, aplica migrations, atualiza o lockfile e verifica tipos. Não cria contas: cadastre-se pela aplicação e siga [Primeiro administrador](docs/authorization.md#primeiro-administrador) para habilitar a administração.

| Serviço | Endereço local |
| --- | --- |
| Aplicação | [localhost:3001](http://localhost:3001) |
| API | [localhost:3000](http://localhost:3000) |
| Referência interativa (Scalar) | [localhost:3001/openapi](http://localhost:3001/openapi) |

```sh
# Examinar o plano sem alterar arquivos ou serviços
bun run setup --name meu-projeto --database docker --dry-run
# Preparar sem perguntas; não autoriza publicação
bun run setup --name meu-projeto --database docker --yes
# Preservar o banco externo; não inicia banco nem aplica migrations
bun run setup --name meu-projeto --database skip
```

O nome aceita até 50 caracteres: letras minúsculas, números e hífens, começando com letra. Após falha, corrija a causa e repita com o mesmo nome. Segredos inválidos em `.env` existentes precisam de correção manual.

O modo `docker` aceita somente `postgresql://app:app@localhost:5432/app`, do [Compose](compose.yaml), e mantém os dados em volume persistente. Para outro banco, use `skip`, configure `apps/server/.env` e execute `bun run db:migrate`. Ao retomar o trabalho com o Docker parado, execute `bun run db` antes de `bun run dev`.

## Comandos

Execute na raiz. Os manifests dos workspaces detalham os scripts.

| Comando | Finalidade |
| --- | --- |
| `bun run dev` | API e cliente; `dev:server` / `dev:client` executam um app |
| `bun run db` | Iniciar PostgreSQL local |
| `bun run lint` / `bun run format` | Verificar / corrigir lint e formatação |
| `bun run typecheck` | Validar apps, domínio, scripts e IaC |
| `bun run test` | Testes sem PostgreSQL |
| `bun run test:integration` | Integração com PostgreSQL |
| `bun run build` | Compilar API e cliente |
| `bun run check` | Lint, tipos, testes sem banco e build |
| `bun run db:generate` / `bun run db:migrate` | Gerar / aplicar migrations |
| `bun run db:check` / `bun run db:studio` | Verificar migrations / explorar banco |
| `bun run db:push` / `bun run db:pull` | Alteração direta do banco / introspecção; não são verificações sem escrita |
| `bun run guides:import` | Importar rascunhos de [guias](docs/guides-authoring.md) |

Comandos interativos Drizzle devem rodar em `apps/server` para preservar o TTY. A integração cria e remove um banco temporário e requer uma instância de desenvolvimento/testes com `CREATEDB`:

```sh
TEST_DATABASE_URL=postgresql://app:app@localhost:5432/app bun run test:integration
```

## Configuração

Os [exemplos do servidor](apps/server/.env.example) e [do cliente](apps/client/.env.example) definem as variáveis. Nunca exponha segredos no frontend. Vite encaminha as chamadas à API em desenvolvimento; em produção, o runtime Bun do cliente mantém o proxy na mesma origem pública.

A especificação fica em `/openapi/json`. Para testar no Scalar, entre pelo cliente na mesma origem. A documentação também fica disponível em produção; restrinja-a conforme o público da API. Recuperação de senha, verificação de email e provedores sociais exigem configuração própria.

## Publicação

Para criar um novo repositório GitHub, instale e autentique o CLI `gh`, configure sua identidade Git e execute:

```sh
gh auth login
bun run publish:github
```

O assistente usa visibilidade privada por padrão, apresenta os arquivos e exige confirmar `proprietário/repositório`. Após aprovação, faz commit e envia a branch e seu histórico pelo remoto `publish`, preservando `origin`. Não sobrescreve repositórios nem faz force push; `.env` candidatos bloqueiam a publicação. Revise também o histórico. Se houver falha parcial, confira `git status` e `git remote -v` antes de continuar.

O [guia Railway](.railway/README.md) descreve o deploy. Setup local e publicação no GitHub não aplicam a infraestrutura.

## Documentação

- [AGENTS.md](AGENTS.md): acordos de desenvolvimento.
- [CONTEXT.md](CONTEXT.md): vocabulário do produto.
- [Arquitetura](docs/architecture.md): organização e contratos técnicos.
- [Controle de acesso](docs/authorization.md): permissões, cadastro e administração.
- [Guia de Uso](docs/guides-authoring.md): autoria e importação de conteúdo.
- [Painéis laterais](docs/side-panel.md): integração com rotas.
