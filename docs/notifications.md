# Notificações

A caixa de entrada é pessoal e reúne notificações persistidas com referências para os recursos do sistema. Qualquer conta autenticada pode consultar a própria caixa; o conteúdo e o contador respeitam também as permissões atuais de leitura do recurso. Indicar uma conta como responsável não concede acesso à tarefa.

## Fluxo e garantias

```text
Criar tarefa → tarefa + task.created
                    ↓ mesma transação PostgreSQL
              assinantes locais
                    ↓
         política de notificações → caixa de entrada
```

`domain/events.ts` define a união de eventos tipados e a publicação para assinantes registrados explicitamente no `bootstrap.ts`. Não há estado global, filas em memória, broker ou publicação sem aguardar o resultado. O domínio não importa o banco: o adapter recebe a transação e entrega a mesma instância aos assinantes.

`createTask` publica `task.created` com ID estável, instante, ator, tarefa, título e responsáveis normalizados. `TaskRepository.save` garante a gravação atômica da tarefa, responsáveis e efeitos dos eventos. O assinante transforma o fato em notificações por `notificationsFor` e grava usando a transação do produtor. Se qualquer assinante falhar, toda a criação é desfeita; o chamador recebe erro. Assinantes locais só podem fazer operações nesse banco, nunca enviar emails ou chamar serviços externos.

`public.notifications` armazena uma entrega por evento, tipo e destinatário. Uma constraint única e `onConflictDoNothing` tornam a entrega idempotente, inclusive em concorrência. Isso não torna o comando HTTP de criar tarefas idempotente: uma nova criação ainda produz uma nova tarefa e outro evento.

A política inicial notifica todos os responsáveis de uma tarefa recém-criada, inclusive o próprio autor quando ele se indica. A entidade remove responsáveis duplicados e valida contas existentes antes de persistir. Editar, concluir, reabrir e excluir tarefas não geram eventos de notificação nesta versão.

## Referências e acesso

A notificação guarda o tipo e ID do recurso, título no momento do evento, ator e permissão de leitura. Não guarda URLs arbitrárias nem descrições completas. O cliente resolve uma referência `task` para `/tasks?status=all&task=<id>`; a API de tarefas revalida acesso ao abrir o detalhe.

Todas as consultas e alterações usam o destinatário da sessão validada no servidor, nunca um ID enviado pelo cliente. A listagem, o contador e a marcação como lida filtram as permissões atuais antes de acessar a notificação. Uma revogação oculta também o título e o contador; devolver a permissão torna o histórico visível novamente. Para recursos com autorização por registro, a extensão deve conferir esse escopo nas consultas da caixa, além da permissão global.

Remover uma tarefa preserva sua notificação histórica, cujo link passa a mostrar o estado de tarefa inexistente. Remover o ator preserva a entrega sem seu nome; remover o destinatário apaga sua caixa por chave estrangeira em cascata. Marcar como lida é idempotente e preserva o primeiro instante de leitura.

## Interface e transporte

- O acionador e contador ficam no sidebar; o painel abre adjacente ao menu no desktop e em tela inteira no mobile. `SidebarPanel` controla apenas apresentação e o comportamento de diálogo, reutilizando foco, Escape, backdrop, áreas seguras e viewport dos componentes locais.
- `inbox=unread` e `inbox=all` são parâmetros do layout autenticado. Voltar/Avançar restaura o painel e o filtro; fechar preserva os demais parâmetros. Abrir uma referência fecha a caixa e abre o detalhe da tarefa.
- `features/notifications` concentra consultas e conteúdo; o shell recebe slots e não conhece regras de notificação.
- As listas usam páginas de 20, `hasMore` e ordenação por criação e ID decrescentes. O contador é calculado no servidor. O histórico inclui lidas e não lidas; a leitura é marcada explicitamente pelo usuário.
- RPC e REST compartilham `notifications.list` (`GET /api/notifications`), `notifications.unreadCount` (`GET /api/notifications/unread-count`) e `notifications.markRead` (`PATCH /api/notifications/{id}/read`). Filtros aceitam `all` ou `unread` e página positiva.
- TanStack Query inclui identidade e filtro nas chaves, propaga cancelamento e atualiza em foco, reconexão e a cada 15 segundos em abas ativas. Mutations invalidam lista e contador. Os estados de erro permitem nova tentativa; mudanças de identidade/permissão seguem o controle de cache da arquitetura.

## Adicionar uma funcionalidade

1. Defina o fato no domínio do módulo e acrescente seu tipo à união `DomainEvent`, com ID estável por ocorrência, ator, instante e dados mínimos.
2. Emita o evento junto da gravação do módulo; implemente a transação com a mesma garantia de `TaskRepository.save`.
3. Acrescente a política em `notificationsFor`: destinatários, tipo de entrega, referência e permissão. Para políticas maiores, extraia funções por módulo mantendo essa entrada pequena.
4. Resolva o novo tipo de referência e seu texto na caixa de entrada. Use destinos internos tipados e revalide autorização no recurso.
5. Teste ausência de destinatários, duplicatas, isolamento, revogação, referência removida e rollback. Não adicione dependências entre casos de uso e componentes da caixa.

## Evolução para processamento assíncrono

O pub/sub atual é local e transacional. Uma caixa de entrada persistida não precisa de broker para funcionar. A contrapartida é que a indisponibilidade da gravação de notificações impede concluir a criação da tarefa.

Quando houver email, push, processamento lento ou consumidores em outros processos, grave eventos numa **outbox** na mesma transação da alteração de negócio. Um worker deve consumir esses registros com retries, observabilidade e controle de concorrência; os consumidores precisam deduplicar pelo ID do evento. Não substitua a publicação atual por um `emit` em memória depois do commit, pois isso abre uma janela de perda entre salvar a tarefa e criar a notificação.

O transporte para atualizar a interface é uma decisão separada: polling pode evoluir para SSE sem alterar eventos, política ou persistência da caixa.
