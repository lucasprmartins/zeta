import type { TaskFilter, TaskRepository } from "@server/domain/tasks/contracts/task-repository";
import type { Task } from "@server/domain/tasks/entities/task";

export class InMemoryTaskRepository implements TaskRepository {
  readonly items: Task[] = [];
  async save(task: Task) { this.items.push(task); }
  async findById(id: string, ownerId: string) { return this.items.find((task) => task.toJSON().id === id && task.toJSON().ownerId === ownerId) ?? null; }
  async listByOwner({ ownerId, status, limit, offset }: TaskFilter) {
    const items = this.items.filter((task) => task.toJSON().ownerId === ownerId && (!status || task.toJSON().status === status))
      .sort((a, b) => b.toJSON().createdAt.localeCompare(a.toJSON().createdAt) || b.toJSON().id.localeCompare(a.toJSON().id));
    return { items: items.slice(offset, offset + limit), total: items.length };
  }
  async update(task: Task) {
    const data = task.toJSON();
    const index = this.items.findIndex((item) => item.toJSON().id === data.id && item.toJSON().ownerId === data.ownerId);
    if (index < 0) return false;
    this.items[index] = task;
    return true;
  }
  async delete(id: string, ownerId: string) {
    const index = this.items.findIndex((item) => item.toJSON().id === id && item.toJSON().ownerId === ownerId);
    if (index < 0) return false;
    this.items.splice(index, 1);
    return true;
  }
}
