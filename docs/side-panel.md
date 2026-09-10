# Painéis laterais

`apps/client/src/components/ui/side-panel.tsx` fornece `SidePanel`. Monte-o somente quando aberto e coloque consultas, permissões e regras no filho. `title`, `children` e `onClose` são obrigatórios; `description`, `footer` e `pending` adaptam a composição. As larguras são do componente, não das telas.

## Comportamento

No desktop, o painel abre à direita, com largura inicial de 560 px e limites de 360–960 px, respeitando a viewport. A borda pode ser arrastada, ajustada com ←/→ e Home/End ou restaurada por duplo clique; o cabeçalho alterna ampliação. Abaixo de 640 px, ocupa a tela inteira. A largura dura enquanto montado, sem persistência.

Cabeçalho e rodapé permanecem visíveis e o corpo rola. `useModalDialog` controla foco, viewport visual e bloqueio de rolagem, inclusive com diálogos sobrepostos. Ao fechar, restaura foco ao acionador ou a `main-content` se ele não existir.

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

## Detalhes de tarefas

`TaskPanel` consulta `rpc.tasks.get` (`GET /api/tasks/{id}`) com chave `['tasks', userId, 'detail', id]` — o `userId` vem de `useUserId` — e encaminha `signal`. Exige `tasks:read`, independentemente de edição, filtro ou página carregada. Mostra descrição, status, responsáveis, autor, datas, identificador e Copiar link.

Carregamento, falha recuperável, acesso negado e tarefa inexistente têm estados próprios. Exclusão/revogação ocultam dados anteriormente em cache; mutations invalidam também detalhes e resumos pelo prefixo de tarefas. Criação/edição continuam no formulário existente.
