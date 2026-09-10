import {
  ArrowUpRightIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  CircleIcon,
  ClockIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ErrorNotice } from "@/components/feedback";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { usePermissions } from "@/components/permission-boundary";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { tasksQuery } from "@/features/tasks/queries";
import { permissions } from "@/lib/access";
import { authClient } from "@/lib/auth";
import { isForbidden, isUnauthorized } from "@/lib/query";
import { DashboardSkeleton } from "./dashboard-skeleton";

export function DashboardPage({ userId }: { userId: string }) {
  const { can } = usePermissions();
  const session = authClient.useSession();
  const pending = useQuery(tasksQuery(userId, "pending", 1));
  const completed = useQuery(tasksQuery(userId, "completed", 1));
  useEffect(() => {
    if (
      [pending.error, completed.error].some(
        (error) => isUnauthorized(error) || isForbidden(error)
      )
    ) {
      void session.refetch();
    }
  }, [pending.error, completed.error, session.refetch]);
  const loading = pending.isPending || completed.isPending;
  const error = pending.error ?? completed.error;
  const total = (pending.data?.total ?? 0) + (completed.data?.total ?? 0);
  const progress = total
    ? Math.round(((completed.data?.total ?? 0) / total) * 100)
    : 0;
  return (
    <PageContent>
      <PageHeader
        actions={
          <Link
            className={buttonVariants({ size: "sm" })}
            search={{ status: "all" }}
            to="/tasks"
          >
            Gerenciar tarefas
            <ArrowUpRightIcon className="size-4" />
          </Link>
        }
        description="Uma visão geral das tarefas da equipe."
        title="Dashboard"
      />
      {error ? (
        <ErrorNotice
          message="Não foi possível carregar o resumo."
          retry={() => {
            void pending.refetch();
            void completed.refetch();
          }}
        />
      ) : loading || !pending.data || !completed.data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                {
                  label: "Total de tarefas",
                  value: total,
                  icon: CheckSquareIcon,
                  status: "all",
                },
                {
                  label: "Pendentes",
                  value: pending.data.total,
                  icon: ClockIcon,
                  status: "pending",
                },
                {
                  label: "Concluídas",
                  value: completed.data.total,
                  icon: CheckCircleIcon,
                  status: "completed",
                },
              ] as const
            ).map(({ label, value, icon: Icon, status }) => (
              <Link
                className="group rounded-xl"
                key={status}
                search={{ status }}
                to="/tasks"
              >
                <Card className="h-full p-5 shadow-none transition-colors group-hover:bg-sidebar">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>{label}</span>
                    <Icon className="size-[18px]" weight="regular" />
                  </div>
                  <div className="mt-5 flex items-end justify-between">
                    <span className="font-semibold text-3xl tracking-tight">
                      {value}
                    </span>
                    <ArrowUpRightIcon className="size-4 text-muted-foreground group-hover:text-foreground" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          <div className="space-y-6">
            <section
              aria-labelledby="progress-heading"
              className="rounded-xl border bg-sidebar p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-sm" id="progress-heading">
                    Progresso da equipe
                  </h2>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {completed.data.total} de {total} tarefas concluídas
                  </p>
                </div>
                <span className="font-semibold text-2xl tracking-tight">
                  {progress}
                  <span className="text-muted-foreground text-sm">%</span>
                </span>
              </div>
              <progress
                aria-label="Percentual de tarefas concluídas"
                className="task-progress block h-1.5 w-full overflow-hidden rounded-full"
                max={100}
                value={progress}
              />
            </section>
            <section
              aria-labelledby="recent-tasks"
              className="overflow-hidden rounded-xl border"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div>
                  <h2 className="font-semibold text-sm" id="recent-tasks">
                    Pendentes recentes
                  </h2>
                  <p className="mt-1 text-muted-foreground text-xs">
                    As últimas tarefas registradas pela equipe.
                  </p>
                </div>
                <Link
                  className="font-medium text-xs hover:underline"
                  search={{ status: "pending" }}
                  to="/tasks"
                >
                  Ver todas →
                </Link>
              </div>
              {pending.data.items.length === 0 ? (
                <Empty>
                  <EmptyMedia>
                    <CheckSquareIcon aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {total === 0
                      ? can(permissions.tasks.create)
                        ? "Pronto para começar?"
                        : "Nenhuma tarefa pendente"
                      : "Tudo concluído por aqui."}
                  </EmptyTitle>
                  <EmptyDescription>
                    {total === 0 && can(permissions.tasks.create)
                      ? "Acesse Tarefas e registre o primeiro passo."
                      : "As próximas tarefas aparecerão neste espaço."}
                  </EmptyDescription>
                </Empty>
              ) : (
                <ul className="divide-y">
                  {pending.data.items.slice(0, 5).map((task) => (
                    <li
                      className="flex items-start gap-3 px-5 py-4"
                      key={task.id}
                    >
                      <CircleIcon
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        weight="regular"
                      />
                      <div className="min-w-0">
                        <p className="break-words font-medium text-sm">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="mt-1 truncate text-muted-foreground text-xs">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </PageContent>
  );
}
