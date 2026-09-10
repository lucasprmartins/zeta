import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";
import { ErrorNotice, Loading } from "@/components/feedback";
import { RouteFeedback } from "@/components/route-feedback";
import { can, type Permission } from "@/lib/access";
import { rpc } from "@/lib/rpc";

const AccessContext = createContext<{
  grants: string[];
  pending: boolean;
  error: boolean;
  retry: () => void;
} | null>(null);
export function AccessProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
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
  return (
    <AccessContext
      value={{
        grants: query.isError ? [] : (query.data?.grants ?? []),
        pending: query.isPending,
        error: query.isError,
        retry: () => void query.refetch(),
      }}
    >
      {children}
    </AccessContext>
  );
}
export function usePermissions() {
  const access = useContext(AccessContext);
  if (!access) {
    throw new Error("Use controles de permissão dentro de AccessProvider.");
  }
  return {
    ...access,
    can: (permission: Permission) =>
      !(access.pending || access.error) && can(access.grants, permission),
  };
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
