import {
  ArrowUpRightIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  ClockIcon,
  TrendUpIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorNotice } from "@/components/feedback";
import { PageContent } from "@/components/layout/page-content";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { type TaskSummary, taskSummaryQuery } from "@/features/tasks/queries";
import { authClient } from "@/lib/auth";
import { shortName } from "@/lib/names";
import { isForbidden, isUnauthorized } from "@/lib/query";
import { DashboardSkeleton } from "./dashboard-skeleton";

// Duas séries, ordem categórica fixa; a cor nunca muda com o ranking.
const statusConfig = {
  completed: { label: "Concluídas", color: "var(--chart-1)" },
  pending: { label: "Pendentes", color: "var(--chart-2)" },
} satisfies ChartConfig;

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  status,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof CheckSquareIcon;
  status?: "all" | "pending" | "completed";
}) {
  const body = (
    <Card className="h-full p-5 shadow-none transition-colors group-hover:bg-sidebar">
      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span>{label}</span>
        <Icon className="size-[18px]" weight="regular" />
      </div>
      <div className="mt-5 flex items-end justify-between gap-2">
        <span className="font-semibold text-3xl tabular-nums tracking-tight">
          {value}
        </span>
        {status ? (
          <ArrowUpRightIcon className="size-4 text-muted-foreground group-hover:text-foreground" />
        ) : (
          <span className="truncate text-muted-foreground text-xs">{hint}</span>
        )}
      </div>
    </Card>
  );
  return status ? (
    <Link className="group rounded-xl" search={{ status }} to="/tasks">
      {body}
    </Link>
  ) : (
    <div className="group">{body}</div>
  );
}

// Um número-herói: o anel dá a leitura imediata, o texto dá o valor exato.
function ProgressChart({ summary }: { summary: TaskSummary }) {
  const progress = summary.total
    ? Math.round((summary.completed / summary.total) * 100)
    : 0;
  return (
    <Card className="flex flex-col p-5 shadow-none">
      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span id="progress-heading">Progresso da equipe</span>
        <TrendUpIcon className="size-[18px]" weight="regular" />
      </div>
      <div className="flex flex-1 flex-col justify-center py-4">
        <div className="relative mx-auto w-full max-w-52">
          <ChartContainer
            aria-hidden="true"
            className="aspect-square"
            config={statusConfig}
          >
            <RadialBarChart
              barSize={14}
              cx="50%"
              cy="50%"
              data={[{ name: "completed", value: progress }]}
              endAngle={-270}
              innerRadius="76%"
              outerRadius="98%"
              startAngle={90}
            >
              <PolarAngleAxis
                angleAxisId={0}
                domain={[0, 100]}
                tick={false}
                type="number"
              />
              <RadialBar
                angleAxisId={0}
                background={{ fill: "var(--muted)" }}
                cornerRadius={7}
                dataKey="value"
                fill="var(--color-completed)"
                isAnimationActive={false}
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-semibold text-4xl tabular-nums tracking-tight">
              {progress}
              <span className="text-lg text-muted-foreground">%</span>
            </span>
            <span className="text-muted-foreground text-xs">concluído</span>
          </div>
        </div>
        <p className="mt-4 text-center text-muted-foreground text-xs">
          {summary.completed} de {summary.total}{" "}
          {summary.total === 1 ? "tarefa concluída" : "tarefas concluídas"}
        </p>
      </div>
    </Card>
  );
}

