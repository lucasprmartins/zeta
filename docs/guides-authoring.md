# Guia de Uso

O conteúdo é mantido no PostgreSQL (`public.guides`). Usuários autenticados leem em `/help/guides`; administradores criam e editam em `/admin/guides`. A administração usa a mesma autorização de gestão do console, validada também na API.

## Edição e publicação

Cada guia tem identificador único e permanente (slug), título, seção, ordem e conteúdo. O editor visual oferece Texto, H1, H2 e H3, criação de blocos, desfazer/refazer e prévia. Seção e ordem organizam a leitura; o identificador compõe a URL.

Salvar um rascunho não altera o conteúdo publicado. **Publicar** substitui a versão visível; **Retirar de publicação** oculta o guia e preserva o rascunho. Edições concorrentes são recusadas por versão para evitar sobrescritas silenciosas.

Em **Quem pode ler**, escolha todos os usuários autenticados ou uma ação do catálogo de permissões. O servidor filtra antes de paginar e verifica novamente na leitura individual. Conteúdo restrito e rascunhos não são enviados a leitores sem acesso. A restrição do rascunho só entra em vigor ao publicar.

## Conteúdo em arquivos

O desenvolvedor pode adicionar arquivos `.md` a `docs/guides/`, inclusive em subpastas:

```markdown
---
slug: primeiros-passos
title: "Primeiros passos"
section: Começando
order: 1
permission: tasks:read
---
# Comece aqui

Texto do guia.

## Próximo passo

Outro parágrafo.
```

`slug`, `title` e `section` são obrigatórios. `order` é opcional (padrão zero); omita `permission` para permitir qualquer usuário autenticado. Use IDs existentes no catálogo, não nomes de papéis. Metadados aceitam valores simples ou strings JSON entre aspas duplas; não são YAML completo.

Depois de aplicar as migrations, execute na raiz:

```sh
bun run guides:import
```

Uma pasta alternativa pode ser passada como argumento; use caminho absoluto para evitar dúvidas sobre o diretório do workspace. O comando usa `DATABASE_URL` do servidor, valida todos os arquivos antes de gravar e cria somente **rascunhos ausentes**. Slugs existentes são preservados integralmente, mesmo que o arquivo tenha mudado. Revise e publique pelo painel. A importação não roda automaticamente no setup nem no deploy.

O formato inicial suporta apenas parágrafos e títulos H1/H2/H3, até 50 mil caracteres e 1000 blocos. Linhas consecutivas de texto formam um parágrafo; linhas vazias separam blocos. Imagens, listas, citações e blocos de código são rejeitados. Formatação inline, links e HTML não são interpretados. Não há upload nem armazenamento de imagens nesta etapa.

## Implementação

`domain/guides` contém entidades, contrato e casos de uso; o repositório Drizzle aplica filtros, ordenação e controle de versão. `interfaces/http/rpc/guides.ts` expõe as mesmas operações por RPC e REST. `packages/guide-content` centraliza a conversão do subconjunto Markdown usado pelo importador, transporte, editor Tiptap e leitor React, sem HTML executável. Ao ampliar os blocos, atualize conversão, editor, leitor e testes em conjunto.
