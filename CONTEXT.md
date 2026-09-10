# Vocabulário do produto

## Tarefas

**Tarefa (Task)**: Atividade compartilhada entre as contas autorizadas, com título, descrição opcional e status.
_Avoid_: Tarefa privada, ticket, card

**Autor (Author)**: Conta que criou a tarefa; registra autoria sem restringir acesso. Sua remoção preserva a tarefa sem autor.
_Avoid_: Proprietário, dono, responsável

**Responsável (Assignee)**: Conta indicada para responder por uma tarefa, que pode ter vários responsáveis. A indicação não concede nem retira permissões.
_Avoid_: Menção, convidado, dono

**Status (Status)**: Situação da tarefa: **Pendente (Pending)** enquanto há trabalho a fazer, ou **Concluída (Completed)** com data de conclusão.
_Avoid_: Fase, etapa, arquivada

**Reabrir (Reopen)**: Devolver uma tarefa concluída a pendente, removendo a data de conclusão.
_Avoid_: Restaurar, desfazer exclusão

## Controle de acesso

**Papel (Role)**: Conjunto nomeado de permissões atribuído a uma conta.
_Avoid_: Cargo, organização

**Permissão (Permission)**: Autorização para uma ação cujo alcance pertence à funcionalidade; editar tarefas permite editar qualquer tarefa.
_Avoid_: Nível, acesso total

**Administrador (Admin)**: Conta com o papel protegido que administra o sistema e recebe todas as ações do catálogo.
_Avoid_: Proprietário dos recursos

## Guia de Uso

**Guia (Guide)**: Orientação sobre o uso do sistema, organizada por seção e endereço permanente, com acesso que pode ser restrito por permissões — quem tiver qualquer uma delas lê o guia.
_Avoid_: Documentação técnica, tutorial de instalação

**Rascunho (Draft)**: Versão editável disponível à administração; suas alterações não afetam a publicação.
_Avoid_: Publicação automática

**Publicação (Publication)**: Versão visível aos leitores autorizados; retirá-la oculta o guia e preserva o rascunho.
_Avoid_: Exclusão