function AssigneeChart({ summary }: { summary: TaskSummary }) {
  const data = summary.assignees.map((row) => ({
    id: row.user.id,
    name: shortName(row.user.name),
    completed: row.completed,
    pending: row.pending,
  }));
  const unassignedTotal =
    summary.unassigned.pending + summary.unassigned.completed;
  if (unassignedTotal > 0) {
    data.push({
      id: "__none__",
      name: "Sem resp.",
      completed: summary.unassigned.completed,
      pending: summary.unassigned.pending,
    });
  }
  const height = Math.max(180, data.length * 40 + 40);
  return (
    <Card className="p-5 shadow-none lg:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium text-sm" id="assignees-heading">
            Carga por responsável
          </h2>
          <p className="mt-1 text-muted-foreground text-xs">
            Quem responde por mais tarefas, dividido por status.
          </p>
        </div>
        <UsersIcon
          className="size-[18px] shrink-0 text-muted-foreground"
          weight="regular"
        />
      </div>
      {data.length === 0 ? (
        <Empty className="min-h-48">
          <EmptyMedia>
            <UsersIcon aria-hidden="true" weight="regular" />
          </EmptyMedia>
          <EmptyTitle>Nenhum responsável indicado</EmptyTitle>
          <EmptyDescription>
            Indique quem responde por cada tarefa para acompanhar a
            distribuição.
          </EmptyDescription>
        </Empty>
      ) : (
        <>
          <ChartContainer
            className="mt-4"
            config={statusConfig}
            style={{ height }}
          >
            <BarChart
              accessibilityLayer
              barSize={18}
              data={data}
              layout="vertical"
              margin={{ left: 4, right: 12 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                type="number"
              />
              <YAxis
                axisLine={false}
                dataKey="name"
                tickLine={false}
                tickMargin={8}
                type="category"
                width={84}
              />
              <ChartTooltip
                content={<ChartTooltipContent config={statusConfig} />}
                cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
              />
              {/* 2 px de superfície entre os segmentos empilhados. */}
              <Bar
                dataKey="completed"
                fill="var(--color-completed)"
                isAnimationActive={false}
                stackId="status"
              >
                {data.map((row) => (
                  <Cell key={row.id} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Bar>
              <Bar
                dataKey="pending"
                fill="var(--color-pending)"
                isAnimationActive={false}
                radius={[0, 4, 4, 0]}
                stackId="status"
              >
                {data.map((row) => (
                  <Cell key={row.id} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <div className="mt-4 flex items-center justify-between gap-4 border-t pt-4">
            <ChartLegend config={statusConfig} />
            <ul className="flex shrink-0 -space-x-1.5">
              {summary.assignees.slice(0, 5).map((row) => (
                <li key={row.user.id}>
                  <Avatar
                    className="ring-2 ring-card"
                    image={row.user.image}
                    name={row.user.name}
                    size="sm"
                  />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Card>
  );
}

export function DashboardPage({ userId }: { userId: string }) {
  const session = authClient.useSession();
  const summary = useQuery(taskSummaryQuery(userId));
  useEffect(() => {
    if (isUnauthorized(summary.error) || isForbidden(summary.error)) {
      void session.refetch();
    }
  }, [summary.error, session.refetch]);
  const data = summary.data;
  const progress = data?.total
    ? Math.round((data.completed / data.total) * 100)
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
      {summary.isError ? (
        <ErrorNotice
          message="Não foi possível carregar o resumo."
          retry={() => void summary.refetch()}
        />
      ) : summary.isPending || !data ? (
        <DashboardSkeleton />
      ) : data.total === 0 ? (
        <Empty className="min-h-96 rounded-xl border">
          <EmptyMedia>
            <CheckSquareIcon aria-hidden="true" weight="regular" />
          </EmptyMedia>
          <EmptyTitle>Ainda não há tarefas</EmptyTitle>
          <EmptyDescription>
            Assim que a equipe registrar as primeiras tarefas, o progresso e a
            distribuição por responsável aparecem aqui.
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={CheckSquareIcon}
              label="Total de tarefas"
              status="all"
              value={data.total}
            />
            <StatCard
              icon={ClockIcon}
              label="Pendentes"
              status="pending"
              value={data.pending}
            />
            <StatCard
              icon={CheckCircleIcon}
              label="Concluídas"
              status="completed"
              value={data.completed}
            />
            <StatCard
              hint="do total"
              icon={TrendUpIcon}
              label="Conclusão"
              value={`${progress}%`}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ProgressChart summary={data} />
            <AssigneeChart summary={data} />
          </div>
        </div>
      )}
    </PageContent>
  );
}
