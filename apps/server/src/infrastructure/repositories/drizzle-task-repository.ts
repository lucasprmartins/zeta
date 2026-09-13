import type { DomainEvent } from "@server/domain/events";
import type {
  TaskFilter,
  TaskRepository,
  TaskSummaryRows,
} from "@server/domain/tasks/contracts/task-repository";
import { Task } from "@server/domain/tasks/entities/task";
import type {
  Database,
  Transaction,
} from "@server/infrastructure/database/client";
import { user } from "@server/infrastructure/database/schema/auth";
import {
  taskMentions,
  tasks,
} from "@server/infrastructure/database/schema/tasks";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  notExists,
  or,
  sql,
} from "drizzle-orm";

type Row = typeof tasks.$inferSelect;

function literalPattern(value: string) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

function values(task: Task) {
  const { mentions, ...data } = task.toJSON();
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    completedAt: data.completedAt ? new Date(data.completedAt) : null,
  };
}
function restore(row: Row, mentions: readonly string[]) {
  return Task.restore({
    ...row,
    mentions,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  });
}

export class DrizzleTaskRepository implements TaskRepository {
  constructor(
    private readonly db: Database,
    private readonly publish: (
      events: readonly DomainEvent[],
      tx: Transaction
    ) => Promise<void>
  ) {}

  private async mentionsOf(
    tx: Database | Transaction,
    ids: readonly string[]
  ): Promise<Map<string, string[]>> {
    const grouped = new Map<string, string[]>();
    if (ids.length === 0) {
      return grouped;
    }
    const rows = await tx
      .select()
      .from(taskMentions)
      .where(inArray(taskMentions.taskId, [...ids]))
      .orderBy(asc(taskMentions.userId));
    for (const row of rows) {
      const current = grouped.get(row.taskId);
      if (current) {
        current.push(row.userId);
      } else {
        grouped.set(row.taskId, [row.userId]);
      }
    }
    return grouped;
  }

  private async replaceMentions(
    tx: Database | Transaction,
    taskId: string,
    mentions: readonly string[]
  ): Promise<void> {
    const current = (await this.mentionsOf(tx, [taskId])).get(taskId) ?? [];
    const next = [...mentions].sort();
    // Editar título ou concluir a tarefa não mexe nos responsáveis.
    if (
      current.length === next.length &&
      current.every((userId, index) => userId === next[index])
    ) {
      return;
    }
    await tx.delete(taskMentions).where(eq(taskMentions.taskId, taskId));
    if (mentions.length > 0) {
      await tx
        .insert(taskMentions)
        .values(mentions.map((userId) => ({ taskId, userId })));
    }
  }

  async save(task: Task, events: readonly DomainEvent[] = []): Promise<void> {
    const { mentions } = task.toJSON();
    await this.db.transaction(async (tx) => {
      await tx.insert(tasks).values(values(task));
      if (mentions.length > 0) {
        await tx
          .insert(taskMentions)
          .values(
            mentions.map((userId) => ({ taskId: task.toJSON().id, userId }))
          );
      }
      await this.publish(events, tx);
    });
  }

  async findById(id: string): Promise<Task | null> {
    const [row] = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    if (!row) {
      return null;
    }
    const mentions = await this.mentionsOf(this.db, [row.id]);
    return restore(row, mentions.get(row.id) ?? []);
  }

  async assigneeOptions(search: string, selected: string[]) {
    const assigned = exists(
      this.db
        .select({ id: taskMentions.taskId })
        .from(taskMentions)
        .where(eq(taskMentions.userId, user.id))
    );
    const fields = {
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
    };
    const matching = await this.db
      .select(fields)
      .from(user)
      .where(
        and(
          assigned,
          or(
            ilike(user.name, literalPattern(search)),
            ilike(user.username, literalPattern(search))
          )
        )
      )
      .orderBy(asc(user.name), asc(user.id))
      .limit(20);
    const chosen = selected.length
      ? await this.db
          .select(fields)
          .from(user)
          .where(and(assigned, inArray(user.id, selected)))
          .orderBy(asc(user.name), asc(user.id))
      : [];
    return [
      ...new Map(
        [...chosen, ...matching].map((person) => [person.id, person])
      ).values(),
    ];
  }

