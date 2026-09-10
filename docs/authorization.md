# Papéis e permissões

A autenticação pertence ao Better Auth. A autorização de funcionalidades usa papéis globais persistidos, sem organizações. Cada conta tem um papel; sua identidade continua sendo o ID da sessão.

## Política

- `user` e `admin` são papéis protegidos, criados pela migration. Cadastros públicos recebem `user`; a criação administrativa exige um papel explícito. Ninguém vira administrador automaticamente.
- Apenas `admin` administra contas, papéis e atribuições. `access:manage` é reservado; papéis personalizados só recebem ações do catálogo de funcionalidades.
- `user` e papéis personalizados podem ter nome, cor e permissões de funcionalidades editados pelo painel. `admin` permite editar apenas nome e cor: recebe automaticamente todas as ações atuais e futuras do catálogo, além de `access:manage`; sua lista persistida de concessões não limita esse acesso. A cor usa hexadecimal de seis dígitos e aparece junto ao nome, nunca como único identificador. `user` e `admin` preservam seus IDs e não podem ser excluídos; `admin` sempre conserva `access:manage`. Papéis personalizados podem ser criados e excluídos. O nome tem até 60 caracteres; há no máximo 100 papéis, incluindo os protegidos. A lista de papéis é carregada por inteiro para edição/seleção; usuários usam rolagem infinita de 20 itens por página, ordenados por nome do papel, ID do papel, nome e ID do usuário. A interface agrupa os itens carregados por ID do papel; os grupos continuam nas próximas páginas e não representam contagens totais.
- Papéis atribuídos não podem ser excluídos. Reatribua seus usuários primeiro. O último administrador ativo não pode perder seu papel; contas bloqueadas ou pendentes de aprovação não contam nessa proteção.
- Permissões liberam ações, não outros proprietários. Administradores também mantêm tarefas privadas. Concessões desconhecidas ou removidas do catálogo não liberam acesso.

O painel cria e edita nome, username, e-mail, papel e senha por `/api/access/users` (POST) e `/api/access/users/{userId}` (PATCH), também disponíveis em RPC. A busca filtra a lista por trechos de nome, nome de usuário ou e-mail, sem diferenciar maiúsculas e sem interpretar curingas. O filtro fica em `q` na URL e é aplicado no servidor antes da paginação; a edição abre pelo botão de cada usuário.

`infrastructure/auth/manage-users.ts` usa as APIs internas do Better Auth em uma transação Drizzle, com o mesmo lock das atribuições de papel. Validações, credenciais, atribuição e revogação de sessões são atômicas. Alterar o e-mail remove sua verificação; omitir senha preserva a credencial. Redefinir senha encerra todas as sessões do alvo, inclusive a atual se o administrador editar a própria conta. O gerador usa Web Crypto; senhas ficam somente no formulário e não no cache de mutations.

O plugin Admin permite consulta de contas e listagem/revogação de sessões para `admin`. Criação, edição e redefinição de senha são habilitadas para chamadas internas, mas seus caminhos HTTP nativos estão em `disabledPaths`, impedindo contornar a transação do painel. Atribuição nativa de papel, bloqueio, exclusão e impersonação continuam sem permissão.

## Console e aprovação de cadastro

`/admin/console` permite configurar separadamente `allowSignUp` e `requireApproval`. Ambas são persistidas em `registration_settings`. O padrão é cadastro aberto, sem aprovação; fechar o cadastro não apaga a preferência de aprovação.

| Cadastro | Aprovação | Novas contas públicas |
| --- | --- | --- |
| Fechado | Qualquer | Não podem ser criadas; o login não exibe Criar conta |
| Aberto | Desativada | Podem entrar imediatamente |
| Aberto | Ativada | Aguardam aprovação, sem sessão nem acesso |

Contas existentes e contas criadas pelo administrador permanecem aprovadas. A migration acrescenta `auth_user.approval_pending` com valor inicial falso; esse estado é separado de bloqueio e papel. Desativar a exigência vale para novos cadastros e não aprova pendências automaticamente. A aba **Aprovação** (`/admin/users?view=approvals`) aparece com a exigência ativa ou enquanto houver pendências. A lista de usuários comuns exclui pendentes; ambas usam paginação incremental.

`GET /api/registration-policy` publica somente os dois indicadores usados no login/cadastro. Configuração, contagem, listagem e aprovação exigem `access:manage` em `/api/access/registration` e `/api/access/approvals`. Os casos de uso revalidam o administrador dentro da transação; aprovação altera apenas a pendência e não remove bloqueios nem concede outro papel.

