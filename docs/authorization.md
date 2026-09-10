# Controle de acesso

Better Auth autentica; `domain/authorization` administra papéis globais persistidos. Cada conta tem um papel, sem organizações. Funcionalidades usam ações de `packages/access`, com alcance definido pelo próprio módulo.

## Papéis e contas

- `user` e `admin` são protegidos, criados por migration e não excluíveis. Cadastro público recebe `user`; criação administrativa exige papel explícito. Não há promoção automática.
- `admin` recebe todas as ações atuais e futuras do catálogo e `access:manage`, reservado à administração. Sua lista persistida de concessões não limita esse acesso; apenas nome e cor são editáveis.
- `user` e papéis personalizados têm concessões explícitas editáveis. Ações desconhecidas ou removidas não autorizam nada.
- Nomes aceitam até 60 caracteres; cores usam hexadecimal de seis dígitos, sempre acompanhadas do nome. Há até 100 papéis, incluindo protegidos. Um papel atribuído não pode ser excluído.
- O último administrador ativo não pode perder o papel; contas bloqueadas ou pendentes não contam nessa proteção. Todas as atribuições, inclusive pelo CLI, usam a mesma transação e lock.

`/admin/users` reúne Usuários, Papéis (`?view=roles`) e Aprovação (`?view=approvals`). A busca `q` filtra nome, username ou email no servidor, sem diferenciar maiúsculas ou interpretar curingas. Usuários usam páginas de 20 itens, ordenados por nome/ID do papel e nome/ID da conta; grupos refletem apenas os itens carregados. Papéis são carregados por inteiro. O seletor agrupa ações por funcionalidade; busca e ações em lote preservam as seleções dos outros grupos.

A API própria cria e edita contas por `POST /api/access/users` e `PATCH /api/access/users/{userId}`, também via RPC. `infrastructure/auth/manage-users.ts` combina APIs internas Better Auth e transação Drizzle: credenciais, papel e revogação são atômicos. Alterar email remove sua verificação; omitir senha preserva a credencial, redefini-la encerra todas as sessões do alvo. Senhas geradas usam Web Crypto e ficam apenas no formulário, sem cache de mutations.

O plugin Admin permite consultas e listagem/revogação de sessões para `admin`. Criação, edição e senha são chamadas internas; os caminhos HTTP nativos ficam em `disabledPaths`. Atribuição nativa de papel, bloqueio, exclusão e impersonação permanecem sem permissão. Não reabilite caminhos que contornem as transações próprias.

## Cadastro e aprovação

`/admin/console` configura `allowSignUp` e `requireApproval`, persistidos separadamente em `console.registration`. O padrão é cadastro aberto, sem aprovação; fechar cadastro preserva a preferência de aprovação.

| Cadastro | Aprovação | Novas contas públicas |
| --- | --- | --- |
| Fechado | Qualquer | Cadastro recusado |
| Aberto | Desativada | Entrada imediata |
| Aberto | Ativada | Pendentes, sem sessão nem acesso |

Contas existentes e criadas pela administração permanecem aprovadas. Desativar a exigência não aprova pendências existentes. A aba Aprovação aparece com a exigência ativa ou enquanto houver pendências; a listagem comum exclui essas contas. Aprovar remove apenas a pendência, sem remover bloqueios ou alterar papel.

`GET /api/registration-policy` publica somente os dois indicadores. Configuração e aprovação em `/api/access/registration` e `/api/access/approvals` exigem `access:manage`, revalidado na transação.

O adapter aplica `disableSignUp` e `autoSignIn` por requisição. Cadastro por email compartilha o lock da política; hooks atribuem `approval_pending` no servidor e impedem sessão, também recusada pela resolução de identidade. Campos do navegador não podem alterar esse estado. Novas integrações de cadastro devem preservar os hooks e a consistência transacional.

## Extensão

| Local | Responsabilidade |
| --- | --- |
| `packages/access/src/index.ts` | Catálogo, rótulos, atalhos tipados e verificação de concessões |
| `apps/server/src/domain/authorization` | Papéis e casos de uso |
| `apps/server/src/infrastructure/repositories/drizzle-access-repository.ts` | Persistência e lock compartilhado |
| `apps/server/src/interfaces/http/rpc/access.ts` | REST/RPC de acesso e administração |
| `apps/client/src/components/permission-boundary.tsx` | Provider e controles de acesso |
| `apps/client/src/features/access` | Painéis administrativos |

Para acrescentar ações:

1. Registre IDs estáveis em `catalog`, com rótulos, descrições e atalhos em `permissions`.
2. Após autenticação, aplique `procedure.use(requirePermission(permissions.reports.read))` em cada procedure.
3. Dentro de `AccessProvider`, proteja páginas com `PermissionBoundary`, controles com `Can` e navegação/handlers com `usePermissions().can(...)`.
4. Publique servidor e cliente; conceda as novas ações pelo painel aos papéis que precisam delas. Só `admin` recebe automaticamente.
5. Teste concessão/negação, API direta, revogação em sessão existente e escopo dos recursos.

Não altere seeds históricos nem conceda implicitamente no bootstrap. Renomear IDs exige migrar concessões; remover ações exige retirar atalhos/usos e tratar concessões antigas. Criar papéis pelo painel não exige código nem migration.

## Consistência

A API resolve sessão sem cache de cookie e consulta concessões a cada requisição protegida. Mutações de acesso compartilham advisory lock PostgreSQL e revalidam o ator na transação, preservando o último administrador entre processos.

`AccessProvider` consulta `access.me` por identidade na entrada, foco/reconexão e a cada 15 segundos em abas ativas. Mudanças cancelam e reiniciam dados afetados; respostas 403 também atualizam permissões. Falhas bloqueiam conteúdo com nova tentativa. A API revoga imediatamente, independentemente da convergência visual das abas. Loaders também devem consultar endpoints protegidos.

## Primeiro administrador

No ambiente escolhido, atribua o papel a uma conta já cadastrada:

```sh
bun run db:migrate
bun run auth:set-role --email pessoa@exemplo.com --role admin
```

O CLI usa `DATABASE_URL`, valida o papel e preserva o último administrador. `--role` recebe o ID, não o nome de exibição. Depois, acesse Administração → Usuários; o Scalar agrupa os endpoints em Controle de acesso. Não use `authClient.admin.setRole`, desabilitado para preservar o fluxo transacional.
