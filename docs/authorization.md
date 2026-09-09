# Papéis e permissões

A autenticação pertence ao Better Auth. A autorização de funcionalidades usa papéis globais persistidos, sem organizações. Cada conta tem um papel; sua identidade continua sendo o ID da sessão.

## Política

- `user` e `admin` são papéis protegidos, criados pela migration. Novas contas recebem `user`; ninguém vira administrador automaticamente.
- Apenas `admin` administra papéis e atribuições. `access:manage` é reservado; papéis personalizados só recebem ações do catálogo de funcionalidades.
- `user` e papéis personalizados podem ter nome, cor e permissões de funcionalidades editados pelo painel. `admin` permite editar apenas nome e cor: recebe automaticamente todas as ações atuais e futuras do catálogo, além de `access:manage`; sua lista persistida de concessões não limita esse acesso. A cor usa hexadecimal de seis dígitos e aparece junto ao nome, nunca como único identificador. `user` e `admin` preservam seus IDs e não podem ser excluídos; `admin` sempre conserva `access:manage`. Papéis personalizados podem ser criados e excluídos. O nome tem até 60 caracteres; há no máximo 100 papéis, incluindo os protegidos. A lista de papéis é carregada por inteiro para edição/seleção; usuários usam rolagem infinita de 20 itens por página, ordenados por nome do papel, ID do papel, nome e ID do usuário. A interface agrupa os itens carregados por ID do papel; os grupos continuam nas próximas páginas e não representam contagens totais.
- Papéis atribuídos não podem ser excluídos. Reatribua seus usuários primeiro. O último administrador ativo não pode perder seu papel; contas bloqueadas não contam nessa proteção.
- Permissões liberam ações, não outros proprietários. Administradores também mantêm tarefas privadas. Concessões desconhecidas ou removidas do catálogo não liberam acesso.

O plugin Admin continua com consulta de contas e listagem/revogação de sessões para `admin`. Atribuição de papel, bloqueio, exclusão, impersonação e redefinição administrativa de senha não estão autorizados por seus endpoints. Isso impede contornar o módulo de autorização; não reabilite esses caminhos sem integrar as mesmas proteções.

## Pontos de extensão

| Local | Responsabilidade |
| --- | --- |
| `packages/access/src/index.ts` | Catálogo com IDs/rótulos/descrições, atalhos `permissions` e verificação de concessões |
| `server/src/domain/authorization` | Validação dos papéis e casos de uso, sem bibliotecas |
| `server/src/infrastructure/repositories/drizzle-access-repository.ts` | Persistência e transações com lock compartilhado por painel e CLI |
| `server/src/interfaces/http/rpc/access.ts` | REST/RPC de permissões, papéis e usuários |
| `client/src/components/permission-boundary.tsx` | Consulta de acesso e controles visuais |
| `client/src/features/access` | Painel `/admin/users`, com seções Usuários e Papéis |

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