O adapter aplica a política atual ao Better Auth (`disableSignUp` e `autoSignIn`) por requisição, sem reinício. O cadastro por e-mail usa uma transação com o mesmo lock das mudanças da política. Hooks atribuem a pendência no servidor e bloqueiam a criação de sessão; a resolução de identidade também recusa contas pendentes. Não permita que campos enviados pelo cliente alterem esse estado. Integrações futuras de cadastro devem preservar os mesmos hooks e a consistência com a política.

## Pontos de extensão

| Local | Responsabilidade |
| --- | --- |
| `packages/access/src/index.ts` | Catálogo com IDs/rótulos/descrições, atalhos `permissions` e verificação de concessões |
| `server/src/domain/authorization` | Validação dos papéis e casos de uso, sem bibliotecas |
| `server/src/infrastructure/repositories/drizzle-access-repository.ts` | Persistência e transações com lock compartilhado por painel e CLI |
| `server/src/interfaces/http/rpc/access.ts` | REST/RPC de permissões, papéis e usuários |
| `client/src/components/permission-boundary.tsx` | Consulta de acesso e controles visuais |
| `client/src/features/access` | Painéis `/admin/console` e `/admin/users`, com Usuários, Papéis e Aprovação |

Os caminhos `server/` e `client/` são relativos a `apps/`. Os adapters `access.ts` dos apps mantêm explícito o vínculo ao workspace compartilhado.

## Adicionar uma funcionalidade

1. Registre suas ações em `catalog`, com IDs estáveis como `reports:read` e `reports:export`, rótulos e descrições. Acrescente os atalhos tipados em `permissions`.
2. Proteja cada procedure depois da autenticação:

```ts
procedure.use(requirePermission(permissions.reports.read))
```

3. Proteja a página com `PermissionBoundary`, botões com `Can` e navegação/handlers com `usePermissions().can(...)`:

```tsx
<PermissionBoundary permission={permissions.reports.read}>
  <ReportsPage />
</PermissionBoundary>
```

4. Publique servidor e cliente. O formulário de papéis apresenta as ações do catálogo. Um administrador pode concedê-las aos papéis personalizados sem novo deploy.
5. Teste permissão concedida/negada, acesso direto à API, revogação em sessão existente e escopo dos recursos.

Novas ações são concedidas automaticamente apenas ao `admin`. Para `user` e papéis personalizados, um administrador deve concedê-las pelo painel. Não altere seeds históricos nem aplique concessões implícitas no bootstrap. Renomear um ID exige migrar suas concessões. Ao remover uma ação, remova também os atalhos e usos e limpe as concessões antigas quando apropriado.

Criar um papel personalizado pelo painel não exige mudança no código nem migration. O domínio de outras funcionalidades permanece independente dessa administração.

O formulário mantém nome e cor no topo e organiza as permissões em accordions por funcionalidade. Os grupos começam recolhidos, exibem a seleção no cabeçalho e podem ser abertos simultaneamente. A busca filtra funcionalidades sem descartar seleções; ações em lote afetam apenas o grupo correspondente.

## Consistência e segurança

A API resolve sessão sem cache de cookie e carrega concessões em cada requisição protegida. Administração revalida o ator dentro da transação; todas as mutações de acesso usam o mesmo advisory lock no PostgreSQL. A checagem do último administrador e a escrita são atômicas, inclusive entre processos.

`AccessProvider` consulta `access.me` por identidade na entrada, no foco/reconexão e a cada 15 segundos em abas ativas. Mudanças de papel ou concessões cancelam e reiniciam os dados afetados; respostas 403 também forçam atualização das permissões. Outras abas convergem no próximo foco ou intervalo. A revogação na API independe dessa atualização visual. Erro ao carregar permissões bloqueia o conteúdo e oferece nova tentativa.

O frontend nunca substitui a autorização no servidor. Consultas iniciadas por loaders também precisam de endpoints protegidos. Mantenha os checks por proprietário nos casos de uso.

## Primeiro administrador

Aplique migrations e atribua o papel a uma conta já cadastrada, no ambiente escolhido:

```sh
bun run db:migrate
bun run auth:set-role --email pessoa@exemplo.com --role admin
```

O CLI utiliza `DATABASE_URL`, valida o papel no banco e preserva o último administrador. Para papéis personalizados, `--role` recebe seu ID, não o nome de exibição. O painel evita precisar desses IDs no uso comum.

Depois, acesse `/admin/users` na seção **Administração** da sidebar. Alterne entre **Usuários** para atribuir papéis e **Papéis** para configurá-los (`?view=roles`). A busca de usuários é preservada na URL ao alternar. Os endpoints próprios ficam no Scalar em **Controle de acesso**. Não use `authClient.admin.setRole`: esse caminho foi desabilitado para preservar as regras transacionais.
