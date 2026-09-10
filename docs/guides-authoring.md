# Guia de Uso

## Edição e leitura

`/help/guides` lista publicações permitidas ao usuário autenticado. Quem tem `access:manage` também vê rascunhos, cria em `/help/guides/new` e edita em `/help/guides/edit/{slug}`. A API valida a mesma autorização em `/api/admin/guides`. Evite o slug `new`: ele conflita com a rota de criação na leitura.

Cada guia tem slug permanente, título, seção, ordem e conteúdo. Salvar rascunho preserva a publicação; publicar substitui a versão visível; retirar de publicação oculta o guia sem apagar o rascunho. Edições concorrentes são recusadas por versão.

Em **Quem pode ler**, nenhuma permissão selecionada libera qualquer usuário autenticado; havendo seleção, basta possuir uma das ações. Use ações do catálogo, não papéis. A restrição do rascunho só entra em vigor ao publicar. O servidor filtra antes de paginar e revalida a leitura individual, sem enviar conteúdo restrito a leitores sem acesso.

O editor oferece parágrafos, H1/H2/H3, desfazer/refazer e prévia. Na leitura, títulos recebem âncoras únicas; `GuideOutline` usa essas âncoras em índice lateral no desktop e recolhido no mobile, exibido a partir de dois títulos.

## Importação de Markdown

Arquivos em `docs/guides/`, inclusive subpastas, usam este formato:

```markdown
---
slug: primeiros-passos
title: "Primeiros passos"
section: Começando
order: 1
permissions: tasks:read, tasks:create
---
# Comece aqui

Texto do guia.
```

`slug`, `title` e `section` são obrigatórios; `order` assume zero. `permissions` é opcional e aceita IDs do catálogo separados por vírgula. Metadados aceitam valores simples ou strings JSON entre aspas duplas, não YAML completo.

Após migrations, execute na raiz:

```sh
bun run guides:import
```

Para outra pasta, passe seu caminho absoluto como argumento. O comando usa `DATABASE_URL` do servidor, valida todos os arquivos antes de gravar e cria apenas **rascunhos ausentes**. Slugs existentes são preservados, mesmo que o arquivo tenha mudado. Revise e publique no painel; a importação não roda no setup nem no deploy.

O conteúdo aceita até 50 mil caracteres e 1000 blocos de parágrafos ou H1/H2/H3. Linhas consecutivas formam um parágrafo; linhas vazias separam blocos. Imagens, listas, citações e blocos de código são rejeitados; formatação inline, links e HTML não são interpretados. Não há upload de imagens.

## Implementação

`domain/guides` contém entidade, contrato e casos de uso; `public.guides` guarda rascunho e publicação. O repositório aplica filtros, ordenação e controle de versão; `interfaces/http/rpc/guides.ts` compartilha operações REST/RPC. `packages/guide-content` centraliza o formato entre importador, transporte, editor Tiptap e leitor React. Ao ampliar os blocos, atualize conversão, editor, leitor e testes juntos.
