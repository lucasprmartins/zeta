# Gerenciamento de tarefas

Um espaço compartilhado para registrar o que precisa ser feito, à vista de todas as contas autorizadas.

## Language

**Tarefa (Task)**: Uma atividade com título, descrição opcional e estado. É visível a todas as contas que podem consultar tarefas; não pertence a ninguém em exclusividade.
_Avoid_: Projeto, card, ticket, tarefa privada

**Autor (Author)**: A conta que criou a tarefa. Registra a autoria e não restringe quem consulta ou altera. Fica em branco quando a conta é removida, e a tarefa permanece.
_Avoid_: Proprietário, dono, responsável

**Menção (Mention)**: Conta indicada em uma tarefa para saber que está relacionada a ela. Qualquer conta do sistema pode ser mencionada, e mencionar não concede nem retira permissões.
_Avoid_: Atribuição, responsável, convidado

**Pendente (Pending)**: Estado inicial de uma tarefa que ainda precisa ser concluída.
_Avoid_: Aberta, em andamento

**Concluída (Completed)**: Estado de uma tarefa finalizada, com a data de sua conclusão.
_Avoid_: Fechada, arquivada

**Reabrir (Reopen)**: Devolver uma tarefa concluída ao estado pendente, removendo sua data de conclusão.
_Avoid_: Restaurar, desfazer exclusão


## Controle de acesso

**Papel (Role)**: Conjunto nomeado de ações permitidas, atribuído a uma conta. Não concede nada além das ações que lista.
_Avoid_: Cargo, organização

**Permissão (Permission)**: Autorização para uma ação específica de uma funcionalidade, como consultar ou criar tarefas. O alcance de cada ação é definido pela funcionalidade: em tarefas, quem pode editar edita qualquer uma.
_Avoid_: Acesso total, nível

**Administrador (Admin)**: Usuário autorizado a configurar papéis e atribuí-los às contas. Não tem sobre as tarefas nenhum alcance além do que o catálogo de permissões concede.
_Avoid_: Proprietário de todas as tarefas

## Guia de Uso

**Guia (Guide)**: Conteúdo de orientação sobre o uso do sistema, organizado por seção e identificado por um endereço permanente. Pode exigir uma permissão de leitura.
_Avoid_: Documentação técnica, tutorial de instalação

**Rascunho (Draft)**: Versão editável de um guia, disponível apenas na administração. Alterá-la não modifica a versão publicada.
_Avoid_: Publicação automática

**Publicação (Publication)**: Versão do guia disponibilizada aos leitores autorizados. Retirar a publicação oculta o guia sem apagar o rascunho.
_Avoid_: Exclusão
