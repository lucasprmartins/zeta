# Painéis laterais

`apps/client/src/components/ui/side-panel.tsx` fornece `SidePanel`, o contrato exportado `SidePanelProps` e `SidePanelActions`. Monte o painel somente quando aberto e coloque consultas, permissões e regras no filho. `label`, `children` e `onClose` são obrigatórios; `footer` e `pending` adaptam a composição. `label` é apenas o nome acessível do diálogo, sem renderização visual. Título, descrição e sua composição pertencem ao conteúdo da funcionalidade. As larguras são do componente, não das telas.

## Comportamento

No desktop, o painel abre à direita, com largura inicial de 560 px e limites de 360–960 px, limitado pela largura disponível na rota. A borda pode ser arrastada, ajustada com ←/→ e Home/End ou restaurada por duplo clique. O cabeçalho oferece duas ações: ampliar a largura até 960 px e expandir para toda a área da página. “Voltar ao painel” restaura a largura anterior à expansão. Nesse modo, o ajuste pela borda fica oculto; conteúdo e rolagem permanecem montados. Abaixo de 640 px, já ocupa toda a largura disponível. Largura e expansão duram enquanto montado, sem persistência nem alteração da URL.

O `AppShell` identifica o layout com `data-panel-layout`, o cabeçalho com `data-panel-header` e a área da rota com `data-panel-route`. A superfície acompanha esses limites, preservando header e sidebar visíveis em todos os modos, sem depender da ordem entre elementos irmãos. As medidas acompanham redimensionamento, rolagem e viewport visual. O backdrop é transparente; o comportamento continua modal, com foco preso ao painel e Escape/clique externo para fechar. Fora desse layout, usa a viewport como fallback. Outro shell pode fornecer os mesmos marcadores, mantendo o painel dentro da área da rota.

Quando a rota tem pelo menos 840 px disponíveis, o painel lateral reserva espaço à direita do conteúdo, que se reorganiza ao lado dele. A largura efetiva do painel preserva pelo menos 480 px para o conteúdo da rota e acompanha os ajustes por botão, teclado e arraste. Em áreas mais estreitas, mantém sobreposição. A expansão para toda a página remove essa reserva; retornar restaura a disposição lado a lado. Fechar ou desmontar o painel devolve o espaço à rota.

Controles e rodapé permanecem visíveis e o corpo rola, incluindo o título e a descrição fornecidos pela funcionalidade. Ampliar e expandir ficam à esquerda e Fechar à direita, na mesma superfície do conteúdo, sem borda de separação. No modo expandido, o retorno usa apenas o ícone de seta, com nome acessível e `title` “Voltar ao painel”. `useModalDialog` controla foco, viewport visual e bloqueio de rolagem, inclusive com diálogos sobrepostos. Um `h2` com `tabIndex={-1}` no conteúdo pode receber foco inicial; no desktop, `data-modal-autofocus` permite indicar outro elemento. Ao fechar, restaura foco ao acionador ou a `main-content` se ele não existir.

Os controles têm 44 px de altura e alinhamento comum. Sua faixa reserva espaço próprio para não sobrepor o conteúdo personalizado. Use `SidePanelActions` no `footer` para agrupar botões e links: abaixo de 480 px de largura do painel, ocupam linhas completas; a partir desse limite, ficam lado a lado e quebram linha quando necessário. Permissões, rótulos, callbacks e variantes dos botões pertencem à funcionalidade.

`pending` bloqueia Fechar, Escape e backdrop — o teste de clique fora da caixa é o `dismissOnBackdrop` compartilhado com `Modal` e a gaveta; em formulários, desabilite também os controles. Bloqueio de navegação e confirmação de alterações não salvas pertencem à rota consumidora.

## Integração com a URL

Valide um identificador estável em `validateSearch`; carregue o recurso individualmente, sem depender da lista/cache. Se houver várias superfícies na rota, valide também um discriminador e monte somente a selecionada.

