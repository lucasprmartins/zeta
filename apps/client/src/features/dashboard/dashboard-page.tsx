import { usePermissions } from "@/components/permission-boundary";
import { permissions } from "@/lib/access";
import { Card } from "@/components/ui/card";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { PageContent } from "@/components/layout/page-content";
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRightIcon, CheckCircleIcon, ClockIcon, CircleIcon, CheckSquareIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorNotice } from "@/components/feedback";
import { buttonVariants } from "@/components/ui/button";
import { tasksQuery } from "@/features/tasks/queries";
import { authClient } from "@/lib/auth";
import { isForbidden, isUnauthorized } from "@/lib/query";

export function DashboardPage({ userId }: { userId: string }) {
  const { can } = usePermissions();
  const session = authClient.useSession();
  const pending = useQuery(tasksQuery(userId, "pending", 1));
  const completed = useQuery(tasksQuery(userId, "completed", 1));
  useEffect(() => { if ([pending.error, completed.error].some((error) => isUnauthorized(error) || isForbidden(error))) void session.refetch(); }, [pending.error, completed.error, session.refetch]);
  const loading = pending.isPending || completed.isPending;
  const error = pending.error ?? completed.error;
  const total = (pending.data?.total ?? 0) + (completed.data?.total ?? 0);
  const progress = total ? Math.round((completed.data?.total ?? 0) / total * 100) : 0;
  return <PageContent>
    <PageHeader title="Dashboard" description="Uma visão geral das suas tarefas."
      actions={<Link to="/tasks" search={{ status: "all" }} className={buttonVariants({ size: "sm" })}>Gerenciar tarefas<ArrowUpRightIcon className="size-4" /></Link>} />
    {error ? <ErrorNotice message="Não foi possível carregar o resumo." retry={() => { void pending.refetch(); void completed.refetch(); }} /> : loading || !pending.data || !completed.data ? <DashboardSkeleton /> : <>
      <div className="grid gap-4 sm:grid-cols-3">
        {([
          { label: "Total de tarefas", value: total, icon: CheckSquareIcon, status: "all" },
          { label: "Pendentes", value: pending.data.total, icon: ClockIcon, status: "pending" },
          { label: "Concluídas", value: completed.data.total, icon: CheckCircleIcon, status: "completed" },
        ] as const).map(({ label, value, icon: Icon, status }) => <Link key={status} to="/tasks" search={{ status }} className="group rounded-xl"><Card className="h-full p-5 shadow-none transition-colors group-hover:bg-sidebar">
          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><Icon className="size-[18px]" weight="regular" /></div>
          <div className="mt-5 flex items-end justify-between"><span className="text-3xl font-semibold tracking-tight">{value}</span><ArrowUpRightIcon className="size-4 text-muted-foreground group-hover:text-foreground" /></div>
        </Card></Link>)}
      </div>
      <div className="space-y-6">
        <section aria-labelledby="progress-heading" className="rounded-xl border bg-sidebar p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div><h2 id="progress-heading" className="text-sm font-semibold">Seu progresso</h2><p className="mt-1 text-xs text-muted-foreground">{completed.data.total} de {total} tarefas concluídas</p></div>
            <span className="text-2xl font-semibold tracking-tight">{progress}<span className="text-sm text-muted-foreground">%</span></span>
          </div>
          <progress aria-label="Percentual de tarefas concluídas" value={progress} max={100} className="task-progress block h-1.5 w-full overflow-hidden rounded-full" />
        </section>
        <section className="overflow-hidden rounded-xl border" aria-labelledby="recent-tasks">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><div><h2 id="recent-tasks" className="text-sm font-semibold">Pendentes recentes</h2><p className="mt-1 text-xs text-muted-foreground">As últimas tarefas que você adicionou.</p></div><Link to="/tasks" search={{ status: "pending" }} className="text-xs font-medium hover:underline">Ver todas →</Link></div>
          {pending.data.items.length === 0 ? <Empty><EmptyMedia><CheckSquareIcon aria-hidden="true" /></EmptyMedia><EmptyTitle>{total === 0 ? can(permissions.tasks.create) ? "Pronto para começar?" : "Nenhuma tarefa pendente" : "Tudo concluído por aqui."}</EmptyTitle><EmptyDescription>{total === 0 && can(permissions.tasks.create) ? "Acesse Tarefas e registre seu primeiro passo." : "Suas próximas tarefas aparecerão neste espaço."}</EmptyDescription></Empty> :
            <ul className="divide-y">{pending.data.items.slice(0, 5).map((task) => <li key={task.id} className="flex items-start gap-3 px-5 py-4"><CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" weight="regular" /><div className="min-w-0"><p className="break-words text-sm font-medium">{task.title}</p>{task.description && <p className="mt-1 truncate text-xs text-muted-foreground">{task.description}</p>}</div></li>)}</ul>}
        </section>

      </div>
    </>}
  </PageContent>;
}
