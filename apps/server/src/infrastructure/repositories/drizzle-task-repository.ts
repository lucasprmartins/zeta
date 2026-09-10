import type {
  TaskFilter,
  TaskRepository,
} from "@server/domain/tasks/contracts/task-repository";
import { Task } from "@server/domain/tasks/entities/task";
import type { Database } from "@server/infrastructure/database/client";
import { tasks } from "@server/infrastructure/database/schema/tasks";
import { and, count, desc, eq } from "drizzle-orm";

function values(task: Task) {
  const data = task.toJSON();
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    completedAt: data.completedAt ? new Date(data.completedAt) : null,
  };
}
function restore(row: typeof tasks.$inferSelect) {
  return Task.restore({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  });
}

export class DrizzleTaskRepository implements TaskRepository {
  constructor(private readonly db: Database) {}
  async save(task: Task): Promise<void> {
    await this.db.insert(tasks).values(values(task));
  }
  async findById(id: string, ownerId: string): Promise<Task | null> {
    const [row] = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.ownerId, ownerId)))
      .limit(1);
    return row ? restore(row) : null;
  }
  async listByOwner({ ownerId, status, limit, offset }: TaskFilter) {
    const where = and(
      eq(tasks.ownerId, ownerId),
      status ? eq(tasks.status, status) : undefined
    );
    // A mesma fotografia do banco mantém total e página consistentes.
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
        return { items: rows.map(restore), total: total?.value ?? 0 };
      },
      { isolationLevel: "repeatable read", accessMode: "read only" }
    );
  }
  async update(task: Task): Promise<boolean> {
    const { id, ownerId, createdAt, ...changes } = values(task);
    const result = await this.db
      .update(tasks)
      .set(changes)
      .where(and(eq(tasks.id, id), eq(tasks.ownerId, ownerId)))
      .returning({ id: tasks.id });
    return result.length > 0;
  }
  async delete(id: string, ownerId: string): Promise<boolean> {
    const result = await this.db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.ownerId, ownerId)))
      .returning({ id: tasks.id });
    return result.length > 0;
  }
}
