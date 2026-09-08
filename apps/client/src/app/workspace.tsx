import { useState } from "react";
import { Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorNotice, Loading } from "@/components/feedback";
import { authClient } from "@/lib/auth";

export function Workspace() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setLeaving(true);
    setError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("sign out failed");
      await queryClient.cancelQueries();
      queryClient.clear();
      await session.refetch();
    } catch {
      setError("Não foi possível sair. Tente novamente.");
    } finally {
      setLeaving(false);
    }
  }

  if (session.isPending) return <Loading label="Verificando sua sessão…" />;
  if (session.error) return <div className="mx-auto max-w-lg p-8"><ErrorNotice message="Não foi possível verificar sua sessão. Confira a conexão com o servidor." retry={() => void session.refetch()} /></div>;
  if (!session.data) return <Navigate to="/login" replace />;

  const user = session.data.user;
  return <AppShell title={pathname === "/dashboard" ? "Dashboard" : "Tarefas"} user={user} leaving={leaving} onSignOut={() => void signOut()}>
    {error && <div className="mx-auto max-w-7xl px-5 pt-6 sm:px-8"><ErrorNotice message={error} /></div>}
    <Outlet />
  </AppShell>;
}
