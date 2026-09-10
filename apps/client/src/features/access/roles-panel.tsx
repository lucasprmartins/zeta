import {
  CrownSimpleIcon,
  PencilSimpleIcon,
  type Icon as PhosphorIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorNotice, Loading } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { rpc } from "@/lib/rpc";
import {
  type AccessRole,
  accessError,
  accessKeys,
  rolesQuery,
} from "./queries";
import { RoleForm } from "./role-form";

export function RolesPanel({ userId }: { userId: string }) {
  const client = useQueryClient();
  const query = useQuery(rolesQuery(userId));
  const [editor, setEditor] = useState<AccessRole | "new" | null>(null);
  const [deleting, setDeleting] = useState<AccessRole | null>(null);
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: accessKeys.all(userId) }),
      client.invalidateQueries({ queryKey: ["permissions"] }),
    ]);
  };
  const save = useMutation({
    mutationFn: (input: Parameters<typeof rpc.access.saveRole>[0]) =>
      rpc.access.saveRole(input),
    onSuccess: async () => {
      setEditor(null);
      toast.success("Papel salvo.");
      await refresh();
    },
    onError: (error) => toast.error(accessError(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => rpc.access.deleteRole({ id }),
    onSuccess: async () => {
      setDeleting(null);
      toast.success("Papel excluído.");
      await refresh();
    },
    onError: (error) => toast.error(accessError(error)),
  });
  return (
    <section aria-label="Papéis e permissões" className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-muted-foreground text-sm">
          Defina quais ações cada papel pode realizar.
        </p>
        <Button
          onClick={() => {
            save.reset();
            setEditor("new");
          }}
          size="sm"
        >
          <PlusIcon />
          Novo papel
        </Button>
      </div>
      {query.isError && (
        <ErrorNotice
          message="Não foi possível carregar os papéis."
          retry={() => void query.refetch()}
        />
      )}
      {query.isPending ? (
        <Loading />
      ) : (
        query.data && (
          <Card className="overflow-hidden">
            <ul className="divide-y">
              {query.data.roles.map((role) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-5"
                  key={role.id}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="size-3 shrink-0 rounded-full border border-foreground/15"
                      style={{ backgroundColor: role.color }}
                    />
                    <span className="min-w-0 break-words font-medium text-sm">
                      {role.name}
                    </span>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <div className="flex items-center">
                      {role.grants.includes("access:manage") && (
                        <RoleInfo
                          description="Papel de administrador."
                          icon={CrownSimpleIcon}
                          label="Papel de administrador"
                        />
                      )}
                      {role.protected && (
                        <RoleInfo
                          description={
                            role.grants.includes("access:manage")
                              ? "Papel do sistema: nome e cor podem ser editados, mas ele não pode ser excluído."
                              : "Papel do sistema: pode ter nome, cor e permissões editados, mas não pode ser excluído."
                          }
                          icon={ShieldCheckIcon}
                          label="Sobre este papel do sistema"
                        />
                      )}
                    </div>
                    {!role.protected && (
                      <Button
                        aria-label={`Excluir papel ${role.name}`}
                        onClick={() => {
                          remove.reset();
                          setDeleting(role);
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        Excluir
                      </Button>
                    )}
                    <Button
                      aria-label={`Editar papel ${role.name}`}
                      className="size-11 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        save.reset();
                        setEditor(role);
                      }}
                      size="icon"
                      title="Editar papel"
                      variant="outline"
                    >
                      <PencilSimpleIcon aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )
      )}
      {editor && (
        <Modal
          description="As alterações valem para todos os usuários deste papel."
          onClose={() => setEditor(null)}
          pending={save.isPending}
          title={editor === "new" ? "Novo papel" : "Editar papel"}
        >
          {save.error && (
            <div className="mb-4">
              <ErrorNotice message={accessError(save.error)} />
            </div>
          )}
          <RoleForm
            initial={editor === "new" ? null : editor}
            onCancel={() => setEditor(null)}
            onSave={(fields) =>
              save.mutate({
                ...fields,
                ...(editor === "new" ? {} : { id: editor.id }),
              })
            }
            pending={save.isPending}
          />
        </Modal>
      )}
      {deleting && (
        <Modal
          description={`O papel “${deleting.name}” só pode ser excluído se não estiver atribuído a nenhum usuário.`}
          onClose={() => setDeleting(null)}
          pending={remove.isPending}
          title="Excluir papel?"
          variant="confirmation"
        >
          {remove.error && (
            <div className="mb-4">
              <ErrorNotice message={accessError(remove.error)} />
            </div>
          )}
          <div className="modal-actions flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <Button
              data-modal-autofocus
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              disabled={remove.isPending}
              onClick={() => remove.mutate(deleting.id)}
            >
              {remove.isPending ? "Excluindo…" : "Excluir papel"}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function RoleInfo({
  icon: Icon,
  label,
  description,
}: {
  icon: PhosphorIcon;
  label: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip onOpenChange={setOpen} open={open}>
      <TooltipTrigger
        aria-label={label}
        className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={(event) => {
          event.preventDefault();
          setOpen(!open);
        }}
        type="button"
      >
        <Icon aria-hidden="true" className="size-[18px]" />
      </TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}
