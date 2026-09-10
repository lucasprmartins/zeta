import type {
  TaskFilter,
  TaskRepository,
} from "@server/domain/tasks/contracts/task-repository";
import type {
  TaskUser,
  UserDirectory,
} from "@server/domain/tasks/contracts/user-directory";
import type { Task } from "@server/domain/tasks/entities/task";

export class InMemoryTaskRepository implements TaskRepository {
  readonly items: Task[] = [];
  async save(task: Task) {
    this.items.push(task);
  }
  async findById(id: string) {
    return this.items.find((task) => task.toJSON().id === id) ?? null;
  }
  async list({ status, limit, offset }: TaskFilter) {
    const items = this.items
      .filter((task) => !status || task.toJSON().status === status)
      .sort(
        (a, b) =>
          b.toJSON().createdAt.localeCompare(a.toJSON().createdAt) ||
          b.toJSON().id.localeCompare(a.toJSON().id)
      );
    return { items: items.slice(offset, offset + limit), total: items.length };
  }
  async update(task: Task) {
    const data = task.toJSON();
    const index = this.items.findIndex((item) => item.toJSON().id === data.id);
    if (index < 0) {
      return false;
    }
    this.items[index] = task;
    return true;
  }
  async delete(id: string) {
    const index = this.items.findIndex((item) => item.toJSON().id === id);
    if (index < 0) {
      return false;
    }
    this.items.splice(index, 1);
    return true;
  }
}

export class InMemoryUserDirectory implements UserDirectory {
  constructor(private readonly users: readonly TaskUser[] = []) {}
  async byIds(ids: readonly string[]) {
    return this.users.filter((user) => ids.includes(user.id));
  }
  async search(term: string, limit: number) {
    const needle = term.toLowerCase();
    return this.users
      .filter(
        (user) =>
          !needle ||
          user.name.toLowerCase().includes(needle) ||
          (user.username ?? "").toLowerCase().includes(needle)
      )
      .slice(0, limit);
  }
}
