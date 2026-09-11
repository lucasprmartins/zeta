export interface TaskCreated {
  actorId: string;
  assigneeIds: readonly string[];
  id: string;
  occurredAt: string;
  taskId: string;
  title: string;
  type: "task.created";
}
