# Guia de trabalho

## Leitura por assunto

- [README.md](README.md): apresentação, setup e comandos.
- [CONTEXT.md](CONTEXT.md): vocabulário do produto.
- [docs/architecture.md](docs/architecture.md): camadas, banco, autenticação e padrões do cliente.
- [docs/authorization.md](docs/authorization.md): regras de acesso, cadastro e administração.
- [docs/guides-authoring.md](docs/guides-authoring.md): edição e importação de guias.
- [docs/side-panel.md](docs/side-panel.md): integração de painéis com a URL.
- [.railway/README.md](.railway/README.md): infraestrutura e deploy.

Leia o documento relacionado antes de alterar a área. Confira código, manifests e configurações para confirmar o comportamento; atualize a fonte correspondente, sem repetir a informação em outros documentos. Descreva o produto atual, sem tratá-lo como template, exemplo descartável ou instrução para outro projeto.

## Acordos

- **Antes de editar `AGENTS.md`, apresente a mudança proposta e peça permissão explícita ao usuário.** Um pedido genérico de implementação ou atualização de documentação não autoriza sua edição. Se o usuário já autorizou expressamente a alteração proposta, não repita a pergunta. Mantenha aqui apenas convenções transversais e duradouras; detalhes de funcionalidades pertencem aos documentos acima. Preserve `CLAUDE.md` como symlink relativo para este arquivo.
- Preserve alterações existentes, arquivos locais e segredos. Não sobrescreva `.env` nem exponha credenciais.
- Use Bun para runtime, scripts e dependências, com um único `bun.lock`. Instale versões exatas no workspace consumidor, sem atualizações incidentais. Peça confirmação antes de adicionar dependências de produção; build, tipos e ferramentas locais de banco ficam em `devDependencies`.
- Use TypeScript estrito, ESM e `import type`. Não enfraqueça tipos para contornar erros. Prefira funções, interfaces e composição explícita; abstrações genéricas exigem necessidade concreta.
- Para documentação atual, use a skill `find-docs` e o CLI global `ctx7 library`, depois `ctx7 docs`. Não use Context7 MCP nem `npx ctx7`; se indisponível, informe e consulte fontes oficiais.
- Preserve a ordem dos `package.json`: identidade, formato, workspaces, ambiente, scripts e dependências. Agrupe scripts por fluxo com linhas em branco e ordene dependências alfabeticamente; `useSortedPackageJson` está desligado.

## Implementação

- O domínio não importa runtime, frameworks, banco ou transporte. Entidades preservam invariantes; casos de uso recebem contratos, relógio e IDs. Infraestrutura implementa os contratos; HTTP valida, autoriza e traduz erros; `bootstrap.ts` conecta as implementações.
- Use `@server/` entre camadas do servidor, imports relativos no domínio e `@/` no cliente. A entrada `/rpc` do workspace do servidor é exclusiva para imports de tipos. Preserve a separação dos tsconfigs de domínio, navegador, runtime Bun e testes.
- Modele o escopo de cada funcionalidade conforme o produto; não herde proprietário, CRUD ou estados de outro módulo. Autorize toda operação, inclusive listagens, com identidade confiável. Use permissões, nunca nomes de papéis, nas funcionalidades; controles visuais não substituem autorização na API.
- Use os componentes locais antes de criar UI. Se faltar comportamento, consulte shadcn/ui via `find-docs` e adapte apenas o necessário aos tokens, APIs locais e Phosphor. Telas ficam em `features`; primitivas e layouts não conhecem regras de negócio nem consultas.
- Preserve acessibilidade, isolamento e cancelamento do cache por identidade, parâmetros compartilháveis na URL e estados de erro recuperáveis descritos na arquitetura.
- Gere migrations incrementais com `db:generate`, revise o SQL e aplique com `db:migrate`. Preserve migrations, snapshots e histórico aplicado. `db:push` exige solicitação explícita; `db:pull` também grava arquivos e não é uma verificação sem efeitos colaterais.
- Não edite nem versione `routeTree.gen.ts` ou `.tanstack/`; a geração antecede typecheck/build. Preserve o plugin TanStack antes do React no Vite.
- Ao mudar a identidade do produto, revise workspaces/imports, marca, favicon, metadados, tokens, namespaces do setup, ambiente e infraestrutura. Não remova módulos ou migrations fora do pedido.

## Qualidade e operações

- Ultracite/Biome usa somente `biome.jsonc` na raiz. Justifique ajustes de regras em comentário; exceções pontuais usam `biome-ignore`, sem excluir o arquivo inteiro. Não introduza outro linter ou formatador.
- Execute verificações proporcionais à mudança e relate resultados e bloqueios. `bun run check` reúne lint, tipos, testes sem banco e build; `bun run test:integration` é separado, exige banco de desenvolvimento/testes com `CREATEDB` e nunca usa produção. Mudanças no banco exigem revisão das migrations e integração; regras, transporte e autenticação exigem testes correspondentes. Use `bun run test`, pois `bun test` pode descobrir integração.
- Teste setup em diretórios temporários. Preserve arquivos e histórico, `--dry-run` sem escrita e `--database skip` sem acesso ao banco. O modo Docker só migra a URL local validada do Compose, sobrepondo o ambiente herdado.
- Publicação no GitHub exige revisão interativa de destino, visibilidade e arquivos. Preserve `origin`, use `publish`, bloqueie `.env` candidatos e não permita publicação por `--yes`, force push ou sobrescrita de repositórios. Após falha parcial, confira estado local e remoto.
- No Railway, use somente o CLI global; nunca instale/configure MCP nem execute `railway setup agent`. Avisos de MCP ausente são intencionais; atualize a skill global com `skills update -g use-railway`. Leia o guia operacional antes de qualquer operação e siga suas exigências de aprovação do plano e verificação do deploy.
