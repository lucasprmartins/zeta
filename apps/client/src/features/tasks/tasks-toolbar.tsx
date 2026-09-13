import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ListFacet,
  ListFilterBar,
  type ListFilterCondition,
  ListFilterPanel,
  ListSearch,
} from "@/components/list-filters";
import {
  useRefreshSessionOnAuthError,
  useUserId,
} from "@/components/permission-boundary";
import { Button } from "@/components/ui/button";
import { rpc } from "@/lib/rpc";
import { type TaskUser, taskKeys } from "./queries";
import type { TaskCriteria } from "./task-filters";
import { statusLabels } from "./task-status";

const statusOptions = [
  { value: "all", label: "Qualquer status" },
  { value: "pending", label: "Pendentes" },
  { value: "completed", label: "Concluídas" },
];
const UNASSIGNED = "__unassigned__";

export function TasksToolbar({
  criteria,
  onChange,
  total,
  refreshing,
  onRefresh,
}: {
  criteria: TaskCriteria;
  onChange: (criteria: TaskCriteria) => void;
  total: number | undefined;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const userId = useUserId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  useEffect(() => {
    const timeout = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);
  const options = useQuery({
    queryKey: [...taskKeys.all(userId), "assignees", term, criteria.assignees],
    enabled: open || criteria.assignees.length > 0,
    queryFn: ({ signal }) =>
      rpc.tasks.assignees(
        { search: term, selected: criteria.assignees },
        { signal }
      ),
    staleTime: 30_000,
  });
  useRefreshSessionOnAuthError([options.error]);
  const people = options.data?.items ?? [];
  const selected = [
    ...criteria.assignees,
    ...(criteria.unassigned ? [UNASSIGNED] : []),
  ];

  const statusActive = criteria.status !== "all";
  const peopleActive = selected.length > 0;
  const showStatus = statusActive || added.includes("status");
  const showPeople = peopleActive || added.includes("assignees");
  const conditions: ListFilterCondition[] = [];
  if (showStatus) {
    conditions.push({
      id: "status",
      label: "Status",
      operator: "é",
      onRemove: () => {
        setAdded((values) => values.filter((id) => id !== "status"));
        onChange({ ...criteria, status: "all" });
      },
      control: (
        <ListFacet
          label="Status"
          mode="single"
          onChange={(values) =>
            onChange({
              ...criteria,
              status:
                values.length === 1 &&
                (values[0] === "pending" || values[0] === "completed")
                  ? values[0]
                  : "all",
            })
          }
          options={statusOptions}
          searchable={false}
          selected={[criteria.status]}
          summary={
            statusActive
              ? statusLabels[criteria.status as "pending" | "completed"]
              : "Qualquer status"
          }
        />
      ),
    });
  }
  if (showPeople) {
    conditions.push({
      id: "assignees",
      label: "Responsável",
      operator: "é",
      onRemove: () => {
        setAdded((values) => values.filter((id) => id !== "assignees"));
        onChange({ ...criteria, assignees: [], unassigned: false });
      },
      control: (
        <ListFacet
          error={options.isError}
          label="Responsáveis"
          loading={options.isFetching || search.trim() !== term}
          maxSelected={21}
          onChange={(values) =>
            onChange({
              ...criteria,
              assignees: values
                .filter((value) => value !== UNASSIGNED)
                .sort()
                .slice(0, 20),
              unassigned: values.includes(UNASSIGNED),
            })
          }
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) {
              setSearch("");
              setTerm("");
            }
          }}
          onRetry={() => void options.refetch()}
          onSearchChange={setSearch}
          options={[
            { value: UNASSIGNED, label: "Sem responsável" },
            ...people.map((person) => ({
              value: person.id,
              disabled:
                criteria.assignees.length >= 20 &&
                !criteria.assignees.includes(person.id),
              label: person.username
                ? `${person.name} (@${person.username})`
                : person.name,
            })),
          ]}
          selected={selected}
          summary={assigneeSummary(selected, criteria.unassigned, people)}
        />
      ),
    });
  }
  return (
    <ListFilterBar
      actions={
        <span className="ml-1 border-l pl-1">
          <Button
            aria-label="Atualizar lista de tarefas"
            className="size-11 text-muted-foreground"
            disabled={refreshing}
            onClick={onRefresh}
            size="icon"
            title="Atualizar lista de tarefas"
            variant="ghost"
          >
            <ArrowClockwiseIcon
              aria-hidden
              className={refreshing ? "animate-spin" : ""}
            />
          </Button>
        </span>
      }
      summary={<TaskListSummary total={total} />}
    >
      <ListFilterPanel
        available={[
          ...(showStatus ? [] : [{ id: "status", label: "Status" }]),
          ...(showPeople ? [] : [{ id: "assignees", label: "Responsável" }]),
        ]}
        conditions={conditions}
        count={Number(statusActive) + Number(peopleActive)}
        onAdd={(id) => setAdded((values) => [...values, id])}
        onClear={() => {
          setAdded([]);
          onChange({
            ...criteria,
            status: "all",
            assignees: [],
            unassigned: false,
          });
        }}
      />
      <ListSearch
        label="Buscar pelo título…"
        onChange={(q) => onChange({ ...criteria, q })}
        value={criteria.q}
      />
    </ListFilterBar>
  );
}

import { ArrowClockwiseIcon, TableIcon } from "@phosphor-icons/react";

function assigneeSummary(
  selected: string[],
  unassigned: boolean,
  people: TaskUser[]
) {
  if (selected.length === 0) {
    return "Selecionar…";
  }
  if (selected.length > 1) {
    const names = selected
      .slice(0, 2)
      .map((id) =>
        id === UNASSIGNED
          ? "Sem responsável"
          : (people.find((person) => person.id === id)?.name ??
            "Responsável selecionado")
      );
    return `${names.join(", ")}${selected.length > 2 ? ` +${selected.length - 2}` : ""}`;
  }
  if (unassigned) {
    return "Sem responsável";
  }
  return (
    people.find((person) => person.id === selected[0])?.name ??
    "Responsável selecionado"
  );
}
function TaskListSummary({ total }: { total: number | undefined }) {
  return (
    <div className="flex min-h-11 shrink-0 items-center gap-2.5 px-1">
      <TableIcon aria-hidden className="size-4 text-muted-foreground" />
      <span className="font-medium text-sm">Lista de tarefas</span>
      <output
        aria-label={
          total === undefined
            ? "Carregando contagem"
            : `${total} tarefas nesta visualização`
        }
        aria-live="polite"
        className="rounded-md bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs tabular-nums"
      >
        {total ?? "—"}
      </output>
    </div>
  );
}
