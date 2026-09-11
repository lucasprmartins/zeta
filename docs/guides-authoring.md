# Guia de Uso

## Ajuda com IA

`/help` responde dúvidas com AI SDK e `gpt-5.6-luna`. O servidor monta o contexto a cada pergunta com o Markdown das versões publicadas que a identidade atual pode ler. Rascunhos e publicações restritas não entram no contexto. O assistente recebe instruções para responder somente a partir dessas fontes e indicar quando a orientação não existe; não recebe ferramentas, acesso à web ou operações da aplicação.

As perguntas e respostas ficam apenas na tela e são descartadas ao sair da página, mudar de identidade/permissões ou limpar perguntas. Cada envio contém somente a pergunta atual, sem histórico ou memória, e usa `store: false` na Responses API. As mensagens usam os componentes locais `Message` e `Bubble`, adaptados de shadcn/ui: usuário à direita com seu avatar e assistente à esquerda com o ícone da ajuda. As respostas da IA renderizam Markdown com `react-markdown`, incluindo negrito, itálico, listas e links; HTML e imagens são descartados, e URLs usam o filtro seguro padrão. As mensagens do usuário permanecem como texto literal. Antes da primeira pergunta, a tela mostra o ícone da ajuda e o título “Como podemos ajudar?” acima do campo e um botão destacado para o Guia de Uso abaixo. Ao iniciar a conversa, o campo desliza para a parte inferior, as mensagens ganham rolagem própria e o link passa ao topo; o título inicial fica oculto. Limpar as perguntas restaura a apresentação inicial. As transições respeitam movimento reduzido. O armazenamento e a retenção operacional do provedor seguem as políticas da conta OpenAI.

`POST /api/help/chat` exige sessão, valida origem e aceita apenas `{ question: string }`. Limita perguntas a 2000 caracteres, contexto a 250 mil caracteres, saída a 1600 tokens e geração a 60 segundos. O limite de cinco envios por minuto e usuário fica em memória por processo; instalações com múltiplas réplicas precisam considerar esse limite por réplica. Sem chave, `/help` exibe a tela tradicional de Ajuda, com o card de acesso aos guias, sem o chat. Sem guias permitidos ou com contexto acima do limite, o chat orienta a consulta ao guia. Falhas permitem nova tentativa e respostas em andamento podem ser interrompidas.

Em `/admin/console`, a seção **Ajuda com IA** permite salvar, substituir ou remover a OpenAI API Key. Uma chave salva aparece como máscara de senha, acompanhada do badge **Ativada**; sem chave, o campo fica vazio com placeholder e o badge mostra **Desativada**. **Substituir chave** abre a edição, com opção de cancelar e preservar a chave anterior. O badge indica a presença da configuração, não uma validação de credenciais pela OpenAI. A gravação exige `access:manage`, revalidado dentro da transação com o lock do controle de acesso. `console.help` guarda somente a chave criptografada com AES-GCM; a chave de criptografia é derivada de `BETTER_AUTH_SECRET` por HKDF com finalidade própria. Alterar esse segredo exige cadastrar novamente a API Key. A leitura do estado retorna apenas `configured`, nunca a chave; mensagens não são persistidas no banco.

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
