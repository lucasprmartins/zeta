import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { ErrorNotice, Loading } from "@/components/feedback";
import { RouteFeedback } from "@/components/route-feedback";
import { can, type Permission } from "@/lib/access";
import { authClient } from "@/lib/auth";
import { isForbidden, isUnauthorized } from "@/lib/query";
import { rpc } from "@/lib/rpc";

// A sessão já foi validada pelo Workspace; daqui para baixo a identidade existe.
type SessionUser = NonNullable<
  ReturnType<typeof authClient.useSession>["data"]
>["user"];

const AccessContext = createContext<{
  user: SessionUser;
  grants: string[];
  pending: boolean;
  error: boolean;
  retry: () => void;
} | null>(null);
export function AccessProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const userId = user.id;
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["permissions", userId],
    queryFn: ({ signal }) => rpc.access.me(undefined, { signal }),
    staleTime: 0,
    refetchInterval: 15_000,
  });
  const previous = useRef<string | undefined>(undefined);
  const fingerprint = query.data
    ? JSON.stringify([query.data.roleId, [...query.data.grants].sort()])
    : undefined;
  useEffect(() => {
    if (fingerprint === undefined) {
      return;
    }
    if (previous.current !== undefined && previous.current !== fingerprint) {
      // Invalida também quando muda a definição do papel, sem mudar o nome na sessão.
      const affected = {
        predicate: (item: { queryKey: readonly unknown[] }) =>
          item.queryKey[0] !== "permissions",
      };
      void client
        .cancelQueries(affected)
        .then(() => client.resetQueries(affected));
    }
    previous.current = fingerprint;
  }, [client, fingerprint]);
  const { data, isError, isPending, refetch } = query;
  // O compartilhamento estrutural do Query preserva a referência de `data`
  // enquanto as concessões não mudam, e as telas memoizadas não redesenham.
  const value = useMemo(
    () => ({
      user,
      grants: isError ? [] : (data?.grants ?? []),
      pending: isPending,
      error: isError,
      retry: () => void refetch(),
    }),
    [user, data, isError, isPending, refetch]
  );
  return <AccessContext value={value}>{children}</AccessContext>;
}
function useAccess() {
  const access = useContext(AccessContext);
  if (!access) {
    throw new Error("Use controles de permissão dentro de AccessProvider.");
  }
  return access;
}

export const useCurrentUser = () => useAccess().user;
export const useUserId = () => useAccess().user.id;

export function usePermissions() {
  const access = useAccess();
  return useMemo(
    () => ({
      ...access,
      can: (permission: Permission) =>
        !(access.pending || access.error) && can(access.grants, permission),
    }),
    [access]
  );
}
export function Can({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  return usePermissions().can(permission) ? children : null;
}
export function PermissionBoundary({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const access = usePermissions();
  if (access.pending) {
    return <Loading label="Verificando acesso…" />;
  }
  if (access.error) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <ErrorNotice
          message="Não foi possível verificar suas permissões."
          retry={access.retry}
        />
      </div>
    );
  }
  if (!access.can(permission)) {
    return (
      <RouteFeedback
        description="Sua conta não tem permissão para acessar esta página. Se precisar de acesso, fale com um administrador."
        detail="403 — Acesso não permitido"
        notFound
        title="Acesso não permitido"
      />
    );
  }
  return children;
}

// Uma resposta 401/403 significa sessão encerrada ou acesso revogado: revalidar
// a sessão leva o Workspace a redirecionar ou a recarregar as permissões.
export function useRefreshSessionOnAuthError(errors: readonly unknown[]) {
  const { refetch } = authClient.useSession();
  const expired = errors.some(
    (error) => isUnauthorized(error) || isForbidden(error)
  );
  useEffect(() => {
    if (expired) {
      void refetch();
    }
  }, [expired, refetch]);
}
