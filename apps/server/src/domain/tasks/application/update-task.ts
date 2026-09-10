import type { TaskRepository } from "../contracts/task-repository";
import type { UserDirectory } from "../contracts/user-directory";
import { assertKnownMentions } from "./mentions";
import { TaskNotFoundError } from "./task-not-found";
import { toView } from "./task-view";

export function updateTask(
  tasks: TaskRepository,
  users: UserDirectory,
  now: () => string
) {
  return async (input: {
    id: string;
    title: string;
    description: string;
    mentions?: readonly string[];
  }) => {
    const task = await tasks.findById(input.id);
    if (!task) {
      throw new TaskNotFoundError();
    }
    const updated = task.edit(
      {
        title: input.title,
        description: input.description,
        ...(input.mentions === undefined ? {} : { mentions: input.mentions }),
      },
      now()
    );
    await assertKnownMentions(updated.toJSON().mentions, users);
    if (!(await tasks.update(updated))) {
      throw new TaskNotFoundError();
    }
    return toView(updated, users);
  };
}
