# Busca e filtros

`components/list-filters.tsx` concentra a interação compartilhada para listagens. Não importa funcionalidades, RPC, cache ou roteador. A feature controla valores, opções e callbacks; pode usar a mesma barra com tabela ou outra visualização.

## Composição

- `ListFilterBar` reúne o resumo da listagem à esquerda e controles à direita, com quebra conforme o espaço disponível. Em tarefas, total, filtros, busca e atualização pertencem à mesma barra.
- `ListSearch` começa recolhido em um ícone; abrir foca o campo e uma busca ativa permanece visível. Recebe `value`, `onChange`, `label` e limite opcional. Mantém o rascunho local, envia após 300 ms ou imediatamente com Enter, limpa e recolhe pelo botão de fechar, e cancela o timer ao desmontar ou receber outro valor externo. Escape recolhe o campo vazio.
- `ListFilterPanel` apresenta um único botão “Filtrar” com a quantidade de propriedades ativas. Recebe condições com ID, propriedade, operador textual, controle de valor e remoção, além das propriedades disponíveis para adicionar. O primeiro filtro pode ser escolhido diretamente; com condições existentes, “Adicionar filtro” oferece apenas propriedades ainda não adicionadas. As linhas dispensam marcadores “Onde”/“E”; o cabeçalho explica que todas as condições devem ser atendidas. A feature define a semântica real no backend. Condições ainda sem valor são rascunhos locais e não contam como filtro aplicado. Em painéis estreitos, o valor ocupa a linha seguinte. “Limpar” remove as condições, preservando a busca textual independente. O rodapé informa a aplicação automática, sem botão para salvar.
- `ListFacet` combina Popover e Command adaptados do shadcn/ui. Recebe opções com valor estável, rótulo e bloqueio opcional, seleção controlada e callback. Oferece pesquisa local por rótulo; fornecer `onSearchChange` desativa a filtragem local para opções vindas do servidor. A feature informa carregamento, erro, nova tentativa e limite opcional. O menu preserva seleções ao pesquisar, permite teclado e restaura o foco ao fechar. Dentro de um diálogo nativo, o portal usa esse diálogo.
- `ListFacet` é usado como controle de valor dentro de uma condição, com resumo da seleção no acionador. Seu portal permanece dentro do painel de filtros; Escape fecha primeiro o seletor e restaura o foco, sem fechar o painel externo. Não há chips de filtros espalhados pela barra.
- `ListFacet` suporta `mode="single"` para escolhas únicas que fecham o seletor imediatamente. Catálogos pequenos e estáticos podem usar `searchable={false}`. Seleção múltipla preserva o menu aberto, oferece “Limpar seleção” e “Concluído”; este último apenas fecha o seletor, pois os valores já foram aplicados. Tarefas usam status único com “Qualquer status”, sem pesquisa de opções, e responsáveis múltiplos com pesquisa remota. O resumo mostra até dois nomes e a quantidade adicional.

## Integração por funcionalidade

1. Defina critérios tipados e normalize a URL: limites de texto, valores aceitos, IDs sem repetição e ordenados. Preserve parâmetros que não pertencem aos filtros, como o recurso aberto em painel.
2. Coloque identidade e todos os critérios na chave do cache; encaminhe `signal` ao RPC. Não aplique filtros do TanStack Table sobre páginas incompletas.
3. Ao mudar critérios, consulte a primeira página do conjunto correspondente. Mantenha os estados distintos de carregamento inicial, atualização e continuação; não apresente registros de outro filtro como resultados atuais.
4. Busque opções pequenas e estáveis localmente; catálogos grandes exigem endpoint autorizado, busca adiada e quantidade limitada. Inclua os IDs selecionados para recuperar seus rótulos ao restaurar uma URL.
5. Defina no backend a semântica de combinação, aplique os mesmos critérios aos itens e totais e preserve a autorização. A UI não determina o escopo de acesso.

## Tarefas

`task-filters.ts` normaliza os critérios; `TasksToolbar` define sua apresentação. A URL usa `q`, `status`, `assignees` e `unassigned`. Alterações de texto substituem a entrada atual do histórico; mudanças nos demais filtros criam entradas. Abrir/fechar o painel preserva os critérios. Limpar condições preserva a busca textual e o detalhe aberto; o estado vazio da listagem também oferece restaurar a lista sem critérios.

`GET /api/tasks` e `tasks.list` aceitam `search` (título, até 120 caracteres), status opcional, até 20 IDs em `assignees` e `unassigned`. Busca e status se combinam por **E**. Dentro do filtro de responsáveis, basta corresponder a uma pessoa selecionada **OU** não ter responsável quando essa opção estiver marcada. “Qualquer status” omite a restrição de status. Pessoas sem tarefas correspondentes resultam em lista vazia, não em remoção silenciosa do critério.

A busca é por trecho, sem distinguir maiúsculas, mas sensível a acentos. `%`, `_` e `\` são tratados literalmente. Os critérios são validados no transporte e no domínio. Consultas usam parâmetros SQL, `EXISTS`/`NOT EXISTS` para responsáveis (sem duplicar tarefas) e a mesma fotografia transacional para total e página.

`GET /api/tasks/assignees` e `tasks.assignees` exigem `tasks:read`. Retornam apenas contas presentes como responsáveis em alguma tarefa, com ID, nome, username e imagem. Aceitam busca por nome/username e até 20 IDs selecionados. Retornam até 20 correspondências mais os selecionados ainda existentes nesse catálogo, sem duplicação; refine a busca para encontrar outras pessoas. O cliente carrega ao abrir o filtro ou ao recuperar seleções da URL, com cache de 30 segundos por identidade/termo/IDs. O endpoint de atribuição `/tasks/mentions` continua exigindo `tasks:mention` e não é reutilizado por filtros.

## Desempenho e banco

A migration `0015_stiff_thunderbird.sql` habilita `pg_trgm` e adiciona índice GIN ao título para apoiar `ILIKE`. O banco precisa disponibilizar a extensão; o usuário de migration precisa poder instalá-la. Os índices existentes de status/criação e das relações de responsáveis permanecem.

O índice não garante tempo constante: termos muito curtos ou pouco seletivos ainda podem exigir varreduras, assim como totais exatos e páginas profundas por offset. A paginação existente foi preservada. Evoluções para cursor ou outra estratégia de busca devem ser orientadas por volume e planos de execução medidos, sem prometer escalabilidade ilimitada nem trocar o contrato silenciosamente.
