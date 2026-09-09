import type { OpenAPI } from "@orpc/openapi";

const sections = [
  { name: "Acesso", description: "Comece aqui: crie sua conta, entre ou encerre a sessão.", endpoints: {
    "/sign-up/email": "Criar conta com email e nome de usuário",
    "/sign-in/email": "Entrar com email e senha",
    "/sign-in/username": "Entrar com nome de usuário e senha",
    "/sign-out": "Sair da conta",
  } },
  { name: "Sessões", description: "Consulte a sessão atual e gerencie os dispositivos conectados.", endpoints: {
    "/get-session": "Consultar sessão atual",
    "/list-sessions": "Listar sessões ativas",
    "/update-session": "Atualizar sessão",
    "/revoke-session": "Revogar uma sessão",
    "/revoke-sessions": "Revogar todas as sessões",
    "/revoke-other-sessions": "Revogar outras sessões",
  } },
  { name: "Conta", description: "Gerencie os dados do usuário e sua conta.", endpoints: {
    "/update-user": "Atualizar perfil e nome de usuário",
    "/is-username-available": "Verificar disponibilidade do nome de usuário",
    "/change-email": "Alterar email",
    "/delete-user": "Excluir conta",
    "/delete-user/callback": "Confirmar exclusão da conta",
  } },
  { name: "Senhas", description: "Altere ou recupere sua senha. A recuperação exige um provedor de email configurado.", endpoints: {
    "/change-password": "Alterar senha",
    "/verify-password": "Verificar senha atual",
    "/request-password-reset": "Solicitar recuperação de senha",
    "/reset-password": "Redefinir senha",
    "/reset-password/{token}": "Validar link de recuperação",
  } },
  { name: "Verificação de email", description: "Confirme o endereço de email. O envio exige um provedor de email configurado.", endpoints: {
    "/send-verification-email": "Enviar email de verificação",
    "/verify-email": "Confirmar endereço de email",
  } },
  { name: "Provedores", description: "Integrações com provedores externos. Configure o provedor antes de usar estas operações.", endpoints: {
    "/sign-in/social": "Entrar com provedor externo",
    "/callback/{id}": "Receber retorno do provedor",
    "/link-social": "Vincular provedor à conta",
    "/list-accounts": "Listar contas vinculadas",
    "/unlink-account": "Desvincular conta",
    "/refresh-token": "Renovar token do provedor",
    "/get-access-token": "Obter token do provedor",
    "/account-info": "Consultar conta do provedor",
  } },
  { name: "Administração", description: "Gerenciamento de contas e sessões conforme as permissões do papel.", endpoints: {
    "/admin/set-role": "Alterar papel de uma conta",
    "/admin/list-users": "Listar contas",
    "/admin/get-user": "Consultar conta",
    "/admin/create-user": "Criar conta",
    "/admin/update-user": "Atualizar conta",
    "/admin/remove-user": "Remover conta",
    "/admin/ban-user": "Bloquear conta",
    "/admin/unban-user": "Desbloquear conta",
    "/admin/list-user-sessions": "Listar sessões da conta",
    "/admin/revoke-user-session": "Revogar sessão da conta",
    "/admin/revoke-user-sessions": "Revogar sessões da conta",
    "/admin/set-user-password": "Definir senha da conta",
    "/admin/impersonate-user": "Iniciar sessão como outra conta",
    "/admin/stop-impersonating": "Encerrar sessão de representação",
    "/admin/has-permission": "Verificar permissões",
  } },
  { name: "Diagnóstico", description: "Respostas de estado e erro do serviço de autenticação.", endpoints: {
    "/ok": "Verificar serviço de autenticação",
    "/error": "Consultar erro de autenticação",
  } },
] satisfies { name: string; description: string; endpoints: Record<string, string> }[];

export function organizeAuthSections(document?: OpenAPI.Document) {
  const paths: OpenAPI.PathsObject = {};
  const usedTags = new Set<string>();
  const sourcePaths = document?.paths ?? {};
  const orderedPaths = new Set([...sections.flatMap((section) => Object.keys(section.endpoints)), ...Object.keys(sourcePaths)]);
  for (const path of orderedPaths) {
    const item = sourcePaths[path];
    if (!item) continue;
    const section = sections.find((section) => path in section.endpoints);
    const tag = section?.name ?? "Outras operações";
    const summary = section && (section.endpoints as Record<string, string>)[path];
    const authPath = { ...item };
    for (const method of ["get", "post", "put", "patch", "delete", "options", "head", "trace"] as const) {
      const operation = authPath[method];
      if (operation) {
        authPath[method] = { ...operation, tags: [tag], ...(summary ? { summary } : {}) };
        usedTags.add(tag);
      }
    }
    paths[`/api/auth${path}`] = authPath;
  }
  const tags = sections.filter((section) => usedTags.has(section.name))
    .map(({ name, description }) => ({ name, description }));
  if (usedTags.has("Outras operações")) tags.push({ name: "Outras operações", description: "Endpoints adicionais de autenticação." });
  return { paths, tags };
}
