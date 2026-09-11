import { useQueryClient } from "@tanstack/react-query";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ErrorNotice, Loading } from "@/components/feedback";
import { AppShell } from "@/components/layout/app-shell";
import { AccessProvider } from "@/components/permission-boundary";
import { InboxPanel, InboxTrigger } from "@/features/notifications/inbox";
import { authClient } from "@/lib/auth";
import { safeReturnTo } from "@/lib/return-to";

export function Workspace() {
  const session = authClient.useSession();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setLeaving(true);
    setError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        throw new Error("sign out failed");
      }
      await queryClient.cancelQueries();
      queryClient.clear();
      await session.refetch();
    } catch {
      setError("Não foi possível sair. Tente novamente.");
    } finally {
      setLeaving(false);
    }
  }

  if (session.isPending) {
    return <Loading label="Verificando sua sessão…" />;
  }
  if (session.error) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <ErrorNotice
          message="Não foi possível verificar sua sessão. Confira a conexão com o servidor."
          retry={() => void session.refetch()}
        />
      </div>
    );
  }
  if (!session.data) {
    return <LoginRedirect href={location.href} />;
  }

  const { user } = session.data;
  return (
    <AccessProvider key={user.id} user={user}>
      <AppShell
        leaving={leaving}
        onSignOut={() => void signOut()}
        sidebarAction={(collapsed, onNavigate) => (
          <InboxTrigger collapsed={collapsed} onNavigate={onNavigate} />
        )}
        sidebarPanel={(collapsed) => <InboxPanel collapsed={collapsed} />}
        user={user}
      >
        {error && (
          <div className="mx-auto max-w-7xl px-5 pt-6 sm:px-8">
            <ErrorNotice message={error} />
          </div>
        )}
        <Outlet />
      </AppShell>
    </AccessProvider>
  );
}

// A rota anterior pode continuar montada enquanto o login carrega. Capture o
// destino uma vez para não encadear o endereço do próprio login em `redirect`.
// `Navigate` compara suas props por identidade e renavegaria a cada render,
// realimentando o próprio ciclo; a navegação aqui acontece uma única vez.
function LoginRedirect({ href }: { href: string }) {
  const navigate = useNavigate();
  const [redirect] = useState(() => safeReturnTo(href));
  useEffect(() => {
    void navigate({ replace: true, search: { redirect }, to: "/login" });
  }, [navigate, redirect]);
  return <Loading label="Redirecionando para a entrada…" />;
}
