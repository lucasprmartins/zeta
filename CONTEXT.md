# Gerenciamento de tarefas

Um espaço pessoal para registrar o que precisa ser feito e acompanhar sua conclusão.

## Language

**Tarefa (Task)**: Uma atividade com título, descrição opcional e estado. Pertence a um único proprietário.
_Avoid_: Projeto, card, ticket

**Proprietário (Owner)**: A pessoa que criou a tarefa e é a única que pode consultá-la ou alterá-la.
_Avoid_: Responsável, colaborador

**Pendente (Pending)**: Estado inicial de uma tarefa que ainda precisa ser concluída.
_Avoid_: Aberta, em andamento

**Concluída (Completed)**: Estado de uma tarefa finalizada, com a data de sua conclusão.
_Avoid_: Fechada, arquivada

**Reabrir (Reopen)**: Devolver uma tarefa concluída ao estado pendente, removendo sua data de conclusão.
_Avoid_: Restaurar, desfazer exclusão


## Controle de acesso

**Papel (Role)**: Conjunto nomeado de ações permitidas, atribuído a uma conta. Não altera a propriedade dos dados.
_Avoid_: Cargo, organização

**Permissão (Permission)**: Autorização para uma ação específica de uma funcionalidade, como consultar ou criar tarefas.
_Avoid_: Acesso total, nível

**Administrador (Admin)**: Usuário autorizado a configurar papéis e atribuí-los às contas. Suas tarefas continuam privadas, como as dos demais usuários.
_Avoid_: Proprietário de todas as tarefas

## Guia de Uso

**Guia (Guide)**: Conteúdo de orientação sobre o uso do sistema, organizado por seção e identificado por um endereço permanente. Pode exigir uma permissão de leitura.
_Avoid_: Documentação técnica, tutorial de instalação

**Rascunho (Draft)**: Versão editável de um guia, disponível apenas na administração. Alterá-la não modifica a versão publicada.
_Avoid_: Publicação automática

**Publicação (Publication)**: Versão do guia disponibilizada aos leitores autorizados. Retirar a publicação oculta o guia sem apagar o rascunho.
_Avoid_: Exclusão
