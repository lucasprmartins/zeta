import type { TaskUser, UserDirectory } from "../contracts/user-directory";
import type { Task, TaskData } from "../entities/task";

// A tarefa guarda identificadores; quem lê recebe as contas já resolvidas.
export type TaskView = Omit<TaskData, "mentions"> & {
  author: TaskUser | null;
  mentions: TaskUser[];
};

async function collect(
  data: readonly TaskData[],
  directory: UserDirectory
): Promise<Map<string, TaskUser>> {
  const ids = new Set<string>();
  for (const task of data) {
    if (task.authorId) {
      ids.add(task.authorId);
    }
    for (const mention of task.mentions) {
      ids.add(mention);
    }
  }
  const users = ids.size === 0 ? [] : await directory.byIds([...ids]);
  return new Map(users.map((user) => [user.id, user]));
}

function hydrate(data: TaskData, users: Map<string, TaskUser>): TaskView {
  const { mentions, ...rest } = data;
  const mentioned: TaskUser[] = [];
  for (const id of mentions) {
    const user = users.get(id);
    if (user) {
      mentioned.push(user);
    }
  }
  return {
    ...rest,
    author: (data.authorId && users.get(data.authorId)) || null,
    mentions: mentioned,
  };
}

export async function toView(
  task: Task,
  directory: UserDirectory
): Promise<TaskView> {
  const data = task.toJSON();
  return hydrate(data, await collect([data], directory));
}

export async function toViews(
  tasks: readonly Task[],
  directory: UserDirectory
): Promise<TaskView[]> {
  const data = tasks.map((task) => task.toJSON());
  const users = await collect(data, directory);
  return data.map((task) => hydrate(task, users));
}