Em `/tasks?status=pending&task=<uuid>`, a rota usa:

```tsx
const search = Route.useSearch();
const navigate = Route.useNavigate();

const selectTask = useCallback(
  (task: string | undefined) => {
    void navigate({
      search: (previous) => ({ ...previous, task }),
      resetScroll: false,
    });
  },
  [navigate]
);
```

Abrir passa o ID; fechar passa `undefined`. Preserve os demais parâmetros. A navegação cria entradas no histórico para Voltar/Avançar restaurarem seleção e abertura. O login preserva o destino interno com seus parâmetros.

## Integrar uma funcionalidade

1. Valide o identificador na busca da rota e preserve os demais parâmetros ao abrir e fechar. Monte uma única superfície de detalhes, com `key` pelo identificador para reiniciar a largura e o estado quando mudar de recurso.
2. Monte o painel dentro de `PageContent` no `AppShell`; os marcadores de layout e a reserva de espaço já são fornecidos. Não replique medidas de sidebar/header na funcionalidade.
3. Consulte o recurso por ID com chave de cache por identidade e cancelamento. Trate carregamento, erro recuperável, ausência e acesso negado; não mostre dados antigos após exclusão ou revogação.
4. Forneça um `label` acessível e componha livremente título, descrição e detalhes dentro de `children`. Use `SidePanelActions` no rodapé, com controles autorizados pela funcionalidade. Ações destrutivas exigem confirmação; o servidor revalida as permissões.
5. Use `pending` para impedir fechamento durante uma operação que não pode ser interrompida. Confirmação de alterações não salvas pertence à funcionalidade. Após mutations, invalide os dados relacionados; após exclusão, feche a seleção na URL.
6. Adapte o conteúdo da rota por largura de contêiner, conforme a arquitetura. Verifique painel estreito, ampliado, página inteira, retorno, teclado, sobreposição de formulários e redimensionamento.

Consultas, CRUD, permissões, nomes de parâmetros e estrutura dos detalhes não são inferidos pelo painel. Isso permite integrar módulos com ações e ciclos de vida distintos sem herdar o modelo de tarefas.

## Detalhes de tarefas

`TaskPanel` consulta `rpc.tasks.get` (`GET /api/tasks/{id}`) com chave `['tasks', userId, 'detail', id]` — o `userId` vem de `useUserId` — e encaminha `signal`. Exige `tasks:read`, independentemente de edição, filtro ou página carregada. Mostra descrição, status, responsáveis, autor, datas, identificador e Copiar link.

Carregamento, falha recuperável, acesso negado e tarefa inexistente têm estados próprios. Exclusão/revogação ocultam dados anteriormente em cache; mutations invalidam também detalhes e resumos pelo prefixo de tarefas. O rodapé oferece “Editar tarefa” quando há dados disponíveis e permissão `tasks:update`, abrindo o formulário existente sobre o painel. Ao fechar o formulário, o painel permanece na mesma posição e modo de exibição. Essa ação pertence à funcionalidade de tarefas; o `SidePanel` compartilhado recebe apenas o conteúdo do rodapé.

Editar e excluir tarefas ficam exclusivamente no rodapé de `TaskPanel`, conforme `tasks:update` e `tasks:delete`. A lista mantém abertura do detalhe e alternância de status. Excluir abre a confirmação existente; cancelar preserva o painel, e a exclusão concluída fecha o detalhe e atualiza a lista.

## Painel adjacente ao menu

`SidebarPanel` é a superfície de largura fixa para a [caixa de entrada](notifications.md), posicionada à esquerda junto ao sidebar. Compartilha `useModalDialog` e `dismissOnBackdrop` com `SidePanel`; não substitui o painel ajustável de detalhes à direita. Quando a caixa está aberta, a rota de tarefas suspende seu painel de detalhe para manter apenas uma dessas superfícies ativa.
