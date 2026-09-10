export type TaskStatus = "pending" | "completed";
export const MAX_MENTIONS = 20;
export type TaskData = Readonly<{
  id: string;
  // Autoria, não escopo de acesso: fica nulo quando a conta que criou é removida.
  authorId: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  // Contas indicadas para saber que estão relacionadas à tarefa.
  mentions: readonly string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}>;

export class InvalidTaskError extends Error {}

function normalizeMentions(mentions: readonly string[]): readonly string[] {
  const unique = new Set<string>();
  for (const mention of mentions) {
    const id = typeof mention === "string" ? mention.trim() : "";
    if (!id) {
      throw new InvalidTaskError("Menção sem identificador de conta.");
    }
    unique.add(id);
  }
  if (unique.size > MAX_MENTIONS) {
    throw new InvalidTaskError(
      `Uma tarefa menciona no máximo ${MAX_MENTIONS} contas.`
    );
  }
  return Object.freeze([...unique]);
}

export class Task {
  private constructor(private readonly data: TaskData) {}

  static create(
    input: Pick<TaskData, "id" | "title" | "description" | "createdAt"> & {
      authorId: string;
      mentions?: readonly string[];
    }
  ): Task {
    return Task.restore({
      ...input,
      mentions: input.mentions ?? [],
      status: "pending",
      updatedAt: input.createdAt,
      completedAt: null,
    });
  }

  static restore(data: TaskData): Task {
    const title = data.title.trim();
    const description = data.description.trim();
    const mentions = normalizeMentions(data.mentions);
    if (!title || title.length > 120) {
      throw new InvalidTaskError("O título deve ter entre 1 e 120 caracteres.");
    }
    if (description.length > 2000) {
      throw new InvalidTaskError("A descrição deve ter até 2000 caracteres.");
    }
    if (!data.id.trim()) {
      throw new InvalidTaskError("A tarefa precisa de um identificador.");
    }
    if (data.authorId !== null && !data.authorId.trim()) {
      throw new InvalidTaskError("Autor inválido.");
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
    return new Task(Object.freeze({ ...data, title, description, mentions }));
  }

  edit(
    input: { title: string; description: string; mentions?: readonly string[] },
    now: string
  ): Task {
    return Task.restore({
      ...this.data,
      title: input.title,
      description: input.description,
      mentions: input.mentions ?? this.data.mentions,
      updatedAt: now,
    });
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
    return { ...this.data, mentions: [...this.data.mentions] };
  }
}
