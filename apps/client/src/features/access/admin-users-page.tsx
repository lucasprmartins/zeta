import { useQuery } from "@tanstack/react-query";
import { registrationStatusQuery } from "./queries";
import { ApprovalsPanel } from "./approvals-panel";
import { ErrorNotice } from "@/components/feedback";
import { Link } from "@tanstack/react-router";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RolesPanel } from "./roles-panel";
import { UsersPanel } from "./users-panel";

export function AdminUsersPage({ userId, view, search, onSearch }: {
  userId: string; view: "users" | "roles" | "approvals"; search: string; onSearch: (search: string) => void;
}) {
  const registration = useQuery(registrationStatusQuery(userId));
  const showApprovals = Boolean(registration.data?.requireApproval || registration.data?.pendingCount || view === "approvals");
  const tabs: { value: "users" | "roles" | "approvals"; label: string }[] = [{ value: "users", label: "Usuários" }, { value: "roles", label: "Papéis" }, ...(showApprovals ? [{ value: "approvals" as const, label: "Aprovação" }] : [])];
  return <PageContent>
    <PageHeader title="Usuários e papéis" description="Gerencie as contas e as permissões de acesso à aplicação." />
    <nav aria-label="Seções de usuários e papéis" className="flex gap-1 border-b pb-3">
      {tabs.map(({ value, label }) =>
        <Link key={value} to="/admin/users" search={{ ...(search ? { q: search } : {}), ...(value !== "users" ? { view: value } : {}) }}
          aria-current={view === value ? "page" : undefined}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "flex-1 sm:flex-none", view === value ? "bg-muted text-foreground" : "text-muted-foreground")}>
          {label}
        </Link>)}
    </nav>
    {registration.isError && <ErrorNotice message="Não foi possível verificar os cadastros pendentes." retry={() => void registration.refetch()} />}
    {view === "approvals" ? <ApprovalsPanel userId={userId} /> : view === "roles" ? <RolesPanel userId={userId} /> : <UsersPanel userId={userId} search={search} onSearch={onSearch} />}
  </PageContent>;
}
