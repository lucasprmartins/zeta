import type { TaskRepository } from "../contracts/task-repository";
import type { UserDirectory } from "../contracts/user-directory";
import { Task } from "../entities/task";
import { assertKnownMentions } from "./mentions";
import { toView } from "./task-view";

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
    await assertKnownMentions(task.toJSON().mentions, users);
    await tasks.save(task);
    return toView(task, users);
  };
}
