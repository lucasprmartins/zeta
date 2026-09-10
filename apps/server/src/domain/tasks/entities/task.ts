export type TaskStatus = "pending" | "completed";
export type TaskData = Readonly<{
  id: string;
  ownerId: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}>;

export class InvalidTaskError extends Error {}

export class Task {
  private constructor(private readonly data: TaskData) {}

  static create(
    input: Pick<
      TaskData,
      "id" | "ownerId" | "title" | "description" | "createdAt"
    >
  ): Task {
    return Task.restore({
      ...input,
      status: "pending",
      updatedAt: input.createdAt,
      completedAt: null,
    });
  }

  static restore(data: TaskData): Task {
    const title = data.title.trim();
    const description = data.description.trim();
    if (!title || title.length > 120) {
      throw new InvalidTaskError("O título deve ter entre 1 e 120 caracteres.");
    }
    if (description.length > 2000) {
      throw new InvalidTaskError("A descrição deve ter até 2000 caracteres.");
    }
    if (!(data.id.trim() && data.ownerId.trim())) {
      throw new InvalidTaskError(
        "Tarefa e proprietário precisam de identificadores."
      );
    }
    if (
      ![data.createdAt, data.updatedAt].every((date) =>
        Number.isFinite(Date.parse(date))
      )
    ) {
      throw new InvalidTaskError("Data inválida.");
    }
    if (Date.parse(data.updatedAt) < Date.parse(data.createdAt)) {
      throw new InvalidTaskError("A atualização não pode anteceder a criação.");
    }
    if (data.status !== "pending" && data.status !== "completed") {
      throw new InvalidTaskError("Estado inválido.");
    }
    if (data.status === "pending" && data.completedAt !== null) {
      throw new InvalidTaskError(
        "Uma tarefa pendente não tem data de conclusão."
      );
    }
    if (
      data.status === "completed" &&
      (data.completedAt === null ||
        !Number.isFinite(Date.parse(data.completedAt)) ||
        Date.parse(data.completedAt) < Date.parse(data.createdAt) ||
        Date.parse(data.completedAt) > Date.parse(data.updatedAt))
    ) {
      throw new InvalidTaskError("Data de conclusão inválida.");
    }
    return new Task(Object.freeze({ ...data, title, description }));
  }

  edit(input: { title: string; description: string }, now: string): Task {
    return Task.restore({ ...this.data, ...input, updatedAt: now });
  }

  complete(now: string): Task {
    return this.data.status === "completed"
      ? this
      : Task.restore({
          ...this.data,
          status: "completed",
          completedAt: now,
          updatedAt: now,
        });
  }

  reopen(now: string): Task {
    return this.data.status === "pending"
      ? this
      : Task.restore({
          ...this.data,
          status: "pending",
          completedAt: null,
          updatedAt: now,
        });
  }

  toJSON(): TaskData {
    return { ...this.data };
  }
}
