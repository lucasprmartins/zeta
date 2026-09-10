import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ErrorNotice } from "@/components/feedback";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { useUserId } from "@/components/permission-boundary";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApprovalsPanel } from "./approvals-panel";
import { registrationStatusQuery } from "./queries";
import { RolesPanel } from "./roles-panel";
import { UsersPanel } from "./users-panel";

export function AdminUsersPage({
  view,
  search,
  onSearch,
}: {
  view: "users" | "roles" | "approvals";
  search: string;
  onSearch: (search: string) => void;
}) {
  const registration = useQuery(registrationStatusQuery(useUserId()));
  const showApprovals = Boolean(
    registration.data?.requireApproval ||
      registration.data?.pendingCount ||
      view === "approvals"
  );
  const tabs: { value: "users" | "roles" | "approvals"; label: string }[] = [
    { value: "users", label: "Usuários" },
    { value: "roles", label: "Papéis" },
    ...(showApprovals
      ? [{ value: "approvals" as const, label: "Aprovação" }]
      : []),
  ];
  return (
    <PageContent>
      <PageHeader
        description="Gerencie as contas e as permissões de acesso à aplicação."
        title="Usuários e papéis"
      />
      <nav
        aria-label="Seções de usuários e papéis"
        className="flex gap-1 border-b pb-3"
      >
        {tabs.map(({ value, label }) => (
          <Link
            aria-current={view === value ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "flex-1 sm:flex-none",
              view === value
                ? "bg-muted text-foreground"
                : "text-muted-foreground"
            )}
            key={value}
            search={{
              ...(search ? { q: search } : {}),
              ...(value === "users" ? {} : { view: value }),
            }}
            to="/admin/users"
          >
            {label}
          </Link>
        ))}
      </nav>
      {registration.isError && (
        <ErrorNotice
          message="Não foi possível verificar os cadastros pendentes."
          retry={() => void registration.refetch()}
        />
      )}
      {view === "approvals" ? (
        <ApprovalsPanel />
      ) : view === "roles" ? (
        <RolesPanel />
      ) : (
        <UsersPanel onSearch={onSearch} search={search} />
      )}
    </PageContent>
  );
}
