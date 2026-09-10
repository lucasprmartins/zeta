import { useQueryClient } from "@tanstack/react-query";
import { Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { ErrorNotice, Loading } from "@/components/feedback";
import { AppShell } from "@/components/layout/app-shell";
import { pageBreadcrumb } from "@/components/layout/app-sidebar";
import { AccessProvider } from "@/components/permission-boundary";
import { authClient } from "@/lib/auth";

export function Workspace() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const session = authClient.useSession();
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
    return <Navigate replace to="/login" />;
  }

  const user = session.data.user;
  const { section, title } = pageBreadcrumb(pathname);
  return (
    <AccessProvider key={user.id} userId={user.id}>
      <AppShell
        leaving={leaving}
        onSignOut={() => void signOut()}
        section={section}
        title={title}
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
