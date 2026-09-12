import {
  ArrowRightIcon,
  CheckSquareIcon,
  TrayIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import type { Notification } from "./queries";

interface NotificationPresentation {
  action: ReactNode;
  icon: typeof TrayIcon;
  message: ReactNode;
  source: string;
}

// A integração de cada tipo fica aqui; a caixa cuida apenas da entrega e leitura.
export function notificationPresentation(
  item: Notification
): NotificationPresentation {
  switch (item.kind) {
    case "task.assigned":
      return {
        icon: CheckSquareIcon,
        source: "Tarefas",
        message: (
          <>
            <span className="font-medium">
              {item.actorName ?? "Uma conta removida"}
            </span>{" "}
            indicou você como responsável.
          </>
        ),
        action:
          item.referenceType === "task" ? (
            <Link
              aria-label={`Abrir tarefa: ${item.title}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              search={{
                status: "all",
                task: item.referenceId,
                inbox: undefined,
              }}
              to="/tasks"
            >
              Abrir tarefa
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          ) : null,
      };
    default:
      return {
        icon: TrayIcon,
        source: "Notificações",
        message: "Há uma nova atualização para você.",
        action: null,
      };
  }
}
