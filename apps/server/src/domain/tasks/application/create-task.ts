import type { TaskRepository } from "../contracts/task-repository";
import type { UserDirectory } from "../contracts/user-directory";
import { Task } from "../entities/task";
import { assertKnownMentions } from "./mentions";
import { collectUsers, hydrate } from "./task-view";

export function createTask({
  tasks,
  users,
  generateId,
  now,
}: {
  tasks: TaskRepository;
  users: UserDirectory;
  generateId: () => string;
  now: () => string;
}) {
  return async (input: {
    authorId: string;
    title: string;
    description: string;
    mentions?: readonly string[];
  }) => {
    const task = Task.create({
      id: generateId(),
      authorId: input.authorId,
      title: input.title,
      description: input.description,
      mentions: input.mentions ?? [],
      createdAt: now(),
    });
    const data = task.toJSON();
    // Uma única leitura de contas atende à validação e à resposta.
    const known = await collectUsers([data], users);
    assertKnownMentions(data.mentions, known);
    await tasks.save(task);
    return hydrate(data, known);
  };
}