  async list({
    status,
    search,
    assignees,
    unassigned,
    limit,
    offset,
  }: TaskFilter) {
    const assignedToTask = this.db
      .select({ id: taskMentions.taskId })
      .from(taskMentions)
      .where(eq(taskMentions.taskId, tasks.id));
    const selected = assignees?.length
      ? exists(
          this.db
            .select({ id: taskMentions.taskId })
            .from(taskMentions)
            .where(
              and(
                eq(taskMentions.taskId, tasks.id),
                inArray(taskMentions.userId, assignees)
              )
            )
        )
      : undefined;
    const where = and(
      status ? eq(tasks.status, status) : undefined,
      search ? ilike(tasks.title, literalPattern(search)) : undefined,
      or(selected, unassigned ? notExists(assignedToTask) : undefined)
    );
    // A mesma fotografia do banco mantém total, página e menções consistentes.
    return this.db.transaction(
      async (tx) => {
        const [total] = await tx
          .select({ value: count() })
          .from(tasks)
          .where(where);
        const rows = await tx
          .select()
          .from(tasks)
          .where(where)
          .orderBy(desc(tasks.createdAt), desc(tasks.id))
          .limit(limit)
          .offset(offset);
        const mentions = await this.mentionsOf(
          tx,
          rows.map((row) => row.id)
        );
        return {
          items: rows.map((row) => restore(row, mentions.get(row.id) ?? [])),
          total: total?.value ?? 0,
        };
      },
      { isolationLevel: "repeatable read", accessMode: "read only" }
    );
  }

  async update(task: Task): Promise<boolean> {
    const { mentions } = task.toJSON();
    const { id, authorId, createdAt, ...changes } = values(task);
    return this.db.transaction(async (tx) => {
      const result = await tx
        .update(tasks)
        .set(changes)
        .where(eq(tasks.id, id))
        .returning({ id: tasks.id });
      if (result.length === 0) {
        return false;
      }
      await this.replaceMentions(tx, id, mentions);
      return true;
    });
  }

  async summary(limit: number): Promise<TaskSummaryRows> {
    // Uma transação só: as três contagens descrevem a mesma fotografia do banco.
    return this.db.transaction(
      async (tx) => {
        const [totals] = await tx.execute(sql`select
            count(*) filter (where ${tasks.status} = 'pending')::int as pending,
            count(*) filter (where ${tasks.status} = 'completed')::int as completed
          from ${tasks}`);
        const [unassigned] = await tx.execute(sql`select
            count(*) filter (where ${tasks.status} = 'pending')::int as pending,
            count(*) filter (where ${tasks.status} = 'completed')::int as completed
          from ${tasks}
          where not exists (
            select 1 from ${taskMentions} where ${taskMentions.taskId} = ${tasks.id}
          )`);
        // Uma tarefa com vários responsáveis conta uma vez para cada um.
        const assignees = await tx.execute(sql`select
            ${taskMentions.userId} as user_id,
            count(*) filter (where ${tasks.status} = 'pending')::int as pending,
            count(*) filter (where ${tasks.status} = 'completed')::int as completed
          from ${taskMentions}
          join ${tasks} on ${tasks.id} = ${taskMentions.taskId}
          group by ${taskMentions.userId}
          order by count(*) desc, ${taskMentions.userId} asc
          limit ${limit}`);
        const counts = (row?: Record<string, unknown>) => ({
          pending: Number(row?.pending ?? 0),
          completed: Number(row?.completed ?? 0),
        });
        return {
          totals: counts(totals),
          unassigned: counts(unassigned),
          assignees: assignees.map((row) => ({
            userId: String(row.user_id),
            ...counts(row),
          })),
        };
      },
      { isolationLevel: "repeatable read", accessMode: "read only" }
    );
  }

  async delete(id: string): Promise<boolean> {
    // As menções saem junto pela chave estrangeira em cascata.
    const result = await this.db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id });
    return result.length > 0;
  }
}
