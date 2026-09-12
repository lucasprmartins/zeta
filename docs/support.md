# Suporte técnico

`/help` apresenta Suporte técnico e Guias de uso lado a lado quando o chat está desativado, com Suporte técnico primeiro. Em telas pequenas, os cards ficam empilhados nessa mesma ordem. Com o chat ativado, o acesso aparece como botão ao lado do Guia de Uso, tanto na abertura quanto durante a conversa.

O suporte oferece o envio de problemas, dúvidas e sugestões à equipe de atendimento. Qualquer conta autenticada e ativa pode enviar; não é necessário conceder acesso às tarefas ou à administração. O suporte encaminha tickets para a gestão externa, sem consultar andamento ou manter uma caixa local de tickets.

## Configuração

Em `/admin/console`, **Ajuda e suporte** reúne a chave da IA e o webhook de suporte, configurados independentemente. A configuração do suporte exige `access:manage`, revalidado na transação. Informe o nome do sistema ou cliente, a URL HTTPS pública do receptor e, opcionalmente, um token Bearer. A URL e o token são segredos: ficam criptografados no servidor e não voltam ao navegador após a gravação. Substituir a configuração exige informar os novos valores; remover desativa os envios.

Cada instalação configura sua própria origem e destino. Não há endereço de atendimento embutido no código nem dependência de um fornecedor de gestão de projetos.

## Solicitação

O formulário coleta assunto, descrição, tipo, prioridade, página afetada opcional e anexos. A descrição deve explicar o que ocorreu, como reproduzir e qual resultado era esperado. Tipos disponíveis: Erro, Funcionalidade, Otimização, Dúvida e Sugestão. Prioridades: Baixa, Normal, Alta e Urgente; a prioridade expressa a necessidade do solicitante, sem prometer prazo de atendimento.

Os anexos são enviados em base64, acompanhados de nome, tipo de mídia e tamanho em bytes. Há limite de três arquivos, 2 MiB por arquivo e 5 MiB no total, validado também no servidor. O conteúdo não é salvo no banco da aplicação. Evite incluir senhas, tokens ou informações que não sejam necessárias para o atendimento.

O servidor acrescenta a identificação autenticada do solicitante, origem da instalação, protocolo e data UTC. A página afetada não inclui query string nem fragmento. Nenhum desses campos concede acesso a dados da aplicação ao receptor.

## Confirmação e novas tentativas

O servidor envia um POST JSON e confirma a solicitação somente quando o receptor responde **HTTP 200**. Outros códigos, redirecionamentos e timeout não confirmam a entrega. O corpo da resposta não fornece status nem é exibido ao usuário. Após sucesso, a tela mostra o protocolo e orienta aguardar atendimento; em falha, preserva o formulário para nova tentativa manual.

Uma falha de conexão pode acontecer depois que o receptor já recebeu o ticket. Por isso, o receptor deve deduplicar pelo header `Idempotency-Key`, preservado nas novas tentativas da mesma solicitação, e devolver 200 também para uma duplicata já aceita. Não há promessa de entrega exatamente uma vez. O protocolo é uma referência de envio, não um status retornado pela gestão externa.

## Contrato do receptor

O corpo usa campos estáveis em inglês, independentemente dos rótulos da interface:

```json
{
  "schemaVersion": "1.0",
  "event": "support.ticket.created",
  "ticketId": "c108ec90-efbe-427b-a464-198d16484d11",
  "requestId": "90bbd49c-703f-4768-8d58-46503ec646d7",
  "requestedAt": "2026-09-11T15:00:00.000Z",
  "subject": "Erro ao salvar uma tarefa",
  "description": "Ao salvar, aparece uma mensagem de erro. Esperava concluir o cadastro.",
  "type": "error",
  "priority": "normal",
  "requester": {
    "id": "identificador-da-conta",
    "name": "Nome do solicitante",
    "email": "solicitante@example.com"
  },
  "source": {
    "name": "Sistema do cliente",
    "origin": "https://sistema.example.com",
    "pageUrl": "https://sistema.example.com/tasks"
  },
  "attachments": [
    {
      "name": "erro.txt",
      "mediaType": "text/plain",
      "size": 4,
      "base64": "RXJybw=="
    }
  ]
}
```

`type` aceita `error`, `feature`, `optimization`, `question` e `suggestion`. `priority` aceita `low`, `normal`, `high` e `urgent`. Sem arquivos, `attachments` é `[]`; sem página informada, `source.pageUrl` é omitido. `requestId` identifica a solicitação iniciada no formulário; alterar seu conteúdo após uma falha gera outro identificador. `ticketId` é derivado pelo servidor da origem, conta e `requestId`, mantendo o protocolo entre réplicas e reinícios. A data da primeira tentativa é preservada em memória por até 24 horas no mesmo processo; após reinício ou troca de réplica, a nova tentativa pode trazer outra data. O receptor deve preservar a data do primeiro recebimento ao deduplicar. O receptor deve validar o token quando configurado, validar o contrato e tratar nomes/tipos de anexos como dados não confiáveis.

Endpoints autenticados da aplicação: `GET /api/support/status`, `PUT /api/admin/support` e `POST /api/support/tickets`, também acessíveis pelo cliente RPC em `support`. A leitura de disponibilidade retorna somente `{ "configured": true | false }`.

## Limites operacionais

O envio tem timeout de 15 segundos e limite de cinco tentativas por conta a cada dez minutos, controlado em memória por processo. Instalações com múltiplas réplicas devem considerar esse limite por réplica. Não há fila nem repetição automática em segundo plano.

O webhook usa HTTPS na porta 443, sem credenciais embutidas ou fragmento. A resolução DNS ocorre no envio, bloqueia redes privadas/reservadas e fixa a conexão ao IP validado, mantendo a verificação do certificado TLS. Redirecionamentos não são seguidos. A configuração pode ser salva antes de o receptor estar disponível; o indicador “Ativado” informa a presença da configuração, não um teste de conectividade.

A migration incremental cria `console.support`. O conteúdo da configuração usa AES-GCM com chave derivada de `BETTER_AUTH_SECRET`; alterar esse segredo exige configurar novamente o suporte. O destino recebe os dados e anexos para atendimento e determina sua retenção.
