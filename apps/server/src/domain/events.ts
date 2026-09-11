import type { TaskCreated } from "./tasks/events";

// Acrescente à união os fatos publicados por novos módulos.
export type DomainEvent = TaskCreated;
export type EventSubscriber<Context> = (
  event: DomainEvent,
  context: Context
) => Promise<void>;

// Sem estado global ou fire-and-forget: falhas propagam para a transação.
export function eventPublisher<Context>(
  subscribers: readonly EventSubscriber<Context>[]
) {
  return async (events: readonly DomainEvent[], context: Context) => {
    for (const event of events) {
      for (const subscriber of subscribers) {
        await subscriber(event, context);
      }
    }
  };
}
